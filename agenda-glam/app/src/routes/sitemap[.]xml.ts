import { createFileRoute } from "@tanstack/react-router";

// No hay páginas públicas que listar: todo vive detrás del inicio de sesión.
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: () =>
        new Response(
          '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>\n',
          { headers: { "content-type": "application/xml; charset=utf-8" } },
        ),
    },
  },
});
