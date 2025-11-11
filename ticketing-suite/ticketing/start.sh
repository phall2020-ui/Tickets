#!/bin/sh
set -e

echo "🔧 Starting container. PWD=$(pwd) PORT=${PORT} NODE_ENV=${NODE_ENV}"

# Show what's actually in the image (helps debugging)
echo "📂 Listing /app (top)…"; ls -la | sed -n '1,120p' || true
echo "📂 Listing /app/dist (top)…"; ls -la dist 2>/dev/null | sed -n '1,200p' || true

# Pick whichever build artifact exists
ENTRY=""
if [ -f "dist/src/main.js" ]; then
  ENTRY="dist/src/main.js"
elif [ -f "dist/main.js" ]; then
  ENTRY="dist/main.js"
fi

if [ -z "$ENTRY" ]; then
  echo "❌ No build artifact found at dist/src/main.js or dist/main.js"
  exit 1
fi
echo "✅ Using entry: $ENTRY"

echo "🧬 Generating Prisma client…"
npx prisma generate

echo "🔍 Checking and resolving any failed migrations…"
if [ -f "/app/scripts/resolve-failed-migrations.sh" ]; then
  /app/scripts/resolve-failed-migrations.sh
else
  echo "⚠️  Migration resolution script not found, skipping..."
fi

echo "🗃️  Running prisma migrate deploy…"
npx prisma migrate deploy || {
  EXIT_CODE=$?
  echo "❌ Migration deploy failed with exit code $EXIT_CODE"
  
  # If P3009 error (failed migration), provide helpful message
  echo ""
  echo "💡 Troubleshooting tips:"
  echo "   1. Check if there's a failed migration in the database"
  echo "   2. Connect to the database and run: npx prisma migrate status"
  echo "   3. Resolve failed migrations with: npx prisma migrate resolve"
  echo "   4. Or set environment variable SKIP_MIGRATIONS=1 to skip migration step"
  echo ""
  
  # Check if we should skip and continue anyway
  if [ "$SKIP_MIGRATIONS" = "1" ]; then
    echo "⚠️  SKIP_MIGRATIONS=1 is set, continuing without migrations..."
  else
    exit $EXIT_CODE
  fi
}

if [ "$RUN_MIN_SEED" = "1" ]; then
  echo "Running minimal seed…"
  node dist/prisma/seed.js 2>/dev/null || node -r ts-node/register prisma/seed.ts || true
fi

echo "🚀 Launching app…"
exec node "$ENTRY"
