/**
 * server/api/health.get.ts — GET /api/health
 *
 * Liveness probe that also verifies database connectivity. Returns
 * { status: 'ok', db: 'connected' } when a trivial query succeeds, or HTTP 503
 * with { status: 'error', db: 'disconnected' } otherwise.
 *
 * `defineEventHandler`, `setResponseStatus` and `query` (from server/utils/db.ts)
 * are all auto-imported by Nitro.
 */
export default defineEventHandler(async (event) => {
  try {
    // Cheapest possible round-trip to confirm the pool can reach PostgreSQL.
    await query('SELECT 1')
    return { status: 'ok', db: 'connected' }
  } catch (err) {
    console.error('[health] Database check failed:', err)
    setResponseStatus(event, 503)
    return { status: 'error', db: 'disconnected' }
  }
})
