/**
 * server/api/commerces/[slug]/index.delete.ts
 * DELETE /api/commerces/:slug
 *
 * Admin-only. Deletes a merchant. The schema's ON DELETE CASCADE on
 * avis.commerce_id and alertes.commerce_id removes its reviews and alert markers
 * automatically, so a single DELETE is enough (no manual cleanup / transaction).
 * Admin accounts are protected from deletion.
 *
 * Auto-imported: defineEventHandler, getRouterParam, createError, query,
 * requireAdmin.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, message: 'Slug manquant.' })
  }

  // `role <> 'admin'` makes sure an admin account can't be deleted by mistake.
  const result = await query<{ id: string }>(
    "DELETE FROM commerces WHERE slug = $1 AND role <> 'admin' RETURNING id",
    [slug],
  )
  if (!result.rows[0]) {
    throw createError({ statusCode: 404, message: 'Commerce introuvable (ou compte admin protégé).' })
  }

  return { success: true }
})
