# Agenda de Glam — versión para VPS

Agenda de citas de maquillaje: clienta, fecha y hora, servicio, valor, abono,
saldo por cobrar, lugar y fotos de referencia. Cuentas con usuario y contraseña;
cada cuenta ve solo sus propias citas.

Pensada para `app.maquillajeenmedellin.com`. Los pasos de instalación están en
`INSTALAR.md`.

## Qué es

Un solo proceso de Node que sirve la interfaz, la API y las fotos:

- `server.js` — Express + SQLite (`better-sqlite3`). Contraseñas con
  PBKDF2-SHA256 (120 000 iteraciones, sal por usuario), sesiones en cookie
  httpOnly de 60 días, comparación en tiempo constante.
- `public/index.html` — toda la interfaz, sin compilación ni dependencias de
  navegador. Se edita y se recarga.
- `agenda-glam.service` — unidad de systemd de usuario.

Datos en `data/agenda.db`, fotos en `data/fotos/`. Nada más que respaldar.

## Decisiones

- **Sin compilación.** La interfaz es un HTML que el servidor sirve tal cual:
  no hay bundler, ni `npm run build`, ni artefactos que se desincronicen.
- **SQLite y no Postgres.** Una maquilladora con cientos de citas al año no
  justifica otra base de datos que mantener. El servidor ya tiene Postgres para
  sendkeel; esto no lo toca.
- **El saldo no se guarda.** Es `valor - abono`, calculado al mostrarlo: así
  nunca queda un saldo que contradiga al abono.
- **Las fotos se comprimen en el navegador** (1600 px, JPEG 0.82) antes de
  subirse, y solo se entregan con sesión abierta.
- **`noindex` y `robots.txt` cerrado**: es una agenda de trabajo con nombres,
  teléfonos y direcciones de clientas.

## Probado

Servidor arrancado localmente: crear la primera cuenta, entrar, guardar cita,
listar, subir y recuperar una foto, rechazo de abono mayor que el valor, rechazo
de contraseña equivocada, rechazo sin sesión, y una segunda cuenta que no ve las
citas de la primera ni puede administrar cuentas.
