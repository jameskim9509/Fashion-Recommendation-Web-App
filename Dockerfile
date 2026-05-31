# syntax=docker/dockerfile:1

# ── deps: 의존성 설치 (lockfile 기준) ──────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── builder: Next.js standalone 빌드 ──────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# 빌드 시점에는 외부 자격증명이 필요 없다(홈/관리자 페이지는 force-dynamic·CSR).
# MONGODB_URI 등 런타임 비밀키는 이미지에 굽지 않고 docker-compose 의 env_file 로 주입.
RUN npm run build
# public/ 이 없을 수도 있으므로 runner 의 COPY 가 항상 성공하도록 빈 디렉터리 보장.
RUN mkdir -p public

# ── runner: 최소 런타임 이미지 (비루트 실행) ───────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# standalone 출력물 + 정적 자산만 복사.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
