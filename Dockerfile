FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

# Root workspace config
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./

# Web + Server package.json
COPY apps/web/package.json apps/web/
COPY apps/web/tsconfig.json apps/web/
COPY apps/web/vite.config.ts apps/web/
COPY apps/web/index.html apps/web/
COPY apps/web/vite-env.d.ts apps/web/
COPY apps/server/package.json apps/server/
COPY apps/server/tsconfig.json apps/server/

RUN pnpm install --frozen-lockfile

# Source
COPY apps/web/src apps/web/src
COPY apps/web/public apps/web/public
COPY apps/server/src apps/server/src

RUN cd apps/web && pnpm build
RUN cd apps/server && pnpm build

# Production stage
FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/server/package.json apps/server/

RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=builder /app/apps/web/dist ./apps/web/dist

RUN mkdir -p /app/apps/server/data

ENV PORT=3000
ENV DB_PATH=/app/apps/server/data/wishlist.db
ENV JWT_SECRET=change-me-in-fly-secrets

EXPOSE 3000

CMD ["node", "apps/server/dist/index.js"]
