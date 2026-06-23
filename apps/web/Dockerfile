# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS base
RUN corepack enable
RUN apk add --no-cache libc6-compat
WORKDIR /repo

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json tsconfig.json ./
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

# إعداد متغيرات البيئة (لاحظ مسار الـ API)
ENV PORT=80
ENV NODE_ENV=production
ENV VITE_API_URL=/api
ENV VITE_PUBLIC_APP_URL=https://crm.til-realestate.com
ENV VITE_SUPABASE_URL=https://okcnatqwuudqgetzbrzo.supabase.co
ENV VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rY25hdHF3dXVkcWdldHpicnpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5OTA0MDksImV4cCI6MjA5NzU2NjQwOX0.7SVBqC1FfkdJ0VGL5ivtVFHtW5dNGStQcBwkNv1Lpow

# بناء الواجهة
RUN pnpm --filter @workspace/web... run build

FROM nginx:alpine AS runner
RUN rm /etc/nginx/conf.d/default.conf
RUN rm -rf /usr/share/nginx/html/*

# إعداد Nginx لدعم الموقع وتوجيه الـ API للباك إند
RUN echo 'server { \
    listen 80; \
    \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
    \
    location /api { \
        proxy_pass http://srv-captain--crm-api:3000; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
    } \
}' > /etc/nginx/conf.d/default.conf

# نسخ ملفات الموقع النهائية
COPY --from=build /repo/apps/web/dist/public /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]