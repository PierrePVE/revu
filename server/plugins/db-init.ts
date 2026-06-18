/**
 * server/plugins/db-init.ts — runs database initialisation at server startup.
 *
 * Nitro auto-registers plugins in server/plugins. In development this applies
 * schema.sql (creating the tables on first run) so that `npm run dev` yields a
 * ready-to-use database. In production the schema is managed separately on the
 * Railway database, so we skip it here.
 *
 * `defineNitroPlugin` is auto-imported by Nitro.
 */
import { initDb } from '../db/init'

export default defineNitroPlugin(async () => {
  // Only auto-initialise in local development.
  if (process.env.NODE_ENV === 'production') return

  try {
    await initDb()
  } catch (err) {
    // Never crash the server if the database is unreachable — just surface it
    // so the developer can start the local "postgres-db" container.
    console.error('[db] Initialisation au démarrage échouée:', err)
  }
})
