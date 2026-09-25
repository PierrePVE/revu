/**
 * server/utils/rateLimit.ts — simple per-IP rate limiting.
 *
 * Fixed-window counter stored in PostgreSQL (table `rate_limits`): for each
 * (key, IP) pair we count requests inside a time window and throw HTTP 429 once
 * the limit is exceeded. Auto-imported into server routes by Nitro.
 *
 * Why the database and not memory: on serverless hosting (Vercel) every
 * instance has its own memory and may be recycled at any time, so an in-process
 * counter would be trivially bypassed. The database is the one store all
 * instances share, and the traffic here is low enough that one extra
 * round-trip per protected request is negligible.
 */
import type { H3Event } from 'h3'

/** Options for {@link rateLimit}. */
export interface RateLimitOptions {
  /** Logical bucket name, e.g. 'avis' or 'login' (keeps limits independent). */
  cle: string
  /** Maximum number of requests allowed inside the window. */
  max: number
  /** Window length in milliseconds. */
  fenetreMs: number
}

// Expired rows are swept on roughly 1 request in 100 rather than by a cron job
// (none on the hobby setup); that's enough to keep the table small.
const PROBA_NETTOYAGE = 0.01

/**
 * Enforce a per-IP rate limit. Await it at the very top of a route handler;
 * throws HTTP 429 (with a Retry-After header) once the caller exceeds `max`
 * requests within `fenetreMs`.
 *
 * Fails open: if the database is unreachable the request is let through (and
 * the error logged), since blocking every user is worse than a brief lapse in
 * rate limiting — the route itself will fail anyway if it needs the database.
 *
 * @param event   - the H3 request event.
 * @param options - bucket name, max requests and window length.
 * @returns       Resolves when the request is allowed.
 */
export async function rateLimit(event: H3Event, options: RateLimitOptions): Promise<void> {
  // Trust X-Forwarded-For: behind Vercel's proxy (or a self-hosted reverse
  // proxy) the socket address is the proxy's, not the client's.
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'inconnu'
  const cleComplete = `${options.cle}:${ip}`

  let resultat: { count: number; retry_after: number } | undefined
  try {
    // Single atomic upsert so concurrent requests from several instances can't
    // race: a missing or expired row (re)starts the window at 1, otherwise the
    // counter is incremented. Time is taken from the DB clock (NOW()) so all
    // instances agree on window boundaries.
    const res = await query<{ count: number; retry_after: number }>(
      `INSERT INTO rate_limits (cle, count, reset_at)
       VALUES ($1, 1, NOW() + $2 * INTERVAL '1 millisecond')
       ON CONFLICT (cle) DO UPDATE SET
         count    = CASE WHEN rate_limits.reset_at <= NOW() THEN 1
                         ELSE rate_limits.count + 1 END,
         reset_at = CASE WHEN rate_limits.reset_at <= NOW() THEN EXCLUDED.reset_at
                         ELSE rate_limits.reset_at END
       RETURNING count,
                 GREATEST(CEIL(EXTRACT(EPOCH FROM reset_at - NOW())), 1)::int AS retry_after`,
      [cleComplete, options.fenetreMs],
    )
    resultat = res.rows[0]

    if (Math.random() < PROBA_NETTOYAGE) {
      await query('DELETE FROM rate_limits WHERE reset_at <= NOW()')
    }
  } catch (err) {
    console.error('[rateLimit] Counter unavailable, letting request through:', err)
    return
  }

  if (resultat && resultat.count > options.max) {
    // h3 types the Retry-After header value as a number (seconds).
    setResponseHeader(event, 'Retry-After', resultat.retry_after)
    throw createError({
      statusCode: 429,
      message: 'Trop de requêtes. Réessayez dans quelques minutes.',
    })
  }
}
