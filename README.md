# ClipRange

React + Vite frontend with an Express media pipeline for retrieving, trimming, and sharing YouTube clips.

## Local Development

Start the API in one terminal:

```powershell
cmd /c npm run server
```

Start the Vite app in another:

```powershell
cmd /c npm run dev
```

## Production

Build the frontend:

```powershell
cmd /c npm run build
```

Start the production server:

```powershell
cmd /c npm start
```

After `npm run build`, the Express server serves the built frontend from `dist/` along with the existing `/api`, `/media`, and `/share` routes.

## Environment Variables

- `PORT`: HTTP port for the server. Defaults to `8787`.
- `DATA_DIR`: Directory used for runtime cache, exports, history, and temp files. Defaults to `server/`.
- `SESSION_SECRET`: A stable secret used to sign private workspace cookies. Set this in production.
- `YT_DLP_PATH`: Optional override for the `yt-dlp` executable.
- `FFMPEG_PATH`: Optional override for the `ffmpeg` executable.
- `FFPROBE_PATH`: Optional override for the `ffprobe` executable.

The server can now resolve media tools from:

1. explicit environment variables
2. local binaries in `tools/`
3. system `PATH`

That means local Windows development still works, while Linux hosting can use standard installed binaries.

## Docker

Build the image:

```powershell
docker build -t cliprange .
```

Run it with persistent storage:

```powershell
docker run -p 8787:8787 -v cliprange-data:/data/cliprange cliprange
```

The container installs `ffmpeg` and `yt-dlp`, builds the frontend, and serves the whole app from one process.

## Notes

- The desktop and mobile layouts switch at `900px`.
- Retrieval still depends on `yt-dlp` and `ffmpeg`.
- Export history and rendered files live on disk, so hosted deployments should attach persistent storage if you want history and share links to survive restarts.
- Private editor history, preview media, and downloads are isolated per browser workspace. Shared clip pages remain public by design.
