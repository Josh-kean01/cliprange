# yt-down

`yt-down` is organized as a strict two-part fullstack app:

- `frontend/` contains the React/Vite client only
- `backend/` contains the Express API, media pipeline, downloader logic, and runtime storage only

## Folder Layout

```text
yt-down/
├─ backend/
│  ├─ package.json
│  ├─ scripts/
│  ├─ src/
│  │  ├─ config/
│  │  ├─ controllers/
│  │  ├─ middleware/
│  │  ├─ routes/
│  │  ├─ services/
│  │  └─ utils/
│  ├─ storage/
│  └─ tools/
├─ frontend/
│  ├─ package.json
│  ├─ src/
│  └─ frontend config files
└─ package.json
```

## Local Development

Start the backend:

```powershell
cmd /c npm run server
```

Start the frontend:

```powershell
cmd /c npm run dev
```

## Production Build

Build the frontend:

```powershell
cmd /c npm run build
```

Start the backend:

```powershell
cmd /c npm start
```

The backend serves the built frontend from `frontend/dist` along with the `/api`, `/media`, and `/share` routes.

## Environment

See `backend/.env.example` for supported variables.

Create `backend/.env` for local development so the workspace cookie signature stays stable across backend restarts.

Important values:

- `PORT`: backend HTTP port, defaults to `8787`
- `DATA_DIR`: backend runtime storage directory, defaults to `backend/storage`
- `SESSION_SECRET`: signing key for workspace cookies. Set this in `backend/.env` during development to avoid random session resets after restart.
- `YT_DLP_PATH`, `FFMPEG_PATH`, `FFPROBE_PATH`: optional overrides for local media tools

## Media Tools

Install local Windows media tools into `backend/tools` with:

```powershell
cmd /c npm run setup:media-tools
```

The backend resolves tools from:

1. explicit environment variables
2. `backend/tools`
3. system `PATH`
