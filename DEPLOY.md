# Déploiement de Revu

Stack de production : **Nuxt 3** sur **Vercel** (front + API en fonctions
serverless, région `lhr1` / Londres), **PostgreSQL** sur **Neon** (région AWS
`eu-west-2` / Londres), emails transactionnels via **Brevo (SMTP)**.

Il n'y a pas de back séparé à héberger : les routes `server/api/*` (Nitro) sont
déployées par Vercel avec le front.

Le code est identique en local et en prod — seules les variables d'environnement
changent.

---

## 1. Base de données (Neon)

1. Crée un projet **Neon** dans une région européenne. La région des fonctions
   Vercel est fixée dans `nuxt.config.ts` (`nitro.vercel.functions.regions`) :
   garde les deux **dans la même région** (Neon `eu-west-2` ↔ Vercel `lhr1`,
   Neon `eu-central-1` ↔ Vercel `fra1`), sinon chaque requête SQL paie la
   latence entre les deux.

2. Dans **Connect**, Neon donne deux URLs :
   - **pooled** — hôte en `…-pooler.…neon.tech` : passe par PgBouncer, c'est
     celle de **Vercel** (beaucoup d'instances serverless = beaucoup de
     connexions) ;
   - **directe** — même URL sans `-pooler` : pour les **scripts d'admin** lancés
     depuis ton poste.

   Dans les deux, remplace `sslmode=require` par **`sslmode=verify-full`** (même
   comportement aujourd'hui, et ça évite un avertissement de `pg`).

3. Mets l'URL directe dans un fichier local **`.env.neon`** (ignoré par Git via
   `.env.*`), avec les identifiants admin :

   ```
   DATABASE_URL=postgresql://…@ep-xxx.c-2.eu-west-2.aws.neon.tech/neondb?sslmode=verify-full&channel_binding=require
   ADMIN_MAIL=ton@email.com
   ADMIN_PASSWORD=un-mot-de-passe-fort
   ```

4. **Applique le schéma** (crée les tables manquantes, sans toucher aux données —
   à relancer après chaque ajout de table dans `schema.sql`) :

   ```bash
   npm_lifecycle_event=db:init node --env-file=.env.neon --import tsx server/db/init.ts
   ```

   > Pourquoi à la main et pas au démarrage ? En serverless, plusieurs instances
   > peuvent démarrer en même temps et appliquer le schéma simultanément. On le
   > fait une fois, explicitement, c'est plus sûr.
   >
   > Pourquoi pas `npm run db:init` ? Il lit `.env` (ta base locale) ; la
   > commande ci-dessus force `.env.neon`. `npm_lifecycle_event` est la variable
   > qui déclenche le mode CLI du script.

5. **Crée le compte admin** :

   ```bash
   node --env-file=.env.neon --import tsx server/db/create-admin.ts
   ```

6. *(Optionnel)* **Données de démo** pour le bouton « Voir la démo ». Sans danger
   pour les vraies données (ça ne touche que le commerce de démo `test@revu.fr`) :

   ```bash
   npm_lifecycle_event=db:seed node --env-file=.env.neon --import tsx server/db/init.ts seed
   ```

---

## 2. Variables d'environnement (Vercel)

À définir dans **Project Settings → Environment Variables** (scope *Production*) :

| Variable           | Valeur                                              | Notes |
|--------------------|-----------------------------------------------------|-------|
| `DATABASE_URL`     | l'URL Neon **pooled** (`-pooler`, `sslmode=verify-full`) | requis |
| `DATABASE_POOL_MAX`| `2`                                                 | chaque instance serverless ouvre son propre pool |
| `NUXT_JWT_SECRET`  | une chaîne aléatoire longue                          | **jamais** réutiliser la valeur de dev. Générer : `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `NUXT_MAIL_HOST`   | `smtp-relay.brevo.com`                              | |
| `NUXT_MAIL_PORT`   | `587`                                               | |
| `NUXT_MAIL_USER`   | ton login SMTP Brevo (`xxxx@smtp-brevo.com`)        | |
| `NUXT_MAIL_PASS`   | ta clé SMTP Brevo                                   | secret |
| `NUXT_MAIL_FROM`   | l'adresse expéditrice (validée dans Brevo)          | idéalement sur ton domaine |

`ADMIN_MAIL` / `ADMIN_PASSWORD` ne servent qu'au script `create-admin` (étape
1.5) : inutile de les mettre sur Vercel.

> ⚠️ Ne mets jamais ces valeurs dans le code ni dans Git. Les fichiers `.env` et
> `.env.neon` restent locaux et gitignorés. Si une URL de base a fuité (collée
> dans un chat, un ticket…), réinitialise le mot de passe dans Neon (*Branches →
> main → Roles → Reset password*) puis mets à jour `.env.neon` et Vercel.
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
