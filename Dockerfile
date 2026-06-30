# Comply & Collab — application image.
# Single-stage for simplicity and air-gapped reproducibility: the image carries
# the Prisma CLI + engines so it can run migrations and seed on first boot.
FROM node:22-bookworm-slim

# OpenSSL is required by Prisma's query/schema engines.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first for better layer caching.
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source and build.
COPY . .
RUN npx prisma generate && npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Entrypoint applies migrations (and optional seed) before starting the server.
RUN chmod +x ./docker-entrypoint.sh
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "start"]
