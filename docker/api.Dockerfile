FROM node:24-alpine AS base

RUN apk upgrade --no-cache && apk add --no-cache openssl

WORKDIR /app

ENV PUPPETEER_SKIP_DOWNLOAD=true

COPY package*.json ./
COPY packages/api/package.json ./packages/api/
COPY packages/shared/package.json ./packages/shared/

FROM base AS builder

RUN npm ci --workspace=packages/api --workspace=packages/shared --include-workspace-root

COPY packages/shared ./packages/shared
COPY packages/api ./packages/api
COPY tsconfig.base.json ./

RUN npm run build:shared && npm run db:generate && npm run build:api

FROM base AS runner

RUN apk add --no-cache chromium font-liberation

ENV NODE_ENV=production
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

RUN npm ci --omit=dev --workspace=packages/api --workspace=packages/shared \
    && rm -rf /root/.npm /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/api/dist ./packages/api/dist
COPY --from=builder /app/packages/api/prisma ./packages/api/prisma
COPY --from=builder /app/packages/api/prisma.config.ts ./packages/api/prisma.config.ts

WORKDIR /app/packages/api

RUN mkdir -p /app/uploads/logos && chown -R node:node /app/uploads \
    && ln -s /app/uploads uploads

USER node

EXPOSE 3000

CMD ["sh", "-c", "/app/node_modules/.bin/prisma migrate deploy && exec node dist/index.js"]
