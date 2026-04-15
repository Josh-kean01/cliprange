FROM node:22-bookworm-slim AS frontend-build

WORKDIR /app/frontend

COPY frontend/package.json ./package.json
RUN npm install

COPY frontend ./frontend-src
RUN cp -r ./frontend-src/. . && npm run build

FROM node:22-bookworm-slim AS backend-deps

WORKDIR /app/backend

COPY backend/package.json ./package.json
RUN npm install --omit=dev

FROM node:22-bookworm-slim AS runtime

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl ffmpeg \
  && rm -rf /var/lib/apt/lists/*

RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
  && chmod +x /usr/local/bin/yt-dlp

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8787
ENV DATA_DIR=/data/cliprange

COPY --from=backend-deps /app/backend/node_modules ./node_modules
COPY backend ./backend
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

VOLUME ["/data/cliprange"]

EXPOSE 8787

CMD ["node", "backend/src/index.js"]
