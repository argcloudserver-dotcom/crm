# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS base
RUN corepack enable
RUN apk add --no-cache libc6-compat
WORKDIR /repo

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json tsconfig.json ./
# نسخ ملفات الـ package.json للمكاتب والواجهة
COPY apps/web/package.json apps/web/
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
# بناء الواجهة (Vite Build)
RUN pnpm --filter @workspace/web... run build

# مرحلة التشغيل باستخدام Nginx الخفيف
FROM nginx:alpine AS runner

# حذف إعدادات Nginx الافتراضية
RUN rm /etc/nginx/conf.d/default.conf

# إضافة إعدادات Nginx لدعم React Router (عشان لو عملت ريفريش للصفحة متضربش 404)
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

# نسخ الملفات النهائية من مجلد dist إلى Nginx
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]