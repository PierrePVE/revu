/**
 * server/api/auth/me.get.ts — GET /api/auth/me
 * Returns the currently logged-in commerce ({ id, nom, email, slug, role }), or
 * 401 when the request carries no valid session. Used by the page guards and by
 * the "Mon compte" page to prefill the profile form.
 */
export default defineEventHandler(async (event) => {
  const session = await verifierSession(getCookie(event, COOKIE_SESSION))
  if (!session) throw createError({ statusCode: 401, message: 'Non authentifié.' })

  const res = await query<{ id: string; nom: string; email: string; slug: string }>(
    'SELECT id, nom, email, slug FROM commerces WHERE id = $1',
    [session.commerceId],
  )
  const commerce = res.rows[0]
  if (!commerce) throw createError({ statusCode: 401, message: 'Session invalide.' })

  return { ...commerce, role: session.role }
})
