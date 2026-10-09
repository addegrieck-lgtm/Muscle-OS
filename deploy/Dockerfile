# Image unique multi-cible pour api / web / admin (Phase 1 : un seul VPS).
# docker build -f deploy/Dockerfile --target api -t vaeloria-api .
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/admin/package.json apps/admin/
COPY packages/ui/package.json packages/ui/
COPY packages/types/package.json packages/types/
COPY packages/config/package.json packages/config/
COPY packages/api-client/package.json packages/api-client/
RUN pnpm install --frozen-lockfile
COPY . .
ARG API_URL=http://api:4000
ARG NEXT_PUBLIC_SITE_URL=https://vaeloria.fr
RUN pnpm --filter @vaeloria/api build \
 && API_URL=$API_URL NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL pnpm --filter @vaeloria/web build \
 && pnpm --filter @vaeloria/admin build \
 && pnpm --filter @vaeloria/api deploy --prod --legacy /out/api

FROM node:22-alpine AS api
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /out/api/node_modules ./node_modules
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/migrations ./migrations
USER node
EXPOSE 4000
CMD ["node", "dist/index.js"]

FROM node:22-alpine AS web
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]

FROM node:22-alpine AS admin
WORKDIR /app
ENV NODE_ENV=production PORT=3001 HOSTNAME=0.0.0.0
COPY --from=build /repo/apps/admin/.next/standalone ./
COPY --from=build /repo/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=build /repo/apps/admin/public ./apps/admin/public
USER node
EXPOSE 3001
CMD ["node", "apps/admin/server.js"]
