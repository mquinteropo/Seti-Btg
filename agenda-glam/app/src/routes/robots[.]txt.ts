import { createFileRoute } from "@tanstack/react-router";

// Agenda privada de trabajo: ningún buscador debe indexarla.
export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () =>
        new Response("User-agent: *\nDisallow: /\n", {
          headers: { "content-type": "text/plain; charset=utf-8" },
        }),
    },
  },
});
