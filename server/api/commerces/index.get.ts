/**
 * server/api/commerces/index.get.ts — GET /api/commerces
 *
 * Admin-only. Lists every commerce for the admin console. Returns the rows as-is
 * (an empty database is a valid empty list, not an error).
 *
 * Auto-imported: defineEventHandler, query, requireAdmin.
 */
interface Commercant {
  id: string
  nom: string
  email: string
  slug: string
  role: string
  created_at: string
}

export default defineEventHandler(async (event) => {
  // Server-side guard — the page middleware only hides the UI; THIS protects data.
  await requireAdmin(event)

  const result = await query<Commercant>(
    'SELECT id, nom, email, slug, role, created_at FROM commerces ORDER BY created_at DESC',
  )
  return result.rows
})
