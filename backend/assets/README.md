# Assets

Drop files here, named by the ids in `catalog.json`. Adding a faculty, outfit, or background means adding its files here and one line in `catalog.json`. No code changes needed.

UI artwork (KU logo, flags, icons) lives in `kiosk/src/assets/` instead, bundled with the app.

| Path | What | Spec |
|---|---|---|
| `gowns/<level>/<faculty>.jpg` | Gown reference the try-on stream dresses the visitor in (e.g. `gowns/bachelor/engineering.jpg`) | Real gown on a mannequin or laid flat, plain background, even light, sash colors clearly visible |
| `gowns/others/<id>.jpg` | Male uniform, female uniform, Mo Hom suit references (`male-uniform`, `female-uniform`, `mohom`) | Same as above |
| `tiles/<level>/<faculty>.png` | Person-in-gown image on the faculty tile | Transparent PNG |
| `backgrounds/<background>.jpg` | Campus scene the kiosk puts the visitor on (e.g. `backgrounds/chomphu-road.jpg`) | Portrait 9:16, at least 1080 × 1920, eye-level camera, empty space in the middle |
| `frames/<background>.png` | Optional extra overlay on that scene's photo (the logo, place and date header is drawn by the kiosk) | Transparent PNG, 2:3 (1080×1620) |

Levels: `bachelor`, `master`, `doctoral`, `others`. Faculty and background ids are listed in `catalog.json`.
