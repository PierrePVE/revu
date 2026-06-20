/**
 * server/api/compte/index.post.ts — POST /api/compte
 *
 * Lets the LOGGED-IN merchant update their own profile. Body: { nom, email }.
 *
 * Security: the row updated is always the session's own commerce
 * (session.commerceId) — never a slug/id from the body — so a merchant can only
 * edit themselves. The slug (public review URL) is intentionally NOT editable
 * here, as changing it would break printed QR codes.
 *
 * Auto-imported: defineEventHandler, readBody, createError, query, requireSession.
 */
interface MajProfilBody {
  nom?: string
  email?: string
}

// Basic shape check — full validation is the DB's UNIQUE/NOT NULL job.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)

  const body = await readBody<MajProfilBody>(event)
  const nom = typeof body?.nom === 'string' ? body.nom.trim() : ''
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''

  if (!nom || !email) {
    throw createError({ statusCode: 400, message: 'Nom et email requis.' })
  }
  if (!EMAIL_RE.test(email)) {
    throw createError({ statusCode: 400, message: 'Adresse email invalide.' })
  }

  try {
    const result = await query<{ id: string; nom: string; email: string; slug: string }>(
      `UPDATE commerces SET nom = $1, email = $2 WHERE id = $3
       RETURNING id, nom, email, slug`,
      [nom, email, session.commerceId],
    )
    return result.rows[0]
  } catch (err) {
    // 23505 = unique_violation: the email is already used by another account.
    if ((err as { code?: string }).code === '23505') {
      throw createError({ statusCode: 409, message: 'Cet email est déjà utilisé.' })
    }
    throw err
  }
})
