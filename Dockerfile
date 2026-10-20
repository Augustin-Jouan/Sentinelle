# syntax=docker/dockerfile:1
FROM node:22.23.3-bookworm-slim@sha256:c3de60bf2f9dd0ac6370e6117950ff62d6e339527e7472301c9c78a017978392 AS base
WORKDIR /app

FROM base AS dependances
COPY package.json package-lock.json ./
RUN npm ci

FROM dependances AS construction
COPY . .
# Valeurs factices : la construction importe auth.ts et le client Prisma sans rien contacter.
RUN npx prisma generate \
 && DATABASE_URL=postgresql://construction@localhost/construction BETTER_AUTH_SECRET=construction-seulement-0123456789abcdef npm run build

# Migrations et seed, lancés une fois au démarrage par le service « migration ».
FROM construction AS outils
RUN useradd --system --uid 1001 --create-home sentinelle \
 && chown -R sentinelle /app
ENV HOME=/home/sentinelle
USER sentinelle
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx prisma/seed.ts"]

FROM base AS application
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN useradd --system --uid 1001 sentinelle
COPY --from=construction --chown=sentinelle /app/.next/standalone ./
COPY --from=construction --chown=sentinelle /app/.next/static ./.next/static
COPY --from=construction --chown=sentinelle /app/public ./public
# Le tracé du mode standalone oublie des fichiers de playwright-core (browsers.json…) : essai à l'appui,
# on recopie les paquets complets des modules externes.
COPY --from=construction --chown=sentinelle /app/node_modules/playwright ./node_modules/playwright
COPY --from=construction --chown=sentinelle /app/node_modules/playwright-core ./node_modules/playwright-core
COPY --from=construction --chown=sentinelle /app/node_modules/exceljs ./node_modules/exceljs
# Chromium de la même version que le paquet copié, lisible par l'utilisateur de l'application.
RUN node node_modules/playwright/cli.js install --with-deps chromium \
 && chown -R sentinelle /ms-playwright \
 && rm -rf /var/lib/apt/lists/*
USER sentinelle
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
  CMD node -e "fetch('http://127.0.0.1:3000/api/sante').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "server.js"]
