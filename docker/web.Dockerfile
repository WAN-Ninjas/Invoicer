FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/web/package*.json ./packages/web/
COPY packages/shared/package*.json ./packages/shared/

# Install dependencies
RUN npm ci

# Copy source code
COPY packages/shared ./packages/shared
COPY packages/web ./packages/web
COPY tsconfig.base.json ./

# Build shared package first
RUN npm run build --workspace=packages/shared

# Build web app
RUN npm run build --workspace=packages/web

# Production stage with nginx
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/packages/web/dist /usr/share/nginx/html

# Copy nginx config
COPY docker/web-nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
