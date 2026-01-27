# MaPlume Server Dockerfile
# Multi-stage build for optimized production image

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files for workspaces
COPY package*.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/

# Install all dependencies
RUN npm ci

# Copy shared package source first (server depends on it)
COPY packages/shared ./packages/shared

# Build shared package
RUN npm run build --workspace=@maplume/shared

# Copy server source files
COPY packages/server ./packages/server

# Build server
RUN npm run build --workspace=@maplume/server

# Stage 2: Production dependencies only
FROM node:20-alpine AS deps

WORKDIR /app

# Copy server package.json
COPY packages/server/package.json ./

# Install production dependencies only
RUN npm install --omit=dev

# Stage 3: Production
FROM node:20-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S maplume -u 1001

# Copy built files from builder
COPY --from=builder /app/packages/server/dist ./dist

# Copy production dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Set ownership
RUN chown -R maplume:nodejs /app

# Switch to non-root user
USER maplume

# Environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Use dumb-init as entrypoint
ENTRYPOINT ["dumb-init", "--"]

# Start the server
CMD ["node", "dist/index.js"]
