# Quest shell (CyberCrime)

Minimal **team play shell**, **admin console**, and **API** for a Godot WebGL export embedded in an iframe. See [`protocol.md`](protocol.md) for `postMessage` shapes.

## Local development

**1. API** (terminal A):

```bash
cd apps/api
cp .env.example .env   # edit ADMIN_TOKEN, WEB_ORIGINS
npm install
npm run dev
```

**2. Web** (terminal B):

```bash
cd apps/web
cp .env.example .env.local   # optional
npm install
npm run dev
```

**3. Game static files:** copy your Web export into `apps/web/public/game/` so `CyberCrime.html` is at `apps/web/public/game/CyberCrime.html`, **or** set `VITE_GAME_URL` in `apps/web/.env.local` to a full URL.

Open `http://127.0.0.1:5173/` → enter team name → play page loads the iframe and polls hints.

Admin: `http://127.0.0.1:5173/admin.html` — paste the same `ADMIN_TOKEN` as the API.

## Production deploy

| Piece | Suggestion |
|-------|------------|
| API | [Fly.io](https://fly.io), [Railway](https://railway.app), or [Render](https://render.com). Set `ADMIN_TOKEN`, `WEB_ORIGINS` (your shell origin, comma-separated), `PORT` if required. Persist disk or set `SQLITE_PATH` to a mounted volume path. |
| Shell | [Cloudflare Pages](https://pages.cloudflare.com), [Vercel](https://vercel.com), or [Netlify](https://netlify.com) from `apps/web` after `npm run build`; upload `apps/web/dist`. |
| Game | Same static host under `/game/` or a `game.` subdomain; set `VITE_API_BASE` and `VITE_GAME_URL` at **build time** for the shell if API/game are on other origins. |

**Docker API** (from repo root, with Docker running):

```bash
docker build -t quest-api .
docker run --rm -p 3001:3001 \
  -e ADMIN_TOKEN=your-secret \
  -e 'WEB_ORIGINS=https://your-shell.example.com' \
  -v quest-data:/app/data \
  quest-api
```

SQLite defaults to `./data/quest.sqlite` under the working directory (`/app/data` with the volume above).

## Godot integration

See [`godot/README.md`](godot/README.md) and [`godot/QuestBridge.gd`](godot/QuestBridge.gd). The exported [`CyberCrime.html`](CyberCrime.html) includes a small script that queues hint `postMessage` payloads in `window.__questShellInbound`.

## Project layout

- `apps/api` — Express + SQLite
- `apps/web` — Vite multi-page shell (`/`, `play.html`, `admin.html`)
- `shared/protocol.ts` — shared message validation
- `godot/` — optional autoload bridge for the game project
# Cybercrime
