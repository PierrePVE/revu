/**
 * server/utils/rateLimit.ts — simple per-IP rate limiting.
 *
 * Fixed-window counter kept in memory: for each (key, IP) pair we count requests
 * inside a time window and throw HTTP 429 once the limit is exceeded. Auto-imported
 * into server routes by Nitro.
 *
 * NOTE: the store is in-process. It resets on server restart and is NOT shared
 * across multiple instances — fine for a single-node deployment (the current
 * setup). Moving to several instances would require a shared store (e.g. Redis).
 */
import type { H3Event } from 'h3'

/** One IP's counter for a given window. */
interface Bucket {
  count: number
  /** Epoch ms at which the window resets. */
  resetAt: number
}

// key = `${cle}:${ip}` -> bucket. Lives for the process lifetime.
const buckets = new Map<string, Bucket>()

// Expired entries are swept opportunistically, at most once per minute, so the
// Map doesn't grow unbounded as new IPs appear.
let dernierNettoyage = Date.now()
function nettoyer(maintenant: number): void {
  if (maintenant - dernierNettoyage < 60_000) return
  dernierNettoyage = maintenant
  for (const [cle, bucket] of buckets) {
    if (bucket.resetAt <= maintenant) buckets.delete(cle)
  }
}

/** Options for {@link rateLimit}. */
export interface RateLimitOptions {
  /** Logical bucket name, e.g. 'avis' or 'login' (keeps limits independent). */
  cle: string
  /** Maximum number of requests allowed inside the window. */
  max: number
  /** Window length in milliseconds. */
  fenetreMs: number
}

/**
 * Enforce a per-IP rate limit. Call at the very top of a route handler; throws
 * HTTP 429 (with a Retry-After header) once the caller exceeds `max` requests
 * within `fenetreMs`.
 *
 * @param event   - the H3 request event.
 * @param options - bucket name, max requests and window length.
 */
export function rateLimit(event: H3Event, options: RateLimitOptions): void {
  // Trust X-Forwarded-For so it works behind a reverse proxy (self-host / prod).
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'inconnu'
  const cleComplete = `${options.cle}:${ip}`
  const maintenant = Date.now()
  nettoyer(maintenant)

  let bucket = buckets.get(cleComplete)
  // Start a fresh window when none exists or the previous one has elapsed.
  if (!bucket || bucket.resetAt <= maintenant) {
    bucket = { count: 0, resetAt: maintenant + options.fenetreMs }
    buckets.set(cleComplete, bucket)
  }

  bucket.count++
  if (bucket.count > options.max) {
    // h3 types the Retry-After header value as a number (seconds).
    const retryAfter = Math.ceil((bucket.resetAt - maintenant) / 1000)
    setResponseHeader(event, 'Retry-After', retryAfter)
    throw createError({
      statusCode: 429,
      message: 'Trop de requêtes. Réessayez dans quelques minutes.',
    })
  }
}
