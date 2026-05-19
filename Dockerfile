# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY src/ src/
COPY public/ public/
COPY vite.config.ts tsconfig.json ./
RUN npm run build

# Stage 2: Build server (needs build tools for mediasoup native module)
# Must use glibc-based image (not Alpine/musl) to match production stage
FROM node:20-slim AS server-build
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip make g++ pkg-config \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci
COPY server/ .
RUN chmod +x node_modules/.bin/* 2>/dev/null || true
RUN npx prisma generate
RUN npm run build

# Stage 3: Production (slim image with runtime deps only)
FROM node:20-slim AS production
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=frontend-build /app/dist ./dist
COPY --from=server-build /app/server/dist ./server/dist
COPY --from=server-build /app/server/node_modules ./server/node_modules
COPY --from=server-build /app/server/package.json ./server/package.json
COPY server/prisma ./server/prisma
ENV NODE_ENV=production
ENV DATABASE_URL=file:/app/data/screenflow.db
EXPOSE 4000
# mediasoup SFU UDP port range
EXPOSE 10000-10100/udp
CMD ["sh", "-c", "cd /app/server && npx prisma db push --skip-generate && node dist/index.js"]
