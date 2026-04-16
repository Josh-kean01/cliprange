# ---------- FRONTEND BUILD ----------
FROM node:22-bookworm-slim AS frontend-build

WORKDIR /app/frontend

COPY frontend/package.json ./package.json
RUN npm install

COPY frontend ./frontend-src
RUN cp -r ./frontend-src/. . && npm run build


# ---------- BACKEND DEPENDENCIES ----------
FROM node:22-bookworm-slim AS backend-deps

WORKDIR /app/backend

COPY backend/package.json ./package.json
RUN npm install --omit=dev


# ---------- RUNTIME ----------
FROM node:22-bookworm-slim AS runtime

# Install system dependencies + yt-dlp properly
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
     ca-certificates \
     curl \
     ffmpeg \
     python3 \
     python3-pip \
  && pip3 install --no-cache-dir yt-dlp \
  && yt-dlp --version \
  && ffmpeg -version \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Environment
ENV NODE_ENV=production
ENV PORT=8787
ENV DATA_DIR=/tmp/cliprange

# Copy dependencies + app
COPY --from=backend-deps /app/backend/node_modules ./node_modules
COPY backend ./backend
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Expose port
EXPOSE 8787

# Start app
CMD ["node", "backend/src/index.js"]