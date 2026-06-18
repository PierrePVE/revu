/**
 * server/api/auth/demo.post.ts — POST /api/auth/demo
 *
 * One-click login as the demo commerce (no credentials), so visitors can
 * explore the dashboard. Intended for the public demo only — remove before a
 * real launch if you don't want an open demo account.
 *
 * Auto-imported: defineEventHandler, createError, setCookie, query,
 * signerSession, COOKIE_SESSION, DUREE_SESSION.
 */
const DEMO_SLUG = 'brasserie-du-centre'

export default defineEventHandler(async (event) => {
  const res = await query<{ id: string; nom: string; slug: string }>(
    'SELECT id, nom, slug FROM commerces WHERE slug = $1',
    [DEMO_SLUG],
  )
  const commerce = res.rows[0]
  if (!commerce) {
    throw createError({ statusCode: 404, message: 'Commerce de démo introuvable.' })
  }

  const token = await signerSession({ commerceId: commerce.id, slug: commerce.slug })
  setCookie(event, COOKIE_SESSION, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: DUREE_SESSION,
  })

  return { commerce: { nom: commerce.nom, slug: commerce.slug } }
})
