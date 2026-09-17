import { createFileRoute } from "@tanstack/react-router";

import {
  db,
  fail,
  hashPassword,
  json,
  randomToken,
  text,
  withUser,
} from "../../lib/agenda.server";

export const Route = createFileRoute("/api/usuarios")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        withUser(request, async (usuario) => {
          if (usuario.rol !== "admin") return fail("solo_admin", "Solo la dueña ve las cuentas.", 403);
          const { results } = await db()
            .prepare(`SELECT id, usuario, nombre, rol, creado FROM usuarios ORDER BY creado ASC`)
            .all<{ id: string; usuario: string; nombre: string; rol: string; creado: string }>();
          return json({ ok: true, usuarios: results ?? [] });
        }),

      POST: async ({ request }) =>
        withUser(request, async (usuario) => {
          if (usuario.rol !== "admin") {
            return fail("solo_admin", "Solo la dueña puede crear cuentas.", 403);
          }
          const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
          const nuevoUsuario = text(body.usuario, 40).toLowerCase();
          const clave = typeof body.clave === "string" ? body.clave : "";
          const nombre = text(body.nombre, 60) || nuevoUsuario;

          if (!/^[a-z0-9._-]{3,40}$/.test(nuevoUsuario)) {
            return fail("usuario_malo", "El usuario va en minúsculas, sin espacios ni tildes.");
          }
          if (clave.length < 8) {
            return fail("clave_corta", "La contraseña necesita al menos 8 caracteres.");
          }

          const existe = await db()
            .prepare(`SELECT id FROM usuarios WHERE usuario = ?`)
            .bind(nuevoUsuario)
            .first<{ id: string }>();
          if (existe) return fail("repetido", "Ese usuario ya está tomado.", 409);

          const salt = randomToken(16);
          await db()
            .prepare(
              `INSERT INTO usuarios (id, usuario, nombre, hash, salt, rol, creado)
               VALUES (?, ?, ?, ?, ?, 'maquilladora', ?)`,
            )
            .bind(
              randomToken(16),
              nuevoUsuario,
              nombre,
              await hashPassword(clave, salt),
              salt,
              new Date().toISOString(),
            )
            .run();
          return json({ ok: true });
        }),

      DELETE: async ({ request }) =>
        withUser(request, async (usuario) => {
          if (usuario.rol !== "admin") {
            return fail("solo_admin", "Solo la dueña puede quitar cuentas.", 403);
          }
          const id = new URL(request.url).searchParams.get("id") ?? "";
          if (!id) return fail("sin_id", "No sé cuál cuenta quitar.");
          if (id === usuario.id) return fail("tu_misma", "No puedes quitar tu propia cuenta.");
          await db().prepare(`DELETE FROM sesiones WHERE usuario_id = ?`).bind(id).run();
          await db().prepare(`DELETE FROM usuarios WHERE id = ?`).bind(id).run();
          return json({ ok: true });
        }),
    },
  },
});
