FROM node:20-alpine AS builder

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

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
FROM node:20-alpine AS runner

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copy built files
COPY --from=builder /app/packages/api/dist ./dist
COPY --from=builder /app/packages/api/package*.json ./
COPY --from=builder /app/packages/api/prisma ./prisma
COPY --from=builder /app/packages/api/src/fonts ./dist/fonts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./node_modules/@invoicer/shared/dist
COPY --from=builder /app/packages/shared/package.json ./node_modules/@invoicer/shared/

# Create uploads directory
RUN mkdir -p uploads/logos

EXPOSE 3000

# Sync database schema and start
CMD ["sh", "-c", "npx prisma db push && node dist/index.js"]
