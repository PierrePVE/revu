/**
 * server/db/init.ts — database bootstrap & seeding for Revu.
 *
 * Exposes two helpers:
 *   - initDb(): applies schema.sql when the tables don't exist yet. Called at
 *     server startup (in development) by server/plugins/db-init.ts.
 *   - seedDb(): loads the development fixtures from seed.sql.
 *
 * Also runnable from the command line (transpiled on the fly by tsx):
 *   npm run db:init   -> create the schema if needed
 *   npm run db:seed   -> insert the development test data
 *
 * No business logic here — schema management and connectivity only.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import pg from 'pg'
import type { Client as PgClient } from 'pg'

const { Client } = pg

/**
 * Read a .sql file from server/db.
 *
 * Resolved from the process working directory (the project root when running
 * `npm run dev` or the db scripts) so it works both inside the Nitro dev server
 * and from the CLI.
 *
 * @param nom - file name, e.g. "schema.sql".
 */
function lireSql(nom: string): string {
  return readFileSync(join(process.cwd(), 'server', 'db', nom), 'utf8')
}

/**
 * Build a one-off PostgreSQL client from DATABASE_URL.
 *
 * SSL is derived from the host so the exact same code runs locally and in
 * production (only DATABASE_URL changes): a local container (localhost) needs no
 * SSL, while managed Postgres such as Railway requires it.
 */
function creerClient(): PgClient {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set — check your .env file.')
  }
  const estLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString)
  return new Client({
    connectionString,
    ssl: estLocal ? false : { rejectUnauthorized: false },
  })
}

/**
 * Whether the core schema already exists (we probe the `commerces` table).
 *
 * @param client - a connected PostgreSQL client.
 */
async function tablesExistent(client: PgClient): Promise<boolean> {
  const res = await client.query<{ present: boolean }>(
    `SELECT EXISTS (
       SELECT FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'commerces'
     ) AS present`,
  )
  return res.rows[0]?.present === true
}

/**
 * Apply schema.sql when the schema is missing. Idempotent and safe to call on
 * every startup.
 */
export async function initDb(): Promise<void> {
  const client = creerClient()
  await client.connect()
  try {
    if (await tablesExistent(client)) {
      console.log('ℹ️  Tables déjà présentes — schéma inchangé.')
    } else {
      await client.query(lireSql('schema.sql'))
      console.log('🆕 Schéma appliqué (tables créées).')
    }
    console.log('✅ Base de données initialisée')
  } finally {
    await client.end()
  }
}

/**
 * Load development fixtures (seed.sql). Resets the test data on each run.
 */
export async function seedDb(): Promise<void> {
  const client = creerClient()
  await client.connect()
  try {
    await client.query(lireSql('seed.sql'))
    console.log('🌱 Données de test insérées (seed.sql)')
  } finally {
    await client.end()
  }
}

/**
 * Minimal .env loader for the CLI path (development only). Reads KEY=VALUE lines
 * from the project-root .env without overriding variables already present in the
 * shell environment. Avoids pulling in an extra dependency just for the scripts.
 */
function chargerEnvLocal(): void {
  if (process.env.DATABASE_URL) return
  try {
    const contenu = readFileSync(join(process.cwd(), '.env'), 'utf8')
    for (const ligne of contenu.split(/\r?\n/)) {
      const t = ligne.trim()
      if (!t || t.startsWith('#')) continue
      const i = t.indexOf('=')
      if (i === -1) continue
      const cle = t.slice(0, i).trim()
      if (!(cle in process.env)) process.env[cle] = t.slice(i + 1).trim()
    }
  } catch {
    // No .env file — rely on the real environment variables.
  }
}

// ---------------------------------------------------------------------------
// CLI entry point (npm run db:init / db:seed). Skipped when imported by Nitro,
// because then process.argv[1] is the server entry, not this file.
// ---------------------------------------------------------------------------

// Detect CLI invocation via the npm script name. npm sets npm_lifecycle_event to
// the script being run, so it is "db:init" / "db:seed" only from our CLI scripts
// and "dev" / "build" under the server. Unlike an import.meta.url/argv check this
// is bundling-proof: when Nitro inlines this module, import.meta.url becomes the
// bundle's URL and could wrongly match argv[1] — firing process.exit() inside the
// server worker (which is exactly the bug this avoids).
const estCli = ['db:init', 'db:seed'].includes(process.env.npm_lifecycle_event ?? '')

if (estCli) {
  // Env vars from .env aren't auto-loaded when run from the shell — do it first.
  chargerEnvLocal()

  const commande = process.argv[2]
  const tache = commande === 'seed' ? seedDb : initDb

  tache()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Échec de la tâche base de données:', err)
      process.exit(1)
    })
}
