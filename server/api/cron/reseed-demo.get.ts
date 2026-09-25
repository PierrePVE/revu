/**
 * server/api/cron/reseed-demo.get.ts — GET /api/cron/reseed-demo
 *
 * Resets the public demo commerce ("Voir la démo") by re-running seed.sql.
 * Called once a day by a Vercel cron job (see nitro.vercel.config.crons in
 * nuxt.config.ts) so that:
 *   - review dates stay relative to today — the dashboard's week/month filters
 *     and the 30-day alert window would otherwise go empty as the data ages;
 *   - whatever visitors did on the shared demo account (reviews posted, alerts
 *     marked as handled) is wiped.
 * seed.sql only deletes/recreates the demo commerce, never real merchants.
 *
 * Protected by CRON_SECRET: Vercel sends it as "Authorization: Bearer <secret>"
 * on cron invocations. Without the secret configured the route refuses every
 * call, so it can never be triggered anonymously.
 *
 * Auto-imported: defineEventHandler, getHeader, createError, query.
 */
import { timingSafeEqual } from 'node:crypto'
// Inlined as a string at build time by Nitro (see server/types/sql.d.ts).
import seedSql from '../../db/seed.sql'

/**
 * Constant-time string comparison, so response timing can't leak how many
 * leading characters of a guessed secret were right.
 *
 * @param a - first string.
 * @param b - second string.
 * @returns true when both strings are identical.
 */
function egaliteSure(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  return ba.length === bb.length && timingSafeEqual(ba, bb)
}

export default defineEventHandler(async (event) => {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    throw createError({ statusCode: 503, message: 'CRON_SECRET non configuré.' })
  }

  const auth = getHeader(event, 'authorization') ?? ''
  if (!egaliteSure(auth, `Bearer ${secret}`)) {
    throw createError({ statusCode: 401, message: 'Non autorisé.' })
  }

  // seed.sql is a multi-statement script wrapped in BEGIN/COMMIT; sent without
  // parameters it runs through the simple query protocol as one transaction.
  await query(seedSql)
  console.log('[cron] Demo data reseeded')
  return { status: 'ok' }
})
