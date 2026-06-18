// nuxt.config.ts — Nuxt 3 configuration for Revu.
// Reference: https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  // Pin Nitro/Nuxt behaviour to a fixed date so future upgrades don't silently
  // change defaults under us.
  compatibilityDate: '2024-11-01',

  // Nuxt DevTools, enabled in development only.
  devtools: { enabled: true },

  // Global stylesheet — Tailwind v4 entry point + design tokens.
  css: ['~/assets/css/main.css'],

  // Tailwind v4 is wired through its official Vite plugin (no PostCSS config,
  // no tailwind.config.js needed — tokens live in assets/css/main.css).
  vite: {
    plugins: [tailwindcss()],
  },

  // Enforce strict TypeScript for both the app and the server.
  // typeCheck is intentionally left off so `npm run dev` stays fast and never
  // blocks on type errors; run `npx nuxi typecheck` for a full check.
  typescript: {
    strict: true,
  },

  // Runtime configuration, populated from environment variables.
  // Top-level keys are SERVER-ONLY (never shipped to the browser). Nuxt
  // automatically overrides them from matching NUXT_* env vars at runtime;
  // anything the client needs must go under `public`.
  runtimeConfig: {
    // Postgres connection string. (server/utils/db.ts also reads it directly.)
    databaseUrl: process.env.DATABASE_URL,
    // Secret used to sign/verify JWT auth tokens (from NUXT_JWT_SECRET).
    jwtSecret: process.env.NUXT_JWT_SECRET,
    // SMTP credentials for transactional emails (from NUXT_MAIL_USER / _PASS).
    mailUser: process.env.NUXT_MAIL_USER,
    mailPass: process.env.NUXT_MAIL_PASS,

    public: {
      // Client-exposed configuration goes here (none yet).
    },
  },
})
