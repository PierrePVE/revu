/**
 * server/api/auth/me.get.ts — GET /api/auth/me
 * Returns the currently logged-in commerce ({ id, nom, slug }), or 401 when the
 * request carries no valid session. Used by the dashboard guard (next step).
 */
export default defineEventHandler(async (event) => {
  const session = await verifierSession(getCookie(event, COOKIE_SESSION))
  if (!session) throw createError({ statusCode: 401, message: 'Non authentifié.' })

  const res = await query<{ id: string; nom: string; slug: string }>(
    'SELECT id, nom, slug FROM commerces WHERE id = $1',
    [session.commerceId],
  )
  const commerce = res.rows[0]
  if (!commerce) throw createError({ statusCode: 401, message: 'Session invalide.' })

  return { ...commerce, role: session.role }
})
