// Server-only core of the agenda: schema, password hashing, sessions, and the
// helpers every /api route shares. Never imported from client code.
import { bindings } from "./bindings.server";
import type { D1Database, R2Bucket } from "@cloudflare/workers-types";

export const COOKIE = "ag_sesion";
const SESSION_DAYS = 60;
const PBKDF2_ITERATIONS = 120000;

export type Usuario = {
  id: string;
  usuario: string;
  nombre: string;
  rol: string;
};

export function db(): D1Database {
  const { DB } = bindings();
  if (!DB) throw new Error("La base de datos no está disponible.");
  return DB;
}

export function storage(): R2Bucket | null {
  return bindings().STORAGE ?? null;
}

let schemaReady: Promise<void> | undefined;

// Additive only — this runs against live data on every cold start.
export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const d = db();
      await d.batch([
        d.prepare(
          `CREATE TABLE IF NOT EXISTS usuarios (
             id TEXT PRIMARY KEY,
             usuario TEXT NOT NULL UNIQUE,
             nombre TEXT NOT NULL,
             hash TEXT NOT NULL,
             salt TEXT NOT NULL,
             rol TEXT NOT NULL DEFAULT 'maquilladora',
             creado TEXT NOT NULL
           )`,
        ),
        d.prepare(
          `CREATE TABLE IF NOT EXISTS sesiones (
             token TEXT PRIMARY KEY,
             usuario_id TEXT NOT NULL,
             expira TEXT NOT NULL
           )`,
        ),
        d.prepare(
          `CREATE TABLE IF NOT EXISTS citas (
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
           )`,
        ),
        d.prepare(`CREATE INDEX IF NOT EXISTS idx_citas_usuario ON citas (usuario_id, fecha)`),
      ]);
    })().catch((error) => {
      schemaReady = undefined;
      throw error;
    });
  }
  return schemaReady;
}

/* ---------- contraseñas ---------- */

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function randomToken(bytes = 32): string {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return toBase64(buffer).replace(/[+/=]/g, (c) => ({ "+": "-", "/": "_", "=": "" })[c] as string);
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encoder.encode(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    key,
    256,
  );
  return toBase64(new Uint8Array(bits));
}

// Constant time: a length-independent early return leaks which prefix matched.
export function sameSecret(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* ---------- sesiones ---------- */

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export function sessionCookie(token: string, maxAgeSeconds: number): string {
  return [
    `${COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
  ].join("; ");
}

export async function createSession(usuarioId: string): Promise<string> {
  const token = randomToken();
  const expira = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
  await db()
    .prepare(`INSERT INTO sesiones (token, usuario_id, expira) VALUES (?, ?, ?)`)
    .bind(token, usuarioId, expira)
    .run();
  return token;
}

export async function currentUser(request: Request): Promise<Usuario | null> {
  const token = readCookie(request, COOKIE);
  if (!token) return null;
  const row = await db()
    .prepare(
      `SELECT u.id, u.usuario, u.nombre, u.rol, s.expira
         FROM sesiones s JOIN usuarios u ON u.id = s.usuario_id
        WHERE s.token = ?`,
    )
    .bind(token)
    .first<{ id: string; usuario: string; nombre: string; rol: string; expira: string }>();
  if (!row) return null;
  if (new Date(row.expira).getTime() < Date.now()) {
    await db().prepare(`DELETE FROM sesiones WHERE token = ?`).bind(token).run();
    return null;
  }
  return { id: row.id, usuario: row.usuario, nombre: row.nombre, rol: row.rol };
}

export async function countUsers(): Promise<number> {
  const row = await db().prepare(`SELECT COUNT(*) AS n FROM usuarios`).first<{ n: number }>();
  return row?.n ?? 0;
}

/* ---------- respuestas ---------- */

export function json(data: unknown, init?: ResponseInit): Response {
  return Response.json(data, init);
}

export function fail(code: string, message: string, status = 400): Response {
  return Response.json({ ok: false, code, message }, { status });
}

export async function withUser(
  request: Request,
  run: (usuario: Usuario) => Promise<Response>,
): Promise<Response> {
  try {
    await ensureSchema();
    const usuario = await currentUser(request);
    if (!usuario) return fail("no_session", "Tu sesión se cerró. Entra otra vez.", 401);
    return await run(usuario);
  } catch (error) {
    console.error(error);
    return fail("server_error", "Algo falló en el servidor. Intenta otra vez.", 500);
  }
}

/* ---------- validación ---------- */

export function text(value: unknown, max = 500): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function money(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

export function counted(value: unknown, fallback: number, min: number, max: number): number {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_TIME = /^\d{2}:\d{2}$/;

export function isoDate(value: unknown): string {
  const v = text(value, 10);
  return ISO_DATE.test(v) ? v : "";
}

export function isoTime(value: unknown): string {
  const v = text(value, 5);
  return ISO_TIME.test(v) ? v : "";
}

export const ESTADOS = ["agendada", "confirmada", "completada", "cancelada"];
