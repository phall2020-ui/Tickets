# ---- Build Stage ----
FROM node:20-bullseye-slim AS build
WORKDIR /app

# 1) Install deps first (cache-friendly)
COPY package.json package-lock.json* yarn.lock* .npmrc* ./
RUN npm ci --legacy-peer-deps

# 2) Generate Prisma client BEFORE building NestJS
COPY prisma ./prisma
RUN npx prisma generate

# 3) Copy source and compile
COPY . .
RUN npm run build

# ---- Runtime Stage ----
FROM node:20-bullseye-slim AS runtime
WORKDIR /app

# Environment (Railway injects PORT automatically)
ENV NODE_ENV=production HOST=0.0.0.0

# TLS certs for Neon/Upstash connections
RUN apt-get update && apt-get install -y ca-certificates openssl && rm -rf /var/lib/apt/lists/*

# Bring only what we need to run
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY package.json ./

# Healthcheck (optional) - increased start-period to 30s for slower startups
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=5 \
  CMD node -e "require('http').get('http://127.0.0.1:' + (process.env.PORT || 3000) + '/health', r => process.exit(r.statusCode>=200 && r.statusCode<400?0:1)).on('error', () => process.exit(1))"

# ✅ Don't hardcode port here — Railway injects it dynamically
EXPOSE 3000

# ✅ Run migrations with timeout, then start the server
CMD sh -c '\
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; \
  echo "🔧 [Container] Starting container"; \
  echo "🔧 [Container] PORT=${PORT:-3000} NODE_ENV=${NODE_ENV}"; \
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; \
  echo "🔧 [Container] Checking for dist/main.js..."; \
  [ -f dist/main.js ] || { echo "❌ [Container] dist/main.js not found!"; ls -R . | head -100; exit 1; }; \
  echo "✅ [Container] Build artifact present"; \
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; \
  echo "🔧 [Container] Running Prisma migrations with 30s timeout..."; \
  timeout 30s npx prisma migrate deploy || { \
    echo "⚠️  [Container] Migration timeout or failed - continuing anyway"; \
    echo "⚠️  [Container] Migrations may need to be run manually"; \
  }; \
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; \
  echo "🚀 [Container] Launching NestJS application..."; \
  node dist/main.js \
'
