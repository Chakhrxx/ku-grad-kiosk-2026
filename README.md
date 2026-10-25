# ku-grad-kiosk-2026

Graduation photo kiosk for Kasetsart University, Kamphaeng Saen campus. A graduate picks a degree, faculty and campus backdrop, then sees themselves live in the matching gown, standing on that backdrop. The photo is taken from that live picture, and they get it by QR code.

How a photo is made:

1. The kiosk camera feeds Decart's realtime try-on stream (`lucy-vton-latest`), which dresses the visitor in the chosen gown. The browser gets a short-lived token from the backend, so the API key never reaches the kiosk.
2. In the browser, MediaPipe cuts the dressed visitor out and draws them on the campus photo, every frame.
3. At the end of the countdown that picture is the photo. The backend adds the frame, stores it for 7 days and returns the QR code.

```
kiosk/                          React 19 + Vite + TypeScript + Tailwind v4 (bun)
  public/mediapipe/               MediaPipe runtime + selfie_multiclass model, self-hosted
  src/
    api/client.ts                 Backend calls + ApiError
    components/<Name>/            Presentational UI (with <Name>.stories.tsx, and <Name>.test.tsx where it has behaviour)
    screens/<Name>Screen/         One per kiosk step, wired to context via hooks
    context/                      I18nProvider (language), KioskProvider (the visitor's session and flow)
    hooks/                        useTryOnStream (Decart), useLiveBackground (MediaPipe), useCamera,
                                  useCountdown, useIdleTimer, useScale, useI18n, useKiosk
    i18n/                         th.ts, en.ts
    lib/                          cn, assetUrls, carousel, waves, hideBrokenImage
    styles/global.css             Tailwind + design-system tokens in @theme
    config.ts                     Idle timeout, retake limit, countdown, animation timing
backend/                        Python 3.12+ + FastAPI (pyproject.toml, pytest, ruff)
  app/
    main.py                       create_app(): routers + static mounts
    config.py                     Settings (pydantic-settings, reads env or backend/.env)
    routers/                      catalog, consent, realtime (stream token, gown reference), photos (store, QR, download page)
    schemas/                      Pydantic request/response models
    services/                     photos, frame, catalog, storage, realtime
    templates/download.html       Page the QR code opens
  assets/                       Gowns, tiles, backgrounds, frames, catalog.json (see assets/README.md)
  tests/
```

## Run locally

```sh
# backend
cd backend
python3 -m venv .venv && .venv/bin/pip install -e . --group dev
cp .env.example .env   # then fill in DECART_API_KEY
.venv/bin/python -m app.services.matte   # once: the 179 MB matting model into data/models (else the first photo fetches it)
.venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# kiosk (second terminal), http://localhost:5173
cd kiosk && bun install && bun dev
```

For production, run `bun run build` in `kiosk/`. The backend then serves the app at `/`, so you only deploy one service.

## Test on site with ngrok

No deploy needed: one machine runs everything (backend set up as above, `ngrok config add-authtoken` done once), and
ngrok gives it an HTTPS address for the kiosk's browser (the camera needs HTTPS) and for the QR code on phones.

```sh
scripts/ngrok.sh                                    # builds the kiosk, opens the tunnel, prints the address
NGROK_DOMAIN=<name>.ngrok-free.app scripts/ngrok.sh # the free static domain from the ngrok dashboard: same address every run
```

Open the printed address on the kiosk. Ctrl+C stops both. With the static domain the camera permission and old QR
codes keep working after a restart; with a random address both reset. The free plan shows ngrok's warning page once
per browser (tap "Visit Site") and has a monthly data cap, about 5 MB per photo.

The camera must be mounted upright (portrait): the try-on stream takes the camera picture as it is.

## Environment

Set these in the shell or in `backend/.env` (see `backend/.env.example`). API docs are at `/docs` while the backend runs.

| Var | Default | |
|---|---|---|
| `DECART_API_KEY` | none | Required: mints the try-on stream tokens (billed per second of streaming) |
| `PUBLIC_URL` | request host | Base URL the QR code points to |
| `MAX_PER_DAY` | 3000 | Photo cap per 24 hours |
| `DATA_DIR` | `backend/data` | Photos (deleted after 7 days) and consent records |
| `SAVE_STEPS` | false | Debug, to share with the team: each shot in `data/steps/preview-bg/01, 02, …` or `data/steps/no-preview-bg/…` (`dressed.mp4`, `result1.jpg` in the middle of the scene, `result2.jpg` where they stood, `info.txt`); off for real visitors |

## Install on a kiosk

The kiosk is a PWA: open the site in Chrome and choose "Install app" (icon at the right of the address bar).
It opens full screen with its own icon. There is no service worker, so a new deploy reaches every kiosk on reload.

For a locked-down booth, start Chrome in kiosk mode at login (no address bar, no way out without a keyboard):

```sh
# Windows (shortcut in shell:startup)
"C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --app=https://<domain>
# macOS (Login Items)
open -na "Google Chrome" --args --kiosk --app=https://<domain>
```

Allow the camera for the site once (it is remembered), or grant it by policy with `VideoCaptureAllowedUrls`.
The site must be served over HTTPS (or localhost) for both the camera and installing.

## Test and Storybook

```sh
cd backend
.venv/bin/pytest
.venv/bin/ruff check . && .venv/bin/ruff format .

cd kiosk
bun run test         # Vitest + Testing Library
bun run lint         # oxlint
bun run build        # typecheck + build
bun run storybook    # component catalog at http://localhost:6006
```
