/**
 * server/plugins/error-logging.ts — central server error logging.
 *
 * Hooks into Nitro's `error` event so every server fault is logged once, in a
 * consistent structured line (timestamp, method, path, status, message + stack).
 * Stdout/stderr are captured by the host (Railway, Vercel…), so this is enough
 * for production triage; swap console for Sentry here later if needed.
 *
 * Expected client errors (401/403/404/429…) are skipped on purpose — only real
 * server faults (status >= 500) are logged, to keep the signal clean.
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', (error, context) => {
    const status = (error as { statusCode?: number }).statusCode ?? 500
    if (status < 500) return

    const event = context?.event
    const horodatage = new Date().toISOString()
    const methode = event?.method ?? '?'
    const chemin = event?.path ?? '?'
    const err = error as Error

    console.error(
      `[${horodatage}] ERREUR ${methode} ${chemin} -> ${status}: ${err.message}`,
      err.stack ?? '',
    )
  })
})
