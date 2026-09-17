import { createFileRoute } from "@tanstack/react-router";

import {
  ESTADOS,
  counted,
  db,
  fail,
  isoDate,
  isoTime,
  json,
  money,
  randomToken,
  storage,
  text,
  withUser,
} from "../../lib/agenda.server";

type CitaBody = Record<string, unknown> & { id?: unknown; accion?: unknown };

type CitaRow = {
  id: string;
  cliente: string;
  tel: string | null;
  personas: number;
  fecha: string;
  hora: string;
  duracion: number;
  servicio: string | null;
  ocasion: string | null;
  estado: string;
  modalidad: string | null;
  zona: string | null;
  direccion: string | null;
  valor: number;
  abono: number;
  medio: string | null;
  fecha_abono: string | null;
  notas: string | null;
  fotos: string;
};

function shape(row: CitaRow) {
  let fotos: string[] = [];
  try {
    const parsed = JSON.parse(row.fotos) as unknown;
    if (Array.isArray(parsed)) fotos = parsed.filter((x): x is string => typeof x === "string");
  } catch {
    fotos = [];
  }
  return {
    id: row.id,
    cliente: row.cliente,
    tel: row.tel ?? "",
    personas: row.personas,
    fecha: row.fecha,
    hora: row.hora,
    duracion: row.duracion,
    servicio: row.servicio ?? "",
    ocasion: row.ocasion ?? "",
    estado: row.estado,
    modalidad: row.modalidad ?? "",
    zona: row.zona ?? "",
    direccion: row.direccion ?? "",
    valor: row.valor,
    abono: row.abono,
    medio: row.medio ?? "",
    fechaAbono: row.fecha_abono ?? "",
    notas: row.notas ?? "",
    fotos,
  };
}

export const Route = createFileRoute("/api/citas")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        withUser(request, async (usuario) => {
          const { results } = await db()
            .prepare(
              `SELECT id, cliente, tel, personas, fecha, hora, duracion, servicio, ocasion,
                      estado, modalidad, zona, direccion, valor, abono, medio, fecha_abono,
                      notas, fotos
                 FROM citas WHERE usuario_id = ? ORDER BY fecha ASC, hora ASC`,
            )
            .bind(usuario.id)
            .all<CitaRow>();
          return json({ ok: true, citas: (results ?? []).map(shape) });
        }),

      // accion: "guardar" (crea o actualiza) | "pagar-saldo" | "eliminar"
      POST: async ({ request }) =>
        withUser(request, async (usuario) => {
          const body = (await request.json().catch(() => ({}))) as CitaBody;
          const accion = text(body.accion, 20) || "guardar";
          const id = text(body.id, 40);
          const ahora = new Date().toISOString();

          if (accion === "eliminar") {
            if (!id) return fail("sin_id", "No sé cuál cita borrar.");
            const row = await db()
              .prepare(`SELECT fotos FROM citas WHERE id = ? AND usuario_id = ?`)
              .bind(id, usuario.id)
              .first<{ fotos: string }>();
            if (!row) return fail("no_existe", "Esa cita ya no está.", 404);
            const bucket = storage();
            if (bucket) {
              try {
                const ids = JSON.parse(row.fotos) as string[];
                for (const foto of Array.isArray(ids) ? ids : []) {
                  await bucket.delete(`fotos/${foto}`);
                }
              } catch (error) {
                console.error(error);
              }
            }
            await db()
              .prepare(`DELETE FROM citas WHERE id = ? AND usuario_id = ?`)
              .bind(id, usuario.id)
              .run();
            return json({ ok: true });
          }

          if (accion === "pagar-saldo") {
            if (!id) return fail("sin_id", "No sé de cuál cita es el pago.");
            const row = await db()
              .prepare(`SELECT valor FROM citas WHERE id = ? AND usuario_id = ?`)
              .bind(id, usuario.id)
              .first<{ valor: number }>();
            if (!row) return fail("no_existe", "Esa cita ya no está.", 404);
            await db()
              .prepare(
                `UPDATE citas SET abono = ?, fecha_abono = ?, actualizado = ?
                  WHERE id = ? AND usuario_id = ?`,
              )
              .bind(row.valor, ahora.slice(0, 10), ahora, id, usuario.id)
              .run();
            return json({ ok: true });
          }

          const cliente = text(body.cliente, 80);
          const fecha = isoDate(body.fecha);
          const hora = isoTime(body.hora);
          if (!cliente) return fail("sin_cliente", "Falta el nombre de la clienta.");
          if (!fecha) return fail("sin_fecha", "Falta la fecha de la cita.");
          if (!hora) return fail("sin_hora", "Falta la hora de la cita.");

          const valor = money(body.valor);
          const abono = money(body.abono);
          if (abono > valor) {
            return fail("abono_alto", "El abono no puede ser mayor que el valor del servicio.");
          }

          const estadoPedido = text(body.estado, 20);
          const estado = ESTADOS.includes(estadoPedido) ? estadoPedido : "agendada";
          const fotos = Array.isArray(body.fotos)
            ? (body.fotos as unknown[]).filter((x): x is string => typeof x === "string").slice(0, 8)
            : [];

          const campos = [
            cliente,
            text(body.tel, 30),
            counted(body.personas, 1, 1, 30),
            fecha,
            hora,
            counted(body.duracion, 60, 15, 600),
            text(body.servicio, 60),
            text(body.ocasion, 40),
            estado,
            text(body.modalidad, 40),
            text(body.zona, 80),
            text(body.direccion, 200),
            valor,
            abono,
            text(body.medio, 30),
            isoDate(body.fechaAbono),
            text(body.notas, 2000),
            JSON.stringify(fotos),
            ahora,
          ];

          if (id) {
            const result = await db()
              .prepare(
                `UPDATE citas SET cliente=?, tel=?, personas=?, fecha=?, hora=?, duracion=?,
                        servicio=?, ocasion=?, estado=?, modalidad=?, zona=?, direccion=?,
                        valor=?, abono=?, medio=?, fecha_abono=?, notas=?, fotos=?, actualizado=?
                  WHERE id=? AND usuario_id=?`,
              )
              .bind(...campos, id, usuario.id)
              .run();
            if (!result.meta.changes) return fail("no_existe", "Esa cita ya no está.", 404);
            return json({ ok: true, id });
          }

          const nuevo = randomToken(16);
          await db()
            .prepare(
              `INSERT INTO citas (id, usuario_id, cliente, tel, personas, fecha, hora, duracion,
                      servicio, ocasion, estado, modalidad, zona, direccion, valor, abono, medio,
                      fecha_abono, notas, fotos, actualizado, creado)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            )
            .bind(nuevo, usuario.id, ...campos, ahora)
            .run();
          return json({ ok: true, id: nuevo });
        }),
    },
  },
});
