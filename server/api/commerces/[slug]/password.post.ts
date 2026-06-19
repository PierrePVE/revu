/**
 * server/api/commerces/[slug]/password.post.ts
 * POST /api/commerces/:slug/password
 *
 * Admin-only. Resets a merchant's password (the admin then communicates it).
 * Body: { password }. The new password is hashed before being stored.
 *
 * Auto-imported: defineEventHandler, getRouterParam, readBody, createError,
 * query, hasherMotDePasse, requireAdmin.
 */
interface MajPasswordBody {
  password: string
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, message: 'Slug manquant.' })
  }

  const body = await readBody<MajPasswordBody>(event)
  if (!body?.password) {
    throw createError({ statusCode: 400, message: 'Mot de passe manquant.' })
  }
  if (body.password.length < 8) {
    throw createError({ statusCode: 400, message: 'Mot de passe trop court (8 caractères minimum).' })
  }

  const motDePasseHashe = await hasherMotDePasse(body.password)

  // Parameterized ($1, $2) — never interpolate the slug into the SQL.
  const result = await query<{ id: string }>(
    'UPDATE commerces SET password_hash = $1 WHERE slug = $2 RETURNING id',
    [motDePasseHashe, slug],
  )
  if (!result.rows[0]) {
    throw createError({ statusCode: 404, message: 'Commerce introuvable.' })
  }

  return { success: true }
})
