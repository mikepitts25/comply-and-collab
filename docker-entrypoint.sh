#!/bin/sh
set -e

echo "[comply] Waiting for database..."
# Apply schema migrations (idempotent).
npx prisma migrate deploy

# Optionally seed demo data on first boot: set SEED=true in the environment.
if [ "$SEED" = "true" ]; then
  echo "[comply] Seeding demo data..."
  npm run db:seed || echo "[comply] Seed skipped/failed (already seeded?)."
fi

echo "[comply] Starting application..."
exec "$@"
