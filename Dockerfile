# TeleSell SaaS - 24/7 Production Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json bun.lock* ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build Vite frontend and Node.js server bundle
RUN npm run build

# Production Runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built distribution assets
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/data ./data
COPY --from=builder /app/android ./android

# Expose port 3000
EXPOSE 3000

# Health check for container orchestrators (Docker Swarm, Kubernetes, Coolify)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the 24/7 background engine & web server
CMD ["node", "dist/server.cjs"]
