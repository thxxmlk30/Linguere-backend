# Linguere Backend

API NestJS du projet **Linguere**, une application de restaurant sénégalais.

- **Backend** : `https://linguere-backend.onrender.com`
- **Frontend** : `https://linguere.vercel.app`
- **Base de données** : MySQL sur Aiven

---

## À quoi sert ce backend ?

Ce backend gère :

- l’authentification et les comptes utilisateur,
- le menu du restaurant,
- les commandes,
- les zones de livraison,
- le personnel et les ingrédients,
- les rapports admin,
- les paiements,
- quelques services externes comme la météo, la monnaie et les emails.

---

## Stack utilisée

- **NestJS** : structure propre et modulaire.
- **TypeORM** : connexion à MySQL via des entités.
- **JWT / Passport** : protection des routes.
- **Swagger** : documentation API.
- **Docker** : déploiement reproductible.
- **Render** : hébergement du backend.
- **Vercel** : hébergement du frontend.

---

## Connexion frontend ↔ backend

Le frontend appelle l’API via :

- `https://linguere-backend.onrender.com/api` en production,
- `http://localhost:3000/api` en local.

Le frontend lit cette valeur depuis `VITE_API_URL`.

Le backend autorise aussi :

- `https://linguere.vercel.app`
- `http://localhost:5173`

---

## Fichiers importants

- `src/main.ts` : démarre l’application, configure CORS, Swagger et les validations.
- `src/app.module.ts` : assemble tous les modules.
- `src/config/typeorm.config.ts` : configuration MySQL/Aiven.
- `src/auth/` : inscription, connexion, OTP, Google OAuth.
- `src/users/` : gestion des utilisateurs.
- `src/menu/` : gestion des plats.
- `src/orders/` : gestion des commandes.
- `src/ingredients/` : gestion du stock.
- `src/staff/` : gestion du personnel.
- `src/delivery-zones/` : zones et frais de livraison.
- `src/reports/` : statistiques admin.
- `src/payments/` : paiement Stripe / simulation.
- `src/weather/` : météo.
- `src/currency/` : taux de change.
- `src/mail/` : emails transactionnels.
- `src/seed/seed.ts` : données de démonstration.
- `Dockerfile` : image utilisée par Render.
- `docker-compose.yml` : lancement local des services.
- `.env.example` : modèle des variables d’environnement.

---

## Comptes de démo

Le seed crée déjà un admin :

- **Admin** : `admin@linguere.sn`
- **Mot de passe** : `Admin123!`

Il crée aussi un client de test et des données de démo.

---

## Démarrage local

```bash
npm install
npm run start:dev
```

Seed :

```bash
npm run seed
```

Tests :

```bash
npm run test
```

---

## Variables utiles

- `PORT`
- `FRONTEND_URL`
- `DB_HOST`
- `DB_PORT`
- `DB_USERNAME`
- `DB_PASSWORD`
- `DB_NAME`
- `DB_SSL_MODE`
- `JWT_SECRET`

---

## Idée générale du projet

Linguere est organisé en 4 blocs :

1. **Frontend** : interface utilisateur.
2. **Backend** : logique métier et API.
3. **Base de données** : stockage des données.
4. **Services externes** : mail, Google, Stripe, météo, monitoring.

