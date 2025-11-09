# ---- Build Stage ----
FROM node:20-bullseye-slim AS build
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* yarn.lock* .npmrc* ./
RUN npm ci --legacy-peer-deps

# Copy Prisma schema and generate client before building
COPY prisma ./prisma
RUN npx prisma generate

# Copy source and build
COPY . .
RUN npm run build

# ---- Runtime Stage ----
FROM node:20-bullseye-slim AS runtime
WORKDIR /app

# Environment setup
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000

# Add CA certificates for SSL (Neon, Upstash)
RUN apt-get update && apt-get install -y ca-certificates openssl && rm -rf /var/lib/apt/lists/*

# Copy only what's needed for runtime
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY package.json ./

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "require('http').get('http://127.0.0.1:' + (process.env.PORT || 3000), r => process.exit(r.statusCode >= 200 && r.statusCode < 500 ? 0 : 1)).on('error', () => process.exit(1))"

# Expose port
EXPOSE 3000

# Run migrations and start the app
# (Default Nest output path is dist/src/main.js, adjust if necessary)
CMD sh -c "npx prisma migrate deploy && node dist/src/main.js"

