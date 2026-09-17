# Agenda de Glam — sitio web

Aplicación desplegada en **https://agenda-glam.higgsfield.app**

Agenda de citas de maquillaje con cuentas propias (usuario y contraseña),
base de datos y almacenamiento de fotos. Cada cuenta ve solo sus citas.

## Stack

React 19 + TanStack Start, servido desde un único Cloudflare Worker.
D1 (SQLite) para los datos, R2 para las fotos de referencia.

## Estructura

- `app/src/lib/agenda.server.ts` — esquema, hash de contraseñas (PBKDF2-SHA256,
  120 000 iteraciones), sesiones por cookie httpOnly de 60 días, validación.
- `app/src/routes/api/session.ts` — registro de la primera cuenta, entrada, salida.
- `app/src/routes/api/citas.ts` — listar, guardar, pagar saldo, eliminar.
- `app/src/routes/api/usuarios.ts` — cuentas (solo la administradora).
- `app/src/routes/api/fotos.ts` — subida, entrega y borrado de fotos en R2.
- `app/src/routes/index.tsx` — toda la interfaz.
- `app/src/agenda-styles.ts` — la hoja de estilos.
- `app/migrations/0002_agenda.sql` — esquema en SQL, aditivo.

## Notas

- El saldo nunca se guarda: es `valor - abono`, calculado en la interfaz.
- Las fotos se comprimen en el navegador (1600 px, JPEG 0.82) antes de subirse.
- El sitio va con `noindex, nofollow` y `robots.txt` cerrado: es una agenda de
  trabajo con datos personales de clientas.
- Este directorio es la copia de trabajo; el código desplegado vive en el
  repositorio del sitio, al que se copia tal cual.
