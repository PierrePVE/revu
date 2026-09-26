# Revu

Collecte et analyse d'avis clients pour les commerces de proximité.

Le client scanne un QR code en boutique, laisse une note (globale, qualité,
service, attente) et un commentaire. Le commerçant retrouve ses avis dans un
tableau de bord, avec des **alertes** quand un même mot revient dans des avis mal
notés (« attente », « froid », « accueil »…).

## Fonctionnalités

- **Avis par QR code** : page publique `/avis/<slug>` par commerce, QR code
  téléchargeable depuis le tableau de bord.
- **Tableau de bord** : note moyenne, nombre d'avis et mots-clés fréquents, sur
  la semaine, le mois ou depuis le début.
- **Alertes** : un mot cité au moins 3 fois avec une note moyenne ≤ 2,5 déclenche
  une alerte « attention » (≤ 2,0 : « critique »), sur une fenêtre glissante de
  30 jours. Une alerte marquée comme traitée ne revient que si un nouvel avis la
  relance.
- **Comptes** : connexion par email/mot de passe (JWT), réinitialisation du mot
  de passe par email, espace admin pour créer et supprimer des commerçants.
- **Démo publique** : bouton « Voir la démo » qui connecte au commerce de démo,
  remis à zéro chaque nuit.
- **Limitation de débit** par IP sur la connexion, le reset de mot de passe et le
  dépôt d'avis (compteurs stockés en base pour fonctionner en serverless).

## Stack

- [Nuxt 3](https://nuxt.com) (Vue 3) + API Nitro dans `server/api`
- PostgreSQL via `pg`, sans ORM
- Tailwind CSS v4
- Emails via SMTP (`nodemailer`)
- Production : Vercel (région `lhr1`) + Neon (`eu-west-2`)

## Démarrage en local

Prérequis : Node.js ≥ 20 et un serveur PostgreSQL.

```bash
npm install
cp .env.example .env   # puis renseigner DATABASE_URL, NUXT_JWT_SECRET…
npm run dev            # http://localhost:3000
```

En développement, le schéma (`server/db/schema.sql`) est appliqué
automatiquement au démarrage. Ensuite :

```bash
npm run db:seed        # données de démo (compte test@revu.fr / demo1234)
npm run create-admin   # compte admin à partir de ADMIN_MAIL / ADMIN_PASSWORD
```

Si `NUXT_MAIL_HOST` est vide, aucun email n'est envoyé : le lien de
réinitialisation s'affiche dans la console du serveur.

## Scripts

| Commande               | Rôle                                                      |
|------------------------|-----------------------------------------------------------|
| `npm run dev`          | serveur de développement                                  |
| `npm run build`        | build de production                                       |
| `npm run preview`      | lance le build de production en local                     |
| `npm run db:init`      | crée les tables manquantes (idempotent)                   |
| `npm run db:seed`      | (ré)insère le commerce de démo, sans toucher aux autres   |
| `npm run create-admin` | crée ou met à jour le compte admin                        |
| `node server/utils/analyser.js` | démo du moteur d'analyse sur des avis d'exemple  |

## Variables d'environnement

Toutes les variables sont décrites dans [`.env.example`](.env.example) :
`DATABASE_URL`, `DATABASE_POOL_MAX`, `NUXT_JWT_SECRET`, `NUXT_MAIL_*`,
`ADMIN_MAIL` / `ADMIN_PASSWORD` et `CRON_SECRET`.

## Structure

```
pages/            pages Vue (accueil, login, avis, dashboard, admin, compte…)
components/       composants partagés
middleware/       garde des routes (auth, admin)
server/api/       routes API Nitro
server/db/        schéma SQL, données de démo, scripts d'init et d'admin
server/utils/     accès base, auth, emails, rate limit, analyse des avis
```

## Déploiement

Tout est dans [DEPLOY.md](DEPLOY.md) : base Neon, variables Vercel, emails
Brevo, cron de remise à zéro de la démo et vérifications après déploiement.
