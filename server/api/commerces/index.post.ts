/**
 * server/api/commerces/index.post.ts — POST /api/commerces
 *
 * Admin-only. Creates a merchant. Body: { nom, email, slug, password }.
 * The password is hashed (bcrypt) and never returned to the client.
 *
 * Auto-imported: defineEventHandler, readBody, createError, query,
 * hasherMotDePasse, requireAdmin.
 */
interface CreerCommercantBody {
  nom: string
  email: string
  slug: string
  password: string
}
interface Commercant {
  id: string
  nom: string
  email: string
  slug: string
  role: string
  created_at: string
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody<CreerCommercantBody>(event)

  // Never trust the raw body.
  if (!body?.nom || !body?.email || !body?.slug || !body?.password) {
    throw createError({ statusCode: 400, message: 'Champs manquants.' })
  }
  if (body.password.length < 8) {
    throw createError({ statusCode: 400, message: 'Mot de passe trop court (8 caractères minimum).' })
  }

  const motDePasseHashe = await hasherMotDePasse(body.password)

  try {
    const result = await query<Commercant>(
      `INSERT INTO commerces (nom, email, slug, password_hash, role)
       VALUES ($1, $2, $3, $4, 'commercant')
       RETURNING id, nom, email, slug, role, created_at`,
      [body.nom, body.email, body.slug, motDePasseHashe],
    )
    return result.rows[0]
  } catch (err) {
    // 23505 = unique_violation (email or slug already taken) -> friendly 409.
    if ((err as { code?: string }).code === '23505') {
      throw createError({ statusCode: 409, message: 'Cet email ou ce slug est déjà utilisé.' })
    }
    throw err
  }
})
