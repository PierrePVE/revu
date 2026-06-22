/**
 * server/utils/db.ts — PostgreSQL access layer.
 *
 * Creates a single shared connection pool (node-postgres) for the Nitro server
 * and exposes a small `query()` helper. No business logic here — connectivity
 * only. Functions exported from server/utils are auto-imported in API routes.
 */

// `pg` is a CommonJS package; importing the default export and destructuring is
// the reliable ESM interop pattern (named imports can break under bundling).
import pg from 'pg'
import type { QueryResult, QueryResultRow } from 'pg'

const { Pool } = pg

// Read the connection string once at module load. We only warn (not throw) so
// the server can still boot in setups where the DB isn't reachable yet.
const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.warn(
    '[db] DATABASE_URL is not set — database queries will fail until it is configured (see .env).',
  )
}

/**
 * Shared pool for the whole server process. Reusing one pool (instead of
 * opening a connection per request) is essential on managed/serverless Postgres
 * such as Railway, where the number of connection slots is limited.
 *
 * Note: constructing the Pool does NOT open a connection — the first query() does.
 */
// Derive SSL from the host so the exact same code runs locally and in
// production (only DATABASE_URL changes): a local container (localhost) speaks
// plain TCP, while managed Postgres such as Railway requires SSL — with certs
// that aren't in Node's default CA bundle, hence rejectUnauthorized: false.
const estLocal = !!connectionString && /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString)

const pool = new Pool({
  connectionString,
  ssl: estLocal ? false : { rejectUnauthorized: false },
  // Cap connections per instance. On serverless (Vercel) each instance has its
  // own pool, so a high max across many instances would exhaust managed Postgres
  // connection slots (Railway's are limited). Tune via DATABASE_POOL_MAX.
  max: Number(process.env.DATABASE_POOL_MAX ?? 5),
  // Release idle clients quickly so cold/standby instances don't hold slots.
  idleTimeoutMillis: 10_000,
  // Fail fast instead of hanging when the database is unreachable.
  connectionTimeoutMillis: 10_000,
})

// Surface errors from idle clients (e.g. a dropped connection) instead of
// letting them crash the whole process.
pool.on('error', (err: Error) => {
  console.error('[db] Unexpected error on idle PostgreSQL client:', err)
})

/**
 * Execute a parameterized SQL query.
 *
 * Always pass user-provided values through `params` ($1, $2, …) rather than
 * string-concatenating them, to prevent SQL injection.
 *
 * @param text   SQL statement using $1, $2, … placeholders.
 * @param params Values bound to those placeholders.
 * @returns      The pg QueryResult (rows + metadata).
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  try {
    return await pool.query<T>(text, params)
  } catch (err) {
    // Log the failing statement to ease debugging, then rethrow so the caller
    // (the API route) decides how to respond to the client.
    console.error('[db] Query failed:', text, err)
    throw err
  }
}

// Exported for later advanced use (transactions, manual client checkout).
export { pool }
