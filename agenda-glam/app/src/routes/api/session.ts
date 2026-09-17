import { createFileRoute } from "@tanstack/react-router";

import {
  COOKIE,
  countUsers,
  createSession,
  currentUser,
  ensureSchema,
  fail,
  hashPassword,
  json,
  randomToken,
  readCookie,
  sameSecret,
  sessionCookie,
  text,
  db,
} from "../../lib/agenda.server";

type Body = {
  accion?: string;
  usuario?: string;
  clave?: string;
  nombre?: string;
};

export const Route = createFileRoute("/api/session")({
  server: {
    handlers: {
      // Quién está adentro — y si la agenda todavía no tiene dueña.
      GET: async ({ request }) => {
        try {
          await ensureSchema();
          const usuario = await currentUser(request);
          const total = await countUsers();
          return json({ ok: true, usuario, sinCuentas: total === 0 });
        } catch (error) {
          console.error(error);
          return fail("server_error", "No se pudo leer la sesión.", 500);
        }
      },

      // accion: "entrar" | "registrar-primera"
      POST: async ({ request }) => {
        try {
          await ensureSchema();
          const body = (await request.json().catch(() => ({}))) as Body;
          const usuario = text(body.usuario, 40).toLowerCase();
          const clave = typeof body.clave === "string" ? body.clave : "";

          if (usuario.length < 3) {
            return fail("usuario_corto", "El usuario necesita al menos 3 letras.");
          }
          if (clave.length < 8) {
            return fail("clave_corta", "La contraseña necesita al menos 8 caracteres.");
          }

          if (body.accion === "registrar-primera") {
            if ((await countUsers()) > 0) {
              return fail("ya_existe", "Esta agenda ya tiene dueña. Entra con tu usuario.", 409);
            }
            const id = randomToken(16);
            const salt = randomToken(16);
            const hash = await hashPassword(clave, salt);
            await db()
              .prepare(
                `INSERT INTO usuarios (id, usuario, nombre, hash, salt, rol, creado)
                 VALUES (?, ?, ?, ?, ?, 'admin', ?)`,
              )
              .bind(id, usuario, text(body.nombre, 60) || usuario, hash, salt, new Date().toISOString())
              .run();
            const token = await createSession(id);
            return json(
              { ok: true, usuario: { id, usuario, nombre: text(body.nombre, 60) || usuario, rol: "admin" } },
              { headers: { "set-cookie": sessionCookie(token, 60 * 86400) } },
            );
          }

          const row = await db()
            .prepare(`SELECT id, usuario, nombre, hash, salt, rol FROM usuarios WHERE usuario = ?`)
            .bind(usuario)
            .first<{
              id: string;
              usuario: string;
              nombre: string;
              hash: string;
              salt: string;
              rol: string;
            }>();

          // Se calcula el hash incluso sin usuario, para no delatar cuáles existen.
          const intento = await hashPassword(clave, row?.salt ?? "sal-invalida");
          if (!row || !sameSecret(intento, row.hash)) {
            return fail("credenciales", "Usuario o contraseña incorrectos.", 401);
          }

          const token = await createSession(row.id);
          return json(
            { ok: true, usuario: { id: row.id, usuario: row.usuario, nombre: row.nombre, rol: row.rol } },
            { headers: { "set-cookie": sessionCookie(token, 60 * 86400) } },
          );
        } catch (error) {
          console.error(error);
          return fail("server_error", "No se pudo entrar. Intenta otra vez.", 500);
        }
      },

      DELETE: async ({ request }) => {
        try {
          await ensureSchema();
          const token = readCookie(request, COOKIE);
          if (token) {
            await db().prepare(`DELETE FROM sesiones WHERE token = ?`).bind(token).run();
          }
          return json({ ok: true }, { headers: { "set-cookie": sessionCookie("", 0) } });
        } catch (error) {
          console.error(error);
          return fail("server_error", "No se pudo cerrar la sesión.", 500);
        }
      },
    },
  },
});
