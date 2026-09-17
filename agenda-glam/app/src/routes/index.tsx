import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AGENDA_CSS } from "../agenda-styles";

export const Route = createFileRoute("/")({ component: Index });

/* ---------------- tipos ---------------- */

type Cita = {
  id: string;
  cliente: string;
  tel: string;
  personas: number;
  fecha: string;
  hora: string;
  duracion: number;
  servicio: string;
  ocasion: string;
  estado: string;
  modalidad: string;
  zona: string;
  direccion: string;
  valor: number;
  abono: number;
  medio: string;
  fechaAbono: string;
  notas: string;
  fotos: string[];
};

type Usuario = { id: string; usuario: string; nombre: string; rol: string };
type Cuenta = Usuario & { creado?: string };

const CITA_VACIA: Cita = {
  id: "",
  cliente: "",
  tel: "",
  personas: 1,
  fecha: "",
  hora: "",
  duracion: 60,
  servicio: "Solo maquillaje",
  ocasion: "Social",
  estado: "agendada",
  modalidad: "A domicilio",
  zona: "",
  direccion: "",
  valor: 0,
  abono: 0,
  medio: "Nequi",
  fechaAbono: "",
  notas: "",
  fotos: [],
};

const SERVICIOS = [
  "Solo maquillaje",
  "Maquillaje y peinado",
  "Solo peinado",
  "Maquillaje novia",
  "Maquillaje + peinado novia",
  "Prueba de novia",
  "Otro",
];
const OCASIONES = ["Social", "Matrimonio", "Grado", "Quince", "Sesión de fotos", "Otra"];
const MODALIDADES = ["A domicilio", "En mi estudio", "Salón / hotel"];
const MEDIOS = ["Nequi", "Daviplata", "Bancolombia", "Efectivo", "Otro"];
const DURACIONES = [
  { v: 45, t: "45 min" },
  { v: 60, t: "1 hora" },
  { v: 90, t: "1 h 30 min" },
  { v: 120, t: "2 horas" },
  { v: 180, t: "3 horas" },
  { v: 240, t: "4 horas" },
];
const ESTADOS: Record<string, { label: string; cls: string }> = {
  agendada: { label: "Agendada", cls: "state" },
  confirmada: { label: "Confirmada", cls: "ok" },
  completada: { label: "Completada", cls: "place" },
  cancelada: { label: "Cancelada", cls: "danger" },
};

/* ---------------- utilidades ---------------- */

const COP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});
const money = (n: number) => COP.format(Math.round(Number(n) || 0));
const saldoDe = (c: Cita) => Math.max(0, (Number(c.valor) || 0) - (Number(c.abono) || 0));

function hoyISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseISO(iso: string): Date | null {
  const [y, m, d] = String(iso || "").split("-").map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
}

function diasHasta(iso: string): number {
  const a = parseISO(iso);
  const b = parseISO(hoyISO());
  if (!a || !b) return 9999;
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

function fmtDia(iso: string): string {
  const d = parseISO(iso);
  if (!d) return "Sin fecha";
  const s = d.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function relDia(iso: string): string {
  const n = diasHasta(iso);
  if (n === 0) return "Hoy";
  if (n === 1) return "Mañana";
  if (n === -1) return "Ayer";
  if (n > 1 && n <= 7) return `En ${n} días`;
  return "";
}

function fmtHora(h: string): string {
  if (!h) return "--:--";
  const [H, M] = h.split(":").map(Number);
  const suf = H >= 12 ? "p.m." : "a.m.";
  const h12 = H % 12 === 0 ? 12 : H % 12;
  return `${h12}:${String(M || 0).padStart(2, "0")} ${suf}`;
}

function masMinutos(h: string, mins: number): string {
  if (!h) return "";
  const [H, M] = h.split(":").map(Number);
  const t = H * 60 + M + (Number(mins) || 0);
  const hh = Math.floor((((t % 1440) + 1440) % 1440) / 60);
  const mm = ((t % 60) + 60) % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function linkWhatsapp(tel: string, msg: string): string | null {
  let d = String(tel || "").replace(/\D/g, "");
  if (!d) return null;
  if (d.length === 10) d = `57${d}`;
  return `https://wa.me/${d}?text=${encodeURIComponent(msg)}`;
}

async function pedir<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  const data = (await res.json().catch(() => ({}))) as T & { ok?: boolean; message?: string };
  if (!res.ok || data.ok === false) {
    throw new Error(data.message || "Algo falló. Intenta otra vez.");
  }
  return data;
}

function enviarJSON(body: unknown, method = "POST"): RequestInit {
  return { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}

// Comprime en el navegador: una foto de referencia del celular pesa varios MB.
function comprimir(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const max = 1600;
      const escala = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * escala);
      const h = Math.round(img.height * escala);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("sin-canvas"));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("sin-blob"))),
        "image/jpeg",
        0.82,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("sin-imagen"));
    };
    img.src = url;
  });
}

/* ---------------- página ---------------- */

function Index() {
  const [cargando, setCargando] = useState(true);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [sinCuentas, setSinCuentas] = useState(false);
  const [aviso, setAviso] = useState("");

  const toast = useCallback((mensaje: string) => setAviso(mensaje), []);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(""), 3400);
    return () => clearTimeout(t);
  }, [aviso]);

  useEffect(() => {
    pedir<{ usuario: Usuario | null; sinCuentas: boolean }>("/api/session")
      .then((data) => {
        setUsuario(data.usuario);
        setSinCuentas(data.sinCuentas);
      })
      .catch(() => setUsuario(null))
      .finally(() => setCargando(false));
  }, []);

  return (
    <div className="ag-root">
      <style dangerouslySetInnerHTML={{ __html: AGENDA_CSS }} />
      {cargando ? (
        <div className="ag-gate">
          <p style={{ color: "var(--ink-faint)" }}>Abriendo tu agenda…</p>
        </div>
      ) : usuario ? (
        <Agenda usuario={usuario} onSalir={() => setUsuario(null)} toast={toast} />
      ) : (
        <Entrada
          sinCuentas={sinCuentas}
          onEntrar={(u) => {
            setUsuario(u);
            setSinCuentas(false);
          }}
        />
      )}
      {aviso ? (
        <div className="ag-toast" role="status">
          {aviso}
        </div>
      ) : null}
    </div>
  );
}

/* ---------------- entrada ---------------- */

function Entrada({
  sinCuentas,
  onEntrar,
}: {
  sinCuentas: boolean;
  onEntrar: (u: Usuario) => void;
}) {
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setEnviando(true);
    try {
      const data = await pedir<{ usuario: Usuario }>(
        "/api/session",
        enviarJSON({
          accion: sinCuentas ? "registrar-primera" : "entrar",
          usuario,
          clave,
          nombre,
        }),
      );
      onEntrar(data.usuario);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo entrar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="ag-gate">
      <div className="ag-gatebox">
        <h1>
          Agenda de Glam<span style={{ color: "var(--accent)" }}>.</span>
        </h1>
        <p>
          {sinCuentas
            ? "Esta agenda todavía no tiene dueña. Crea tu cuenta: quien la cree queda como administradora."
            : "Entra con tu usuario y contraseña."}
        </p>
        <form className="ag-gateform" onSubmit={enviar}>
          {sinCuentas ? (
            <label className="ag-f">
              Tu nombre
              <input
                id="gate-nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Marcela"
                autoComplete="name"
              />
            </label>
          ) : null}
          <label className="ag-f">
            Usuario
            <input
              id="gate-usuario"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="marcela"
              autoComplete="username"
              required
            />
          </label>
          <label className="ag-f">
            Contraseña
            <input
              id="gate-clave"
              type="password"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              autoComplete={sinCuentas ? "new-password" : "current-password"}
              required
            />
            {sinCuentas ? <span className="ag-hint">Mínimo 8 caracteres.</span> : null}
          </label>
          {error ? <div className="ag-err">{error}</div> : null}
          <button className="ag-btn primary" type="submit" disabled={enviando}>
            {enviando ? "Un momento…" : sinCuentas ? "Crear mi cuenta" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ---------------- agenda ---------------- */

function Agenda({
  usuario,
  onSalir,
  toast,
}: {
  usuario: Usuario;
  onSalir: () => void;
  toast: (m: string) => void;
}) {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [filtro, setFiltro] = useState("proximas");
  const [busqueda, setBusqueda] = useState("");
  const [editando, setEditando] = useState<Cita | null>(null);
  const [zoom, setZoom] = useState<string | null>(null);
  const [verCuentas, setVerCuentas] = useState(false);
  const [error, setError] = useState("");

  const recargar = useCallback(async () => {
    try {
      const data = await pedir<{ citas: Cita[] }>("/api/citas");
      setCitas(data.citas);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo leer la agenda.");
    }
  }, []);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  const stats = useMemo(() => {
    const vivas = citas.filter((c) => c.estado !== "cancelada");
    const proximas = vivas.filter((c) => diasHasta(c.fecha) >= 0 && c.estado !== "completada");
    const porCobrar = vivas
      .filter((c) => diasHasta(c.fecha) >= -30)
      .reduce((s, c) => s + saldoDe(c), 0);
    const mes = hoyISO().slice(0, 7);
    const abonado = vivas
      .filter((c) => (c.fechaAbono || c.fecha).slice(0, 7) === mes)
      .reduce((s, c) => s + (Number(c.abono) || 0), 0);
    return { proximas: proximas.length, porCobrar, abonado };
  }, [citas]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return citas
      .filter((c) => {
        if (q) {
          const heno = `${c.cliente} ${c.servicio} ${c.zona} ${c.direccion} ${c.notas}`.toLowerCase();
          if (!heno.includes(q)) return false;
        }
        const n = diasHasta(c.fecha);
        if (filtro === "hoy") return n === 0 && c.estado !== "cancelada";
        if (filtro === "proximas")
          return n >= 0 && c.estado !== "completada" && c.estado !== "cancelada";
        if (filtro === "saldo") return saldoDe(c) > 0 && c.estado !== "cancelada";
        if (filtro === "historial")
          return n < 0 || c.estado === "completada" || c.estado === "cancelada";
        return true;
      })
      .sort((a, b) => {
        const k = filtro === "historial" ? -1 : 1;
        return k * `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`);
      });
  }, [citas, filtro, busqueda]);

  const grupos = useMemo(() => {
    const mapa = new Map<string, Cita[]>();
    for (const c of visibles) {
      const lista = mapa.get(c.fecha) ?? [];
      lista.push(c);
      mapa.set(c.fecha, lista);
    }
    return [...mapa.entries()];
  }, [visibles]);

  async function accion(body: Record<string, unknown>, mensaje: string) {
    try {
      await pedir("/api/citas", enviarJSON(body));
      await recargar();
      toast(mensaje);
    } catch (err) {
      toast(err instanceof Error ? err.message : "No se pudo guardar.");
    }
  }

  async function salir() {
    await fetch("/api/session", { method: "DELETE", credentials: "same-origin" }).catch(() => null);
    onSalir();
  }

  const hoyTexto = new Date().toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="ag-wrap">
      <header className="ag-top">
        <div className="ag-brandrow">
          <h1 className="ag-brand">
            Agenda de Glam<span>.</span>
          </h1>
          <div className="ag-who">
            <span>{usuario.nombre}</span>
            {usuario.rol === "admin" ? (
              <button className="ag-btn" type="button" onClick={() => setVerCuentas(true)}>
                Cuentas
              </button>
            ) : null}
            <button className="ag-btn ghost" type="button" onClick={salir}>
              Salir
            </button>
          </div>
        </div>
        <div className="ag-stats">
          <div className="ag-stat">
            <b>Próximas citas</b>
            <i>{stats.proximas}</i>
          </div>
          <div className="ag-stat due">
            <b>Por cobrar</b>
            <i>{money(stats.porCobrar)}</i>
          </div>
          <div className="ag-stat paid">
            <b>Abonado este mes</b>
            <i>{money(stats.abonado)}</i>
          </div>
        </div>
        <div className="ag-toolbar">
          <div className="ag-tabs" role="tablist">
            {[
              ["proximas", "Próximas"],
              ["hoy", "Hoy"],
              ["saldo", "Con saldo"],
              ["historial", "Historial"],
              ["todas", "Todas"],
            ].map(([valor, texto]) => (
              <button
                key={valor}
                className="ag-tab"
                role="tab"
                type="button"
                aria-selected={filtro === valor}
                onClick={() => setFiltro(valor)}
              >
                {texto}
              </button>
            ))}
          </div>
          <input
            id="ag-busqueda"
            className="ag-search"
            type="search"
            placeholder="Buscar clienta…"
            aria-label="Buscar clienta"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <div style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 8 }}>{hoyTexto}</div>
      </header>

      {error ? <div className="ag-banner bad">{error}</div> : null}

      <main>
        {grupos.length === 0 ? (
          <div className="ag-empty">
            <h3>{citas.length === 0 ? "Tu agenda está en blanco" : "Nada por aquí"}</h3>
            <p>
              {citas.length === 0
                ? "Toca “Nueva cita” y agrega la primera."
                : "No hay citas que coincidan con este filtro."}
            </p>
          </div>
        ) : (
          grupos.map(([fecha, items]) => {
            const rel = relDia(fecha);
            const totalDia = items.reduce(
              (s, c) => s + (c.estado === "cancelada" ? 0 : Number(c.valor) || 0),
              0,
            );
            return (
              <section className="ag-daygroup" key={fecha}>
                <div className="ag-dayhead">
                  <span className="d">{fmtDia(fecha)}</span>
                  {rel ? <span className="rel">{rel}</span> : null}
                  <span className="cnt">
                    {items.length} cita{items.length > 1 ? "s" : ""} · {money(totalDia)}
                  </span>
                </div>
                <div className="ag-cards">
                  {items.map((c) => (
                    <Tarjeta
                      key={c.id}
                      cita={c}
                      onEditar={() => setEditando(c)}
                      onZoom={setZoom}
                      onCobrar={() =>
                        accion({ accion: "pagar-saldo", id: c.id }, "Saldo registrado.")
                      }
                      toast={toast}
                    />
                  ))}
                </div>
              </section>
            );
          })
        )}
      </main>

      <footer className="ag-foot">
        Las fotos y los datos de tus clientas viven en el servidor de esta agenda, detrás de tu
        contraseña. Los montos están en pesos colombianos.
      </footer>

      <button className="ag-fab" type="button" onClick={() => setEditando({ ...CITA_VACIA, fecha: hoyISO() })}>
        + Nueva cita
      </button>

      {editando ? (
        <Formulario
          cita={editando}
          onCerrar={() => setEditando(null)}
          onGuardado={async (mensaje) => {
            setEditando(null);
            await recargar();
            toast(mensaje);
          }}
          toast={toast}
        />
      ) : null}

      {verCuentas ? <Cuentas yo={usuario} onCerrar={() => setVerCuentas(false)} toast={toast} /> : null}

      {zoom ? (
        <div className="ag-lightbox" role="dialog" onClick={() => setZoom(null)}>
          <img src={`/api/fotos?id=${zoom}`} alt="Foto de referencia ampliada" />
        </div>
      ) : null}
    </div>
  );
}

/* ---------------- tarjeta ---------------- */

function Tarjeta({
  cita,
  onEditar,
  onZoom,
  onCobrar,
  toast,
}: {
  cita: Cita;
  onEditar: () => void;
  onZoom: (id: string) => void;
  onCobrar: () => void;
  toast: (m: string) => void;
}) {
  const saldo = saldoDe(cita);
  const total = Number(cita.valor) || 0;
  const pagada = total > 0 && saldo === 0;
  const sinAbono = (Number(cita.abono) || 0) === 0 && total > 0;
  const estado = ESTADOS[cita.estado] ?? ESTADOS.agendada;
  const lugar = [cita.modalidad, cita.zona].filter(Boolean).join(" · ");
  const clase = [
    "ag-card",
    cita.estado === "cancelada" ? "off" : pagada ? "" : sinAbono ? "unpaid" : "owes",
  ]
    .filter(Boolean)
    .join(" ");

  function escribir() {
    const msg =
      `Hola ${cita.cliente}! Te confirmo tu cita de ${(cita.servicio || "maquillaje").toLowerCase()} ` +
      `el ${fmtDia(cita.fecha).toLowerCase()} a las ${fmtHora(cita.hora)}` +
      `${cita.direccion ? ` en ${cita.direccion}` : ""}. ` +
      (saldo > 0
        ? `Queda un saldo de ${money(saldo)} sobre un total de ${money(total)}.`
        : "Ya está todo pago.") +
      " Cualquier cosa me avisas 💄";
    const link = linkWhatsapp(cita.tel, msg);
    if (link) window.open(link, "_blank", "noopener");
    else toast("Esta clienta no tiene número guardado.");
  }

  return (
    <article className={clase}>
      <div className="ag-cardtop">
        <div className="ag-hour">
          {fmtHora(cita.hora)}
          <small>hasta {fmtHora(masMinutos(cita.hora, cita.duracion))}</small>
        </div>
        <div className="ag-whoblock">
          <div className="ag-name">{cita.cliente}</div>
          <div className="ag-svc">
            {cita.servicio}
            {cita.personas > 1 ? ` · ${cita.personas} personas` : ""}
            {cita.ocasion ? ` · ${cita.ocasion}` : ""}
          </div>
          <div className="ag-chips">
            <span className={`ag-chip ${estado.cls}`}>{estado.label}</span>
            {lugar ? <span className="ag-chip place">{lugar}</span> : null}
            {pagada ? (
              <span className="ag-chip ok">Pagada</span>
            ) : (
              <span className={`ag-chip ${sinAbono ? "danger" : "warn"}`}>
                Cobrar {money(saldo)}
              </span>
            )}
          </div>
        </div>
      </div>

      {cita.direccion ? <div className="ag-note">📍 {cita.direccion}</div> : null}

      <div className="ag-money">
        <div>
          <b>Servicio</b>
          <i>{money(total)}</i>
        </div>
        <div>
          <b>Abonado</b>
          <i>
            {money(cita.abono)} {cita.medio ? <small>{cita.medio}</small> : null}
          </i>
        </div>
        <div className="owe">
          <b>{saldo > 0 ? "Cobrar el día de la cita" : "Saldo"}</b>
          <i className={`big ${saldo > 0 ? "due" : "clear"}`}>{money(saldo)}</i>
        </div>
      </div>

      {cita.fotos.length ? (
        <div className="ag-thumbs">
          {cita.fotos.map((id) => (
            <img
              key={id}
              className="ag-thumb"
              src={`/api/fotos?id=${id}`}
              alt={`Referencia de ${cita.cliente}`}
              loading="lazy"
              onClick={() => onZoom(id)}
            />
          ))}
        </div>
      ) : null}

      {cita.notas ? <div className="ag-note">{cita.notas}</div> : null}

      <div className="ag-actions">
        <button className="ag-btn" type="button" onClick={onEditar}>
          Editar
        </button>
        {cita.tel ? (
          <button className="ag-btn" type="button" onClick={escribir}>
            Escribir por WhatsApp
          </button>
        ) : null}
        {saldo > 0 && cita.estado !== "cancelada" ? (
          <button className="ag-btn" type="button" onClick={onCobrar}>
            Registrar pago del saldo
          </button>
        ) : null}
      </div>
    </article>
  );
}

/* ---------------- formulario ---------------- */

function Formulario({
  cita,
  onCerrar,
  onGuardado,
  toast,
}: {
  cita: Cita;
  onCerrar: () => void;
  onGuardado: (mensaje: string) => void;
  toast: (m: string) => void;
}) {
  const [draft, setDraft] = useState<Cita>({ ...cita });
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(0);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);
  const subidasNuevas = useRef<Set<string>>(new Set());

  const set = <K extends keyof Cita>(campo: K, valor: Cita[K]) =>
    setDraft((prev) => ({ ...prev, [campo]: valor }));

  const total = Number(draft.valor) || 0;
  const saldo = total - (Number(draft.abono) || 0);

  async function subir(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (draft.fotos.length + subiendo >= 8) {
        toast("Máximo 8 fotos por cita.");
        break;
      }
      setSubiendo((n) => n + 1);
      try {
        const blob = await comprimir(file).catch(() => file as Blob);
        const form = new FormData();
        form.append("file", new File([blob], "referencia.jpg", { type: "image/jpeg" }));
        const data = await pedir<{ id: string }>("/api/fotos", { method: "POST", body: form });
        subidasNuevas.current.add(data.id);
        setDraft((prev) => ({ ...prev, fotos: [...prev.fotos, data.id] }));
      } catch (err) {
        toast(err instanceof Error ? err.message : "No se pudo subir la foto.");
      } finally {
        setSubiendo((n) => Math.max(0, n - 1));
      }
    }
  }

  async function quitarFoto(id: string) {
    setDraft((prev) => ({ ...prev, fotos: prev.fotos.filter((x) => x !== id) }));
    subidasNuevas.current.delete(id);
    await fetch(`/api/fotos?id=${id}`, { method: "DELETE", credentials: "same-origin" }).catch(
      () => null,
    );
  }

  // Una foto subida y luego cancelada no debe quedarse ocupando espacio.
  async function cerrarSinGuardar() {
    const huerfanas = [...subidasNuevas.current].filter((id) => !cita.fotos.includes(id));
    onCerrar();
    for (const id of huerfanas) {
      await fetch(`/api/fotos?id=${id}`, { method: "DELETE", credentials: "same-origin" }).catch(
        () => null,
      );
    }
  }

  async function guardar() {
    setError("");
    if (!draft.cliente.trim() || !draft.fecha || !draft.hora) {
      setError("Falta el nombre, la fecha o la hora.");
      return;
    }
    if ((Number(draft.abono) || 0) > total) {
      setError("El abono es mayor que el valor del servicio.");
      return;
    }
    setGuardando(true);
    try {
      await pedir("/api/citas", enviarJSON({ accion: "guardar", ...draft }));
      onGuardado(draft.id ? "Cita actualizada." : "Cita guardada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar() {
    if (!draft.id) return;
    if (!confirm(`¿Eliminar la cita de ${draft.cliente}? Sus fotos también se borran.`)) return;
    try {
      await pedir("/api/citas", enviarJSON({ accion: "eliminar", id: draft.id }));
      onGuardado("Cita eliminada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar.");
    }
  }

  return (
    <div className="ag-scrim" role="dialog" aria-modal="true" aria-label="Datos de la cita">
      <div className="ag-sheet">
        <header>
          <h2>{draft.id ? "Editar cita" : "Nueva cita"}</h2>
          <button className="ag-btn ghost" type="button" onClick={cerrarSinGuardar} aria-label="Cerrar">
            ✕
          </button>
        </header>

        <div className="body">
          <fieldset className="ag-set">
            <legend>Clienta</legend>
            <div className="ag-grid">
              <label className="ag-f full">
                Nombre
                <input
                  id="f-cliente"
                  value={draft.cliente}
                  onChange={(e) => set("cliente", e.target.value)}
                  placeholder="Ej. Laura Restrepo"
                />
              </label>
              <label className="ag-f">
                WhatsApp
                <input
                  id="f-tel"
                  inputMode="tel"
                  value={draft.tel}
                  onChange={(e) => set("tel", e.target.value)}
                  placeholder="300 123 4567"
                />
              </label>
              <label className="ag-f">
                Personas a maquillar
                <input
                  id="f-personas"
                  type="number"
                  min={1}
                  value={draft.personas}
                  onChange={(e) => set("personas", Number(e.target.value) || 1)}
                />
              </label>
            </div>
          </fieldset>

          <fieldset className="ag-set">
            <legend>Cita</legend>
            <div className="ag-grid">
              <label className="ag-f">
                Fecha
                <input
                  id="f-fecha"
                  type="date"
                  value={draft.fecha}
                  onChange={(e) => set("fecha", e.target.value)}
                />
              </label>
              <label className="ag-f">
                Hora de inicio
                <input
                  id="f-hora"
                  type="time"
                  value={draft.hora}
                  onChange={(e) => set("hora", e.target.value)}
                />
              </label>
              <label className="ag-f">
                Servicio
                <select
                  id="f-servicio"
                  value={draft.servicio}
                  onChange={(e) => set("servicio", e.target.value)}
                >
                  {SERVICIOS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="ag-f">
                Ocasión
                <select
                  id="f-ocasion"
                  value={draft.ocasion}
                  onChange={(e) => set("ocasion", e.target.value)}
                >
                  {OCASIONES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="ag-f">
                Duración estimada
                <select
                  id="f-duracion"
                  value={draft.duracion}
                  onChange={(e) => set("duracion", Number(e.target.value))}
                >
                  {DURACIONES.map((d) => (
                    <option key={d.v} value={d.v}>
                      {d.t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="ag-f">
                Estado
                <select
                  id="f-estado"
                  value={draft.estado}
                  onChange={(e) => set("estado", e.target.value)}
                >
                  {Object.entries(ESTADOS).map(([valor, { label }]) => (
                    <option key={valor} value={valor}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </fieldset>

          <fieldset className="ag-set">
            <legend>Lugar</legend>
            <div className="ag-grid">
              <label className="ag-f">
                Modalidad
                <select
                  id="f-modalidad"
                  value={draft.modalidad}
                  onChange={(e) => set("modalidad", e.target.value)}
                >
                  {MODALIDADES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="ag-f">
                Barrio o ciudad
                <input
                  id="f-zona"
                  value={draft.zona}
                  onChange={(e) => set("zona", e.target.value)}
                  placeholder="Ej. Laureles, Medellín"
                />
              </label>
              <label className="ag-f full">
                Dirección exacta
                <input
                  id="f-direccion"
                  value={draft.direccion}
                  onChange={(e) => set("direccion", e.target.value)}
                  placeholder="Calle 10 #43-25, apto 502 · torre norte"
                />
              </label>
            </div>
          </fieldset>

          <fieldset className="ag-set">
            <legend>Dinero</legend>
            <div className="ag-grid">
              <label className="ag-f">
                Valor del servicio
                <input
                  id="f-valor"
                  type="number"
                  min={0}
                  step={1000}
                  value={draft.valor || ""}
                  onChange={(e) => set("valor", Number(e.target.value) || 0)}
                  placeholder="0"
                />
              </label>
              <label className="ag-f">
                Abonado
                <input
                  id="f-abono"
                  type="number"
                  min={0}
                  step={1000}
                  value={draft.abono || ""}
                  onChange={(e) => set("abono", Number(e.target.value) || 0)}
                  placeholder="0"
                />
              </label>
              <label className="ag-f">
                Medio del abono
                <select id="f-medio" value={draft.medio} onChange={(e) => set("medio", e.target.value)}>
                  {MEDIOS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="ag-f">
                Fecha del abono
                <input
                  id="f-fecha-abono"
                  type="date"
                  value={draft.fechaAbono}
                  onChange={(e) => set("fechaAbono", e.target.value)}
                />
              </label>
            </div>
            <div className="ag-balance" style={{ marginTop: 10 }}>
              <div>
                <b>Valor del servicio</b>
                <i>{money(total)}</i>
              </div>
              <div>
                <b>Le queda debiendo</b>
                <i className="big" style={{ color: saldo > 0 ? "var(--warn)" : "var(--ok)" }}>
                  {money(Math.max(0, saldo))}
                </i>
              </div>
            </div>
          </fieldset>

          <fieldset className="ag-set">
            <legend>Fotos de referencia</legend>
            <div className="ag-photos">
              {draft.fotos.map((id) => (
                <div className="ag-slot" key={id}>
                  <img src={`/api/fotos?id=${id}`} alt="Foto de referencia" />
                  <button type="button" onClick={() => quitarFoto(id)} aria-label="Quitar foto">
                    ✕
                  </button>
                </div>
              ))}
              {Array.from({ length: subiendo }).map((_, i) => (
                <div className="ag-slot" key={`sub-${i}`}>
                  Subiendo…
                </div>
              ))}
              <button type="button" className="ag-add" onClick={() => fileRef.current?.click()}>
                <span>+</span>
                Agregar
              </button>
            </div>
            <input
              ref={fileRef}
              id="f-fotos"
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                void subir(e.target.files);
                e.target.value = "";
              }}
            />
          </fieldset>

          <fieldset className="ag-set">
            <legend>Notas</legend>
            <label className="ag-f">
              Detalles del look, alergias, color del vestido, tono de piel
              <textarea
                id="f-notas"
                value={draft.notas}
                onChange={(e) => set("notas", e.target.value)}
                placeholder="Piel mixta, alergia al látex. Vestido verde esmeralda. Ojo ahumado café y labio nude."
              />
            </label>
          </fieldset>

          {error ? <div className="ag-err">{error}</div> : null}
        </div>

        <footer>
          {draft.id ? (
            <button className="ag-btn ghost" type="button" onClick={eliminar}>
              Eliminar
            </button>
          ) : null}
          <button className="ag-btn" type="button" onClick={cerrarSinGuardar}>
            Cancelar
          </button>
          <button className="ag-btn primary" type="button" onClick={guardar} disabled={guardando}>
            {guardando ? "Guardando…" : "Guardar cita"}
          </button>
        </footer>
      </div>
    </div>
  );
}

/* ---------------- cuentas ---------------- */

function Cuentas({
  yo,
  onCerrar,
  toast,
}: {
  yo: Usuario;
  onCerrar: () => void;
  toast: (m: string) => void;
}) {
  const [lista, setLista] = useState<Cuenta[]>([]);
  const [usuario, setUsuario] = useState("");
  const [nombre, setNombre] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");

  const recargar = useCallback(async () => {
    try {
      const data = await pedir<{ usuarios: Cuenta[] }>("/api/usuarios");
      setLista(data.usuarios);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron leer las cuentas.");
    }
  }, []);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  async function crear() {
    setError("");
    try {
      await pedir("/api/usuarios", enviarJSON({ usuario, nombre, clave }));
      setUsuario("");
      setNombre("");
      setClave("");
      await recargar();
      toast("Cuenta creada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la cuenta.");
    }
  }

  async function quitar(id: string, nombreCuenta: string) {
    if (!confirm(`¿Quitar la cuenta de ${nombreCuenta}? Sus citas quedan guardadas pero nadie las verá.`))
      return;
    try {
      await pedir(`/api/usuarios?id=${id}`, { method: "DELETE" });
      await recargar();
      toast("Cuenta eliminada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo quitar la cuenta.");
    }
  }

  return (
    <div className="ag-scrim" role="dialog" aria-modal="true" aria-label="Cuentas">
      <div className="ag-sheet">
        <header>
          <h2>Cuentas</h2>
          <button className="ag-btn ghost" type="button" onClick={onCerrar} aria-label="Cerrar">
            ✕
          </button>
        </header>
        <div className="body">
          <p style={{ color: "var(--ink-soft)", fontSize: 13.5, marginTop: 0 }}>
            Cada cuenta ve solo sus propias citas. Tú eres la administradora: eres la única que puede
            crear o quitar cuentas.
          </p>
          <div className="ag-userlist">
            {lista.map((c) => (
              <div className="ag-userrow" key={c.id}>
                <strong>{c.nombre}</strong>
                <span style={{ color: "var(--ink-faint)" }}>@{c.usuario}</span>
                <span className="tag">{c.rol === "admin" ? "administradora" : "maquilladora"}</span>
                {c.id !== yo.id ? (
                  <button className="ag-btn ghost" type="button" onClick={() => quitar(c.id, c.nombre)}>
                    Quitar
                  </button>
                ) : null}
              </div>
            ))}
          </div>

          <fieldset className="ag-set">
            <legend>Agregar una cuenta</legend>
            <div className="ag-grid">
              <label className="ag-f">
                Nombre
                <input id="c-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
              </label>
              <label className="ag-f">
                Usuario
                <input
                  id="c-usuario"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  placeholder="sin espacios ni tildes"
                />
              </label>
              <label className="ag-f full">
                Contraseña
                <input
                  id="c-clave"
                  type="password"
                  value={clave}
                  onChange={(e) => setClave(e.target.value)}
                />
                <span className="ag-hint">
                  Mínimo 8 caracteres. Pásasela por aparte y que la cambie contigo cuando quiera.
                </span>
              </label>
            </div>
          </fieldset>

          {error ? <div className="ag-err">{error}</div> : null}
        </div>
        <footer>
          <button className="ag-btn primary" type="button" onClick={crear}>
            Crear cuenta
          </button>
        </footer>
      </div>
    </div>
  );
}
