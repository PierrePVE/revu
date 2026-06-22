# Déploiement de Revu

Stack de production : **Nuxt 3** sur **Vercel**, **PostgreSQL** sur **Railway**,
emails transactionnels via **Brevo (SMTP)**.

Le code est identique en local et en prod — seules les variables d'environnement
changent.

---

## 1. Base de données (Railway)

1. Crée un service **PostgreSQL** sur Railway, puis copie son `DATABASE_URL`
   (onglet *Variables* / *Connect*). Il ressemble à
   `postgresql://user:pass@host.proxy.rlwy.net:port/railway`.

2. **Applique le schéma** sur cette base (crée les tables si absentes). Depuis le
   dossier `app/`, avec le `DATABASE_URL` de Railway dans l'environnement :

   ```bash
   # Git Bash / macOS / Linux
   DATABASE_URL="postgresql://...railway..." npm run db:init
   ```
   ```powershell
   # PowerShell
   $env:DATABASE_URL="postgresql://...railway..."; npm run db:init
   ```

   > Pourquoi explicitement et pas au premier accès ? En serverless, plusieurs
   > instances peuvent démarrer en même temps et tenter d'appliquer le schéma
   > simultanément. On le fait une fois, à la main, c'est plus sûr.

3. **Crée le compte admin** sur cette base (mets un mot de passe fort) :

   ```bash
   DATABASE_URL="postgresql://...railway..." \
   ADMIN_MAIL="ton@email.com" \
   ADMIN_PASSWORD="un-mot-de-passe-fort" \
   npm run create-admin
   ```

4. *(Optionnel)* **Données de démo** pour le bouton « Voir la démo ». Sans danger
   pour les vraies données (ça ne touche que le commerce de démo `test@revu.fr`) :

   ```bash
   DATABASE_URL="postgresql://...railway..." npm run db:seed
   ```

---

## 2. Variables d'environnement (Vercel)

À définir dans **Project Settings → Environment Variables** (scope *Production*) :

| Variable           | Valeur                                              | Notes |
|--------------------|-----------------------------------------------------|-------|
| `DATABASE_URL`     | l'URL Postgres de Railway                           | requis |
| `NUXT_JWT_SECRET`  | une chaîne aléatoire longue                          | **jamais** réutiliser la valeur de dev. Générer : `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `NUXT_MAIL_HOST`   | `smtp-relay.brevo.com`                              | |
| `NUXT_MAIL_PORT`   | `587`                                               | |
| `NUXT_MAIL_USER`   | ton login SMTP Brevo (`xxxx@smtp-brevo.com`)        | |
| `NUXT_MAIL_PASS`   | ta clé SMTP Brevo                                   | secret |
| `NUXT_MAIL_FROM`   | l'adresse expéditrice (validée dans Brevo)          | idéalement sur ton domaine |
| `ADMIN_MAIL`       | l'email du compte admin                             | (sert au script create-admin) |
| `ADMIN_PASSWORD`   | le mot de passe admin                               | (sert au script create-admin) |
| `DATABASE_POOL_MAX`| `5` (optionnel)                                     | à baisser si Railway limite les connexions |

> ⚠️ Ne mets jamais ces valeurs dans le code ni dans Git. Le fichier `.env` reste
> local et gitignoré.

---

## 3. Projet Vercel

1. **Import Git Repository** → sélectionne le repo. Vercel détecte Nuxt
   automatiquement (preset Nitro `vercel`), pas de config à écrire.
2. Vérifie que la **Node version** est ≥ 20 (Project Settings → General).
3. *Build Command* et *Output* : laisser les valeurs par défaut détectées par Nuxt.
4. Ajoute les variables de l'étape 2, puis **Deploy**.

---

## 4. Brevo (délivrabilité)

- Valide l'adresse de `NUXT_MAIL_FROM` dans **Expéditeurs, domaines & IP →
  Expéditeurs** (lien de confirmation par email). Sans ça, Brevo refuse d'envoyer.
- Pour éviter le spam : à terme, utilise un expéditeur sur **ton propre domaine**
  et configure les enregistrements **SPF / DKIM** fournis par Brevo. Un expéditeur
  `@gmail.com` fonctionne mais finit souvent en spam.

---

## 5. Vérifications post-déploiement (smoke test)

Sur l'URL de prod :

- [ ] `GET /api/health` → `{ "status": "ok", "db": "connected" }`
- [ ] `/login` s'affiche, connexion admin OK → redirige vers `/admin`
- [ ] Création d'un commerçant depuis `/admin`
- [ ] `/avis/<slug>` : déposer un avis fonctionne
- [ ] `/login` → « Mot de passe oublié ? » → l'email de reset arrive bien
- [ ] Le QR code (`/dashboard/qrcode`) pointe vers l'URL de prod (et non localhost)

---

## À faire avant l'ouverture publique

- [ ] Remplir les pages légales (mentions légales, politique de confidentialité,
      durée de conservation des données) — voir les `[À COMPLÉTER]`.
- [ ] Expéditeur email sur domaine propre (SPF/DKIM).
