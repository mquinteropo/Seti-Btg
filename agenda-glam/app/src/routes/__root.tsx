import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportHiggsfieldError } from "../lib/higgsfield-error-reporting";
// Metadatos de la página (título del navegador, favicon, tarjetas sociales),
// leídos en tiempo de compilación — sin pedidos en caliente.
import appMetaJson from "../app-meta.json";

declare const __HF_DESIGN_INSPECTOR__: boolean;

const DEFAULT_TITLE = "Agenda de Glam";
const DEFAULT_DESCRIPTION =
  "Agenda de citas de maquillaje: fecha, hora, servicio, abonos, saldo por cobrar y fotos de referencia.";

type AppMeta = {
  og_title?: string | null;
  og_description?: string | null;
  og_image_url?: string | null;
  favicon_url?: string | null;
  og_video_url?: string | null;
};

const appMeta = appMetaJson as AppMeta;

const APP_HOST_ZONES = ["higgsfield.app", "higgsfield-dev.app"];

// Una URL absoluta de otra app serviría el favicon equivocado: se recorta a
// ruta relativa para que siempre resuelva contra quien sirve ESTA página.
function toOwnAssetUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.startsWith("/")) return value;
  try {
    const u = new URL(value);
    const isAppHost = APP_HOST_ZONES.some(
      (zone) => u.hostname === zone || u.hostname.endsWith(`.${zone}`),
    );
    if (isAppHost) return u.pathname + u.search;
    return value;
  } catch {
    return value;
  }
}

function buildHead(meta: AppMeta) {
  const title = meta.og_title ?? DEFAULT_TITLE;
  const description = meta.og_description ?? DEFAULT_DESCRIPTION;
  const ogImage = toOwnAssetUrl(meta.og_image_url);
  const favicon = toOwnAssetUrl(meta.favicon_url);

  return {
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title },
      { name: "description", content: description },
      // Agenda de trabajo con datos de clientas: nunca en buscadores.
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      ...(ogImage ? [{ property: "og:image", content: ogImage }] : []),
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&family=Karla:wght@400;500;700&display=swap",
      },
      ...(favicon ? [{ rel: "icon", href: favicon }] : []),
    ],
  };
}

function NotFoundComponent() {
  return (
    <div style={pantalla}>
      <div style={{ textAlign: "center", maxWidth: 380 }}>
        <h1 style={titulo}>Esa página no existe</h1>
        <p style={parrafo}>Puede que el enlace esté viejo.</p>
        <a href="/" style={boton}>
          Ir a la agenda
        </a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportHiggsfieldError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div style={pantalla}>
      <div style={{ textAlign: "center", maxWidth: 380 }}>
        <h1 style={titulo}>Esta página no cargó</h1>
        <p style={parrafo}>Algo falló de nuestro lado. Vuelve a intentar.</p>
        <button
          type="button"
          onClick={() => {
            router.invalidate();
            reset();
          }}
          style={boton}
        >
          Intentar de nuevo
        </button>
      </div>
    </div>
  );
}

const pantalla: React.CSSProperties = {
  minHeight: "100dvh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px 16px",
  background: "#FBF7F8",
  color: "#2A1C24",
  fontFamily: '"Karla", "Helvetica Neue", Arial, sans-serif',
};

const titulo: React.CSSProperties = {
  fontFamily: '"Bricolage Grotesque", "Karla", Georgia, serif',
  fontWeight: 800,
  fontSize: 22,
  margin: 0,
};

const parrafo: React.CSSProperties = { color: "#6B5762", fontSize: 14, margin: "6px 0 16px" };

const boton: React.CSSProperties = {
  display: "inline-block",
  background: "#B21E5F",
  color: "#FFFFFF",
  border: "none",
  borderRadius: 9,
  padding: "10px 18px",
  fontWeight: 700,
  fontSize: 15,
  textDecoration: "none",
  cursor: "pointer",
};

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => buildHead(appMeta),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="es" style={{ colorScheme: "light" }}>
      <head>
        <HeadContent />
      </head>
      <body style={{ margin: 0, background: "#FBF7F8", color: "#2A1C24" }}>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    if (!__HF_DESIGN_INSPECTOR__) {
      return;
    }

    void import("../module/design-inspector/runtime")
      .then(({ installHiggsfieldDesignInspector }) => {
        installHiggsfieldDesignInspector();
      })
      .catch((error) => {
        reportHiggsfieldError(
          error instanceof Error ? error : new Error("Failed to load design inspector"),
          { boundary: "higgsfield_design_inspector_import" },
        );
      });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Las rutas hijas se pintan aquí. */}
      <Outlet />
    </QueryClientProvider>
  );
}
