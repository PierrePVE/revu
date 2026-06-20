/**
 * server/api/compte/password.post.ts — POST /api/compte/password
 *
 * Lets the LOGGED-IN merchant change their own password. Body:
 * { ancienMotDePasse, nouveauMotDePasse }.
 *
 * Security: re-authenticates with the current password before allowing the
 * change (so a hijacked-but-idle session, or someone on an unlocked device,
 * can't silently swap the password). Only the session's own row is touched.
 *
 * Auto-imported: defineEventHandler, readBody, createError, query,
 * requireSession, verifierMotDePasse, hasherMotDePasse.
 */
interface ChangerMdpBody {
  ancienMotDePasse?: string
  nouveauMotDePasse?: string
}

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)

  const body = await readBody<ChangerMdpBody>(event)
  const ancien = typeof body?.ancienMotDePasse === 'string' ? body.ancienMotDePasse : ''
  const nouveau = typeof body?.nouveauMotDePasse === 'string' ? body.nouveauMotDePasse : ''

  if (!ancien || !nouveau) {
    throw createError({ statusCode: 400, message: 'Ancien et nouveau mot de passe requis.' })
  }
  if (nouveau.length < 8) {
    throw createError({ statusCode: 400, message: 'Mot de passe trop court (8 caractères minimum).' })
  }

  // Load the current hash to verify the old password.
  const res = await query<{ password_hash: string }>(
    'SELECT password_hash FROM commerces WHERE id = $1',
    [session.commerceId],
  )
  const commerce = res.rows[0]
  if (!commerce) {
    throw createError({ statusCode: 401, message: 'Session invalide.' })
  }

  const ancienValide = await verifierMotDePasse(ancien, commerce.password_hash)
  if (!ancienValide) {
    throw createError({ statusCode: 403, message: 'Mot de passe actuel incorrect.' })
  }

  const nouveauHash = await hasherMotDePasse(nouveau)
  await query('UPDATE commerces SET password_hash = $1 WHERE id = $2', [nouveauHash, session.commerceId])

  return { success: true }
})
