/**
 * server/api/commerces/[slug].get.ts — GET /api/commerces/:slug
 *
 * Public lookup used by the review form to display the business name. Returns
 * { id, nom, slug }, or HTTP 404 when no commerce matches the slug.
 *
 * `defineEventHandler`, `getRouterParam`, `createError` and `query`
 * (server/utils/db.ts) are auto-imported by Nitro.
 */
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, message: 'Slug manquant' })
  }

  // Parameterized query ($1) — never interpolate the slug into the SQL string.
  const result = await query<{ id: string; nom: string; slug: string }>(
    'SELECT id, nom, slug FROM commerces WHERE slug = $1',
    [slug],
  )

  const commerce = result.rows[0]
  if (!commerce) {
    throw createError({ statusCode: 404, message: 'Commerce introuvable' })
  }

  return commerce
})
