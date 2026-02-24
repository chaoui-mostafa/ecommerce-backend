# ==================== BUILD STAGE ====================
FROM node:18-alpine AS builder

# Create app directory
WORKDIR /usr/src/app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Run tests and linting (optional, uncomment if needed)
# RUN npm test
# RUN npm run lint

# ==================== PRODUCTION STAGE ====================
FROM node:18-alpine

# Install PM2 and dumb-init for proper signal handling
RUN apk add --no-cache dumb-init && \
    npm install -g pm2

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /usr/src/app/src ./src

# Create necessary directories with proper permissions
RUN mkdir -p uploads logs && \
    chown -R nodejs:nodejs /usr/src/app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})" || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application with PM2
CMD ["pm2-runtime", "src/server.js", "--name", "ecommerce-api"]