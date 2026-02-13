FROM node:20-slim AS builder

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/api/package*.json ./packages/api/
COPY packages/shared/package*.json ./packages/shared/

# Install dependencies
RUN npm ci

# Copy source code
COPY packages/shared ./packages/shared
COPY packages/api ./packages/api
COPY tsconfig.base.json ./

# Build shared package
RUN npm run build --workspace=packages/shared

# Generate Prisma client
RUN npx prisma generate --schema=packages/api/prisma/schema.prisma

# Build API
RUN npm run build --workspace=packages/api

# Production stage
FROM node:20-slim AS runner

# Install dependencies for Puppeteer/Chrome
RUN apt-get update && apt-get install -y \
    openssl \
    chromium \
    fonts-liberation \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set Puppeteer to use system Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Copy built files
COPY --from=builder /app/packages/api/dist ./dist
COPY --from=builder /app/packages/api/package*.json ./
COPY --from=builder /app/packages/api/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./node_modules/@invoicer/shared/dist
COPY --from=builder /app/packages/shared/package.json ./node_modules/@invoicer/shared/

# Remove npm and its vulnerable dependencies from production image
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

# Create uploads directory and set ownership
RUN mkdir -p uploads/logos && chown -R node:node /app

USER node

EXPOSE 3000

# Run migrations using prisma directly from node_modules, then start
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node dist/index.js"]
