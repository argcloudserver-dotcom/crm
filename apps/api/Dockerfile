# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json tsconfig.json ./
COPY apps/api/package.json apps/api/
COPY packages/api-zod/package.json packages/api-zod/
COPY packages/db/package.json packages/db/
COPY packages/permissions/package.json packages/permissions/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm --filter @workspace/api... run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/package.json ./
COPY --from=build /repo/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
