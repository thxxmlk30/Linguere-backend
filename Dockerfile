# ---------- Stage 1 : Build ----------
FROM node:20-alpine AS builder

WORKDIR /app

# Installer les dépendances (cache-friendly)
COPY package*.json ./
RUN npm install

# Copier le code source et builder
COPY . .
RUN npm run build

# ---------- Stage 2 : Production ----------
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# N'installer que les dépendances de prod
COPY package*.json ./
RUN npm install --omit=dev

# Récupérer le build compilé depuis le stage précédent
COPY --from=builder /app/dist ./dist

# Render fournit le port via la variable d'env PORT
EXPOSE 3000

# Utilisateur non-root pour la sécurité
USER node

CMD ["sh", "-c", "node dist/seed/seed.js && node dist/main.js"]
