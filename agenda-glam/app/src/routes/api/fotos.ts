import { createFileRoute } from "@tanstack/react-router";

import { fail, json, randomToken, storage, withUser } from "../../lib/agenda.server";

const TIPOS = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 8 * 1024 * 1024;

export const Route = createFileRoute("/api/fotos")({
  server: {
    handlers: {
      // Sirve una foto. Sin sesión no se entrega nada: son referencias de clientas.
      GET: async ({ request }) =>
        withUser(request, async () => {
          const id = new URL(request.url).searchParams.get("id") ?? "";
          if (!/^[A-Za-z0-9_-]{8,64}$/.test(id)) return fail("id_malo", "Foto no válida.", 400);
          const bucket = storage();
          if (!bucket) return fail("sin_storage", "El almacén de fotos no está disponible.", 503);
          const objeto = await bucket.get(`fotos/${id}`);
          if (!objeto) return fail("no_existe", "Esa foto ya no está.", 404);
          return new Response(objeto.body as unknown as BodyInit, {
            headers: {
              "content-type": objeto.httpMetadata?.contentType ?? "image/jpeg",
              "cache-control": "private, max-age=86400",
            },
          });
        }),

      POST: async ({ request }) =>
        withUser(request, async () => {
          const bucket = storage();
          if (!bucket) return fail("sin_storage", "El almacén de fotos no está disponible.", 503);

          const form = await request.formData().catch(() => null);
          const file = form?.get("file");
          if (!(file instanceof File)) return fail("sin_archivo", "No llegó ninguna foto.");
          if (file.size > MAX_BYTES) {
            return fail("muy_grande", "Esa foto pesa demasiado, incluso comprimida.");
          }
          if (!TIPOS.includes(file.type)) {
            return fail("tipo_malo", "Solo se pueden subir imágenes (JPG, PNG o WEBP).");
          }

          const id = randomToken(16);
          await bucket.put(`fotos/${id}`, await file.arrayBuffer(), {
            httpMetadata: { contentType: file.type },
          });
          return json({ ok: true, id });
        }),

      DELETE: async ({ request }) =>
        withUser(request, async () => {
          const id = new URL(request.url).searchParams.get("id") ?? "";
          if (!/^[A-Za-z0-9_-]{8,64}$/.test(id)) return fail("id_malo", "Foto no válida.", 400);
          const bucket = storage();
          if (bucket) await bucket.delete(`fotos/${id}`);
          return json({ ok: true });
        }),
    },
  },
});
