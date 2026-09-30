# Base44 Dev Environment

## What this is
A static HTML/JS games hub ("Ultimate Game Stash"). No build step, no backend,
no package manager, no external credentials. Pure static files served by nginx.

## Running it
```
docker compose -f docker-compose.base44.yml up -d
```
- nginx:alpine serves the repo root at `/usr/share/nginx/html` (read-only bind mount).
- Host port 3000 → container port 80.
- `index.html` redirects to `sx.html`, the main hub page ("Sx ALPHA").

## Key files
- `sx.html` — main hub page, self-contained (inlined game list + CDN fetch logic).
- `AASINGLEFILE.html` — alternate hub page, uses `games.js` (fetches local `UGS-Files/` first, then CDN fallbacks).
- `offline.html` — hub for the `offline/` game set, uses `offline.js`.
- `games.js` / `codeorn.js` — shared game-list builders (identical file lists).
- `UGS-Files/` — game HTML files (cl-prefixed).
- `offline/` — offline game HTML files.

## How games load
Hub pages build buttons from a file list. Clicking "play" opens an `about:blank`
window, fetches the game HTML (local `UGS-Files/` or jsdelivr CDN), and writes it
into the new window. New-window popups may be blocked in the preview iframe.

## Edits
Static files — any edit is served immediately on browser refresh (no rebuild).
Call `reload_preview` after changes if the preview doesn't refresh on its own.

## No secrets
No external credentials are required.
