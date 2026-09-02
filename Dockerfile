FROM node:22-alpine AS base
# Prisma braucht OpenSSL für den Query-Engine-Download/-Betrieb; Alpine hat
# das standardmäßig nicht installiert.
RUN apk add --no-cache openssl

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# "builder" wird sowohl zum Bauen der App als auch (mit vollem node_modules)
# für den einmaligen "migrate"-Dienst in docker-compose.yml verwendet.
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
# Für das manuelle Seed-Skript (prisma/seed.cjs) im Runner-Image:
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
