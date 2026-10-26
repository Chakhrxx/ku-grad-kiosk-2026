#!/usr/bin/env bash
# On-site test without deploying: this machine runs the whole kiosk, and ngrok gives it an HTTPS address that the
# kiosk's browser (the camera needs HTTPS) and the visitors' phones (the QR code) can both open.
#
#   scripts/ngrok.sh                                  # a new random address each run
#   NGROK_DOMAIN=xxx.ngrok-free.app scripts/ngrok.sh  # your free static domain: the same address every run
#   SAVE_STEPS=true scripts/ngrok.sh                  # also keep each shot in backend/data/steps
set -euo pipefail
cd "$(dirname "$0")/.."
PORT=${PORT:-8000}

(cd kiosk && bun run build) # the backend serves the built kiosk at /, so one tunnel covers everything

ngrok http "$PORT" ${NGROK_DOMAIN:+--url "$NGROK_DOMAIN"} --log stdout >/dev/null &
trap 'kill $! 2>/dev/null' EXIT
url=
for _ in $(seq 40); do # its local API answers once the tunnel is up
  url=$(curl -s localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | cut -d'"' -f4 || true)
  [ -n "$url" ] && break
  sleep 0.5
done
[ -n "$url" ] || { echo "ngrok did not start (is another ngrok running? try: ngrok http $PORT)" >&2; exit 1; }

echo
echo "  Kiosk & QR: $url"
echo
cd backend
PUBLIC_URL="$url" .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port "$PORT"
