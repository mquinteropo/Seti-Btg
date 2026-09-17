#!/usr/bin/env bash
# Instala la Agenda de Glam en la VPS, como usuario miguel, en el puerto 3019.
# No toca ningún otro sitio ni servicio. Se puede volver a correr sin daño:
# si ya está instalada, actualiza el código y respeta los datos.
#
#   bash instalar.sh
#
set -euo pipefail

APP="$HOME/apps/agenda-glam"
PUERTO=3019
RAMA="claude/makeup-appointments-app-6rohdu"
REPO=https://github.com/mquinteropo/Seti-Btg.git
UNIDAD="$HOME/.config/systemd/user/agenda-glam.service"

paso() { printf '\n\033[1m==> %s\033[0m\n' "$1"; }
morir() { printf '\n\033[31mFALLÓ: %s\033[0m\n' "$1" >&2; exit 1; }

if [ "$(id -un)" = "root" ]; then morir "No corras esto como root. Entra como miguel."; fi
command -v node >/dev/null || morir "No hay node instalado."
command -v git  >/dev/null || morir "No hay git instalado."

if ss -ltn 2>/dev/null | grep -q ":$PUERTO "; then
  systemctl --user is-active --quiet agenda-glam \
    || morir "El puerto $PUERTO ya está ocupado por otra cosa. Revisa antes de seguir."
fi

paso "Trayendo el código"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
git clone --depth 1 -b "$RAMA" "$REPO" "$TMP/repo" >/dev/null 2>&1 \
  || morir "No se pudo clonar el repositorio."
[ -d "$TMP/repo/agenda-vps" ] || morir "La rama no trae la carpeta agenda-vps."

mkdir -p "$APP"
# Solo el programa. La carpeta data/ nunca se toca.
cp -r "$TMP/repo/agenda-vps/server.js" "$TMP/repo/agenda-vps/package.json" \
      "$TMP/repo/agenda-vps/public" "$TMP/repo/agenda-vps/agenda-glam.service" "$APP/"
mkdir -p "$APP/data/fotos"

paso "Instalando dependencias"
cd "$APP"
npm install --omit=dev --no-audit --no-fund >/dev/null 2>&1 \
  || morir "npm install falló. Prueba: sudo apt-get install -y build-essential python3 && npm install --omit=dev"

paso "Comprobando que arranca"
PORT="$PUERTO" AGENDA_DATA="$APP/data" NODE_ENV=development node server.js >"$TMP/prueba.log" 2>&1 &
PRUEBA=$!
sleep 3
RESPUESTA="$(curl -s "http://127.0.0.1:$PUERTO/api/session" || true)"
kill "$PRUEBA" 2>/dev/null || true
wait "$PRUEBA" 2>/dev/null || true
case "$RESPUESTA" in
  *'"ok":true'*) printf '   responde bien: %s\n' "$RESPUESTA" ;;
  *) cat "$TMP/prueba.log" >&2; morir "El servidor no respondió como debía." ;;
esac

paso "Dejándolo como servicio"
mkdir -p "$HOME/.config/systemd/user"
cp "$APP/agenda-glam.service" "$UNIDAD"
systemctl --user daemon-reload
systemctl --user enable --now agenda-glam >/dev/null 2>&1
sleep 2
systemctl --user is-active --quiet agenda-glam \
  || { journalctl --user -u agenda-glam -n 30 --no-pager >&2; morir "El servicio no quedó activo."; }
loginctl show-user "$(id -un)" -p Linger 2>/dev/null | grep -q "Linger=yes" \
  || echo "   Falta que siga vivo sin sesión abierta:  sudo loginctl enable-linger $(id -un)"

paso "Listo del lado del servidor"
cat <<TEXTO

La agenda ya corre en http://localhost:$PUERTO

Falta publicarla. Dos comandos:

  1) Agregar en el ingress del túnel, ANTES de la regla final http_status:404:

       - hostname: app.maquillajeenmedellin.com
         service: http://localhost:$PUERTO

     El archivo suele ser ~/.cloudflared/config.yml o /etc/cloudflared/config.yml
     Después:  systemctl --user restart cloudflared   (o con sudo, según cómo corra)

  2) Crear el DNS del subdominio:

       cloudflared tunnel list
       cloudflared tunnel route dns <NOMBRE-DEL-TUNEL> app.maquillajeenmedellin.com

Y para comprobar:

       curl -s https://app.maquillajeenmedellin.com/api/session

Debe decir: {"ok":true,"usuario":null,"sinCuentas":true}
Ahí abres el sitio y creas la primera cuenta: quien la cree queda de administradora.

Registro del servicio:  journalctl --user -u agenda-glam -n 50 --no-pager
TEXTO
