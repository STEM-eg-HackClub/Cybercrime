# docker build -t quest-api .
FROM node:20-bookworm-slim AS builder
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /repo
COPY shared ./shared
COPY apps/api ./apps/api
WORKDIR /repo/apps/api
RUN npm ci && npm run build

FROM node:20-bookworm-slim AS runner
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /repo/apps/api/package.json ./
COPY --from=builder /repo/apps/api/package-lock.json ./
RUN npm ci --omit=dev
COPY --from=builder /repo/apps/api/dist ./dist
ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001
CMD ["node", "dist/index.js"]
