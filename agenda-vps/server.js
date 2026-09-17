/**
 * Agenda de Glam — servidor para VPS.
 *
 * Un solo proceso de Node: sirve la interfaz, la API y las fotos.
 * Datos en SQLite (data/agenda.db), fotos en disco (data/fotos/).
 * Pensado para ir detrás de nginx, que pone el HTTPS.
 */
"use strict";

const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");
const express = require("express");
const multer = require("multer");
const Database = require("better-sqlite3");

const PUERTO = Number(process.env.PORT) || 3000;
const RAIZ = __dirname;
const DIR_DATOS = process.env.AGENDA_DATA || path.join(RAIZ, "data");
const DIR_FOTOS = path.join(DIR_DATOS, "fotos");
const COOKIE = "ag_sesion";
const DIAS_SESION = 60;
const PBKDF2_ITER = 120000;
const MAX_FOTO = 8 * 1024 * 1024;

fs.mkdirSync(DIR_FOTOS, { recursive: true });

/* ---------------- base de datos ---------------- */

const db = new Database(path.join(DIR_DATOS, "agenda.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id TEXT PRIMARY KEY,
    usuario TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    rol TEXT NOT NULL DEFAULT 'maquilladora',
    creado TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sesiones (
    token TEXT PRIMARY KEY,
    usuario_id TEXT NOT NULL,
    expira TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS citas (
    id TEXT PRIMARY KEY,
    usuario_id TEXT NOT NULL,
    cliente TEXT NOT NULL,
    tel TEXT,
    personas INTEGER NOT NULL DEFAULT 1,
    fecha TEXT NOT NULL,
    hora TEXT NOT NULL,
    duracion INTEGER NOT NULL DEFAULT 60,
    servicio TEXT,
    ocasion TEXT,
    estado TEXT NOT NULL DEFAULT 'agendada',
    modalidad TEXT,
    zona TEXT,
    direccion TEXT,
    valor REAL NOT NULL DEFAULT 0,
    abono REAL NOT NULL DEFAULT 0,
    medio TEXT,
    fecha_abono TEXT,
    notas TEXT,
    fotos TEXT NOT NULL DEFAULT '[]',
    creado TEXT NOT NULL,
    actualizado TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_citas_usuario ON citas (usuario_id, fecha);
`);

// Limpieza de sesiones vencidas al arrancar.
db.prepare(`DELETE FROM sesiones WHERE expira < ?`).run(new Date().toISOString());

/* ---------------- utilidades ---------------- */

const ahora = () => new Date().toISOString();
const id = (n = 16) => crypto.randomBytes(n).toString("base64url");

function hashClave(clave, salt) {
  return crypto.pbkdf2Sync(clave, salt, PBKDF2_ITER, 32, "sha256").toString("base64");
}

function igual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

const texto = (v, max = 500) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const plata = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
};
const entero = (v, def, min, max) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= min && n <= max ? n : def;
};
const fechaISO = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(texto(v, 10)) ? texto(v, 10) : "");
const horaISO = (v) => (/^\d{2}:\d{2}$/.test(texto(v, 5)) ? texto(v, 5) : "");
const ESTADOS = ["agendada", "confirmada", "completada", "cancelada"];

function fallo(res, estado, code, message) {
  return res.status(estado).json({ ok: false, code, message });
}

/* ---------------- sesiones ---------------- */

function leerCookie(req, nombre) {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const parte of header.split(";")) {
    const [k, ...resto] = parte.trim().split("=");
    if (k === nombre) return decodeURIComponent(resto.join("="));
  }
  return null;
}

function ponerCookie(res, token, segundos) {
  // Secure se omite fuera de producción para poder probar por http en local.
  const partes = [
    `${COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${segundos}`,
  ];
  if (process.env.NODE_ENV !== "development") partes.push("Secure");
  res.setHeader("Set-Cookie", partes.join("; "));
}

function crearSesion(usuarioId) {
  const token = id(32);
  db.prepare(`INSERT INTO sesiones (token, usuario_id, expira) VALUES (?, ?, ?)`).run(
    token,
    usuarioId,
    new Date(Date.now() + DIAS_SESION * 86400000).toISOString(),
  );
  return token;
}

function usuarioActual(req) {
  const token = leerCookie(req, COOKIE);
  if (!token) return null;
  const fila = db
    .prepare(
      `SELECT u.id, u.usuario, u.nombre, u.rol, s.expira
         FROM sesiones s JOIN usuarios u ON u.id = s.usuario_id
        WHERE s.token = ?`,
    )
    .get(token);
  if (!fila) return null;
  if (new Date(fila.expira).getTime() < Date.now()) {
    db.prepare(`DELETE FROM sesiones WHERE token = ?`).run(token);
    return null;
  }
  return { id: fila.id, usuario: fila.usuario, nombre: fila.nombre, rol: fila.rol };
}

function conSesion(req, res, next) {
  const usuario = usuarioActual(req);
  if (!usuario) return fallo(res, 401, "no_session", "Tu sesión se cerró. Entra otra vez.");
  req.usuario = usuario;
  next();
}

function soloAdmin(req, res, next) {
  if (req.usuario.rol !== "admin") {
    return fallo(res, 403, "solo_admin", "Solo la dueña puede administrar las cuentas.");
  }
  next();
}

/* ---------------- app ---------------- */

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "DENY");
  // Agenda de trabajo con datos de clientas: fuera de los buscadores.
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  next();
});

const subida = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FOTO, files: 8 },
});

/* ---------------- API: sesión ---------------- */

app.get("/api/session", (req, res) => {
  const usuario = usuarioActual(req);
  const total = db.prepare(`SELECT COUNT(*) AS n FROM usuarios`).get().n;
  res.json({ ok: true, usuario, sinCuentas: total === 0 });
});

app.post("/api/session", (req, res) => {
  const usuario = texto(req.body?.usuario, 40).toLowerCase();
  const clave = typeof req.body?.clave === "string" ? req.body.clave : "";

  if (usuario.length < 3) {
    return fallo(res, 400, "usuario_corto", "El usuario necesita al menos 3 letras.");
  }
  if (clave.length < 8) {
    return fallo(res, 400, "clave_corta", "La contraseña necesita al menos 8 caracteres.");
  }

  if (req.body?.accion === "registrar-primera") {
    const total = db.prepare(`SELECT COUNT(*) AS n FROM usuarios`).get().n;
    if (total > 0) {
      return fallo(res, 409, "ya_existe", "Esta agenda ya tiene dueña. Entra con tu usuario.");
    }
    const nombre = texto(req.body?.nombre, 60) || usuario;
    const nuevo = id();
    const salt = id();
    db.prepare(
      `INSERT INTO usuarios (id, usuario, nombre, hash, salt, rol, creado)
       VALUES (?, ?, ?, ?, ?, 'admin', ?)`,
    ).run(nuevo, usuario, nombre, hashClave(clave, salt), salt, ahora());
    ponerCookie(res, crearSesion(nuevo), DIAS_SESION * 86400);
    return res.json({ ok: true, usuario: { id: nuevo, usuario, nombre, rol: "admin" } });
  }

  const fila = db
    .prepare(`SELECT id, usuario, nombre, hash, salt, rol FROM usuarios WHERE usuario = ?`)
    .get(usuario);
  // Se calcula el hash aunque el usuario no exista, para no delatar cuáles existen.
  const intento = hashClave(clave, fila ? fila.salt : "sal-invalida");
  if (!fila || !igual(intento, fila.hash)) {
    return fallo(res, 401, "credenciales", "Usuario o contraseña incorrectos.");
  }

  ponerCookie(res, crearSesion(fila.id), DIAS_SESION * 86400);
  res.json({
    ok: true,
    usuario: { id: fila.id, usuario: fila.usuario, nombre: fila.nombre, rol: fila.rol },
  });
});

app.delete("/api/session", (req, res) => {
  const token = leerCookie(req, COOKIE);
  if (token) db.prepare(`DELETE FROM sesiones WHERE token = ?`).run(token);
  ponerCookie(res, "", 0);
  res.json({ ok: true });
});

/* ---------------- API: citas ---------------- */

function forma(fila) {
  let fotos = [];
  try {
    const parsed = JSON.parse(fila.fotos);
    if (Array.isArray(parsed)) fotos = parsed.filter((x) => typeof x === "string");
  } catch {
    fotos = [];
  }
  return {
    id: fila.id,
    cliente: fila.cliente,
    tel: fila.tel || "",
    personas: fila.personas,
    fecha: fila.fecha,
    hora: fila.hora,
    duracion: fila.duracion,
    servicio: fila.servicio || "",
    ocasion: fila.ocasion || "",
    estado: fila.estado,
    modalidad: fila.modalidad || "",
    zona: fila.zona || "",
    direccion: fila.direccion || "",
    valor: fila.valor,
    abono: fila.abono,
    medio: fila.medio || "",
    fechaAbono: fila.fecha_abono || "",
    notas: fila.notas || "",
    fotos,
  };
}

app.get("/api/citas", conSesion, (req, res) => {
  const filas = db
    .prepare(`SELECT * FROM citas WHERE usuario_id = ? ORDER BY fecha ASC, hora ASC`)
    .all(req.usuario.id);
  res.json({ ok: true, citas: filas.map(forma) });
});

app.post("/api/citas", conSesion, (req, res) => {
  const body = req.body || {};
  const accion = texto(body.accion, 20) || "guardar";
  const citaId = texto(body.id, 60);
  const t = ahora();

  if (accion === "eliminar") {
    if (!citaId) return fallo(res, 400, "sin_id", "No sé cuál cita borrar.");
    const fila = db
      .prepare(`SELECT fotos FROM citas WHERE id = ? AND usuario_id = ?`)
      .get(citaId, req.usuario.id);
    if (!fila) return fallo(res, 404, "no_existe", "Esa cita ya no está.");
    try {
      for (const foto of JSON.parse(fila.fotos)) {
        fs.rmSync(path.join(DIR_FOTOS, `${path.basename(foto)}.jpg`), { force: true });
      }
    } catch (error) {
      console.error("No se pudieron borrar las fotos:", error.message);
    }
    db.prepare(`DELETE FROM citas WHERE id = ? AND usuario_id = ?`).run(citaId, req.usuario.id);
    return res.json({ ok: true });
  }

  if (accion === "pagar-saldo") {
    if (!citaId) return fallo(res, 400, "sin_id", "No sé de cuál cita es el pago.");
    const fila = db
      .prepare(`SELECT valor FROM citas WHERE id = ? AND usuario_id = ?`)
      .get(citaId, req.usuario.id);
    if (!fila) return fallo(res, 404, "no_existe", "Esa cita ya no está.");
    db.prepare(
      `UPDATE citas SET abono = ?, fecha_abono = ?, actualizado = ?
        WHERE id = ? AND usuario_id = ?`,
    ).run(fila.valor, t.slice(0, 10), t, citaId, req.usuario.id);
    return res.json({ ok: true });
  }

  const cliente = texto(body.cliente, 80);
  const fecha = fechaISO(body.fecha);
  const hora = horaISO(body.hora);
  if (!cliente) return fallo(res, 400, "sin_cliente", "Falta el nombre de la clienta.");
  if (!fecha) return fallo(res, 400, "sin_fecha", "Falta la fecha de la cita.");
  if (!hora) return fallo(res, 400, "sin_hora", "Falta la hora de la cita.");

  const valor = plata(body.valor);
  const abono = plata(body.abono);
  if (abono > valor) {
    return fallo(res, 400, "abono_alto", "El abono no puede ser mayor que el valor del servicio.");
  }

  const estado = ESTADOS.includes(texto(body.estado, 20)) ? texto(body.estado, 20) : "agendada";
  const fotos = Array.isArray(body.fotos)
    ? body.fotos.filter((x) => typeof x === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(x)).slice(0, 8)
    : [];

  const campos = [
    cliente,
    texto(body.tel, 30),
    entero(body.personas, 1, 1, 30),
    fecha,
    hora,
    entero(body.duracion, 60, 15, 600),
    texto(body.servicio, 60),
    texto(body.ocasion, 40),
    estado,
    texto(body.modalidad, 40),
    texto(body.zona, 80),
    texto(body.direccion, 200),
    valor,
    abono,
    texto(body.medio, 30),
    fechaISO(body.fechaAbono),
    texto(body.notas, 2000),
    JSON.stringify(fotos),
    t,
  ];

  if (citaId) {
    const r = db
      .prepare(
        `UPDATE citas SET cliente=?, tel=?, personas=?, fecha=?, hora=?, duracion=?, servicio=?,
                ocasion=?, estado=?, modalidad=?, zona=?, direccion=?, valor=?, abono=?, medio=?,
                fecha_abono=?, notas=?, fotos=?, actualizado=?
          WHERE id=? AND usuario_id=?`,
      )
      .run(...campos, citaId, req.usuario.id);
    if (!r.changes) return fallo(res, 404, "no_existe", "Esa cita ya no está.");
    return res.json({ ok: true, id: citaId });
  }

  const nuevo = id();
  db.prepare(
    `INSERT INTO citas (id, usuario_id, cliente, tel, personas, fecha, hora, duracion, servicio,
            ocasion, estado, modalidad, zona, direccion, valor, abono, medio, fecha_abono, notas,
            fotos, actualizado, creado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(nuevo, req.usuario.id, ...campos, t);
  res.json({ ok: true, id: nuevo });
});

/* ---------------- API: fotos ---------------- */

const ID_FOTO = /^[A-Za-z0-9_-]{8,64}$/;

app.post("/api/fotos", conSesion, subida.single("file"), (req, res) => {
  if (!req.file) return fallo(res, 400, "sin_archivo", "No llegó ninguna foto.");
  if (!/^image\/(jpeg|png|webp|gif)$/.test(req.file.mimetype)) {
    return fallo(res, 400, "tipo_malo", "Solo se pueden subir imágenes (JPG, PNG o WEBP).");
  }
  const nuevo = id();
  fs.writeFileSync(path.join(DIR_FOTOS, `${nuevo}.jpg`), req.file.buffer);
  res.json({ ok: true, id: nuevo });
});

app.get("/api/fotos", conSesion, (req, res) => {
  const foto = String(req.query.id || "");
  if (!ID_FOTO.test(foto)) return fallo(res, 400, "id_malo", "Foto no válida.");
  const archivo = path.join(DIR_FOTOS, `${foto}.jpg`);
  if (!fs.existsSync(archivo)) return fallo(res, 404, "no_existe", "Esa foto ya no está.");
  res.setHeader("Cache-Control", "private, max-age=86400");
  res.type("image/jpeg").sendFile(archivo);
});

app.delete("/api/fotos", conSesion, (req, res) => {
  const foto = String(req.query.id || "");
  if (!ID_FOTO.test(foto)) return fallo(res, 400, "id_malo", "Foto no válida.");
  fs.rmSync(path.join(DIR_FOTOS, `${foto}.jpg`), { force: true });
  res.json({ ok: true });
});

/* ---------------- API: cuentas ---------------- */

app.get("/api/usuarios", conSesion, soloAdmin, (req, res) => {
  const usuarios = db
    .prepare(`SELECT id, usuario, nombre, rol, creado FROM usuarios ORDER BY creado ASC`)
    .all();
  res.json({ ok: true, usuarios });
});

app.post("/api/usuarios", conSesion, soloAdmin, (req, res) => {
  const usuario = texto(req.body?.usuario, 40).toLowerCase();
  const clave = typeof req.body?.clave === "string" ? req.body.clave : "";
  const nombre = texto(req.body?.nombre, 60) || usuario;

  if (!/^[a-z0-9._-]{3,40}$/.test(usuario)) {
    return fallo(res, 400, "usuario_malo", "El usuario va en minúsculas, sin espacios ni tildes.");
  }
  if (clave.length < 8) {
    return fallo(res, 400, "clave_corta", "La contraseña necesita al menos 8 caracteres.");
  }
  if (db.prepare(`SELECT id FROM usuarios WHERE usuario = ?`).get(usuario)) {
    return fallo(res, 409, "repetido", "Ese usuario ya está tomado.");
  }

  const salt = id();
  db.prepare(
    `INSERT INTO usuarios (id, usuario, nombre, hash, salt, rol, creado)
     VALUES (?, ?, ?, ?, ?, 'maquilladora', ?)`,
  ).run(id(), usuario, nombre, hashClave(clave, salt), salt, ahora());
  res.json({ ok: true });
});

app.delete("/api/usuarios", conSesion, soloAdmin, (req, res) => {
  const objetivo = String(req.query.id || "");
  if (!objetivo) return fallo(res, 400, "sin_id", "No sé cuál cuenta quitar.");
  if (objetivo === req.usuario.id) {
    return fallo(res, 400, "tu_misma", "No puedes quitar tu propia cuenta.");
  }
  db.prepare(`DELETE FROM sesiones WHERE usuario_id = ?`).run(objetivo);
  db.prepare(`DELETE FROM usuarios WHERE id = ?`).run(objetivo);
  res.json({ ok: true });
});

/* ---------------- interfaz ---------------- */

app.get("/robots.txt", (_req, res) => {
  res.type("text/plain").send("User-agent: *\nDisallow: /\n");
});

app.use(express.static(path.join(RAIZ, "public"), { index: "index.html", maxAge: "1h" }));

app.use((req, res) => {
  if (req.path.startsWith("/api/")) return fallo(res, 404, "no_existe", "Esa ruta no existe.");
  res.sendFile(path.join(RAIZ, "public", "index.html"));
});

app.use((error, _req, res, _next) => {
  console.error(error);
  if (error && error.code === "LIMIT_FILE_SIZE") {
    return fallo(res, 400, "muy_grande", "Esa foto pesa demasiado, incluso comprimida.");
  }
  fallo(res, 500, "server_error", "Algo falló en el servidor. Intenta otra vez.");
});

app.listen(PUERTO, "127.0.0.1", () => {
  console.log(`Agenda de Glam escuchando en http://127.0.0.1:${PUERTO}`);
  console.log(`Datos en ${DIR_DATOS}`);
});
