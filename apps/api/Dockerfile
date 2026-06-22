# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS base
RUN corepack enable
RUN apk add --no-cache vips-dev python3 make g++
WORKDIR /repo

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json tsconfig.json ./
COPY apps/api/package.json apps/api/
COPY packages/api-client/package.json packages/api-client/
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
COPY packages/i18n/package.json packages/i18n/
COPY packages/permissions/package.json packages/permissions/
COPY packages/shared/package.json packages/shared/
COPY packages/ui/package.json packages/ui/
RUN pnpm install --no-frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm --filter @workspace/api... run build

FROM node:22-alpine AS runner
RUN apk add --no-cache vips

# 1. تغيير المسار ليتطابق تماماً مع مسار الكود أثناء الـ Build
WORKDIR /repo/apps/api
ENV NODE_ENV=production

# 2. نسخ مجلد المكاتب للمسار الرئيسي للـ repo عشان Node يعرف يقراه
COPY --from=deps /repo/node_modules /repo/node_modules

# 3. نسخ مجلد dist لمكانه الطبيعي جوه مسار التطبيق
COPY --from=build /repo/apps/api/dist ./dist

# 4. تثبيت مكتبة sharp قبل نسخ الـ package.json
RUN npm install sharp

# 5. نسخ ملف الـ package.json في النهاية
COPY --from=build /repo/apps/api/package.json ./

EXPOSE 3000
CMD ["node", "--enable-source-maps", "./dist/index.mjs"]