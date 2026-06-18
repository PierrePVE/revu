/**
 * server/api/auth/login.post.ts — POST /api/auth/login
 *
 * Body: { email, password }. On success sets an httpOnly session cookie and
 * returns { commerce: { nom, slug } }. Wrong credentials → 401 with a generic
 * message (we never reveal whether the email exists).
 *
 * Auto-imported: defineEventHandler, readBody, createError, setCookie, query,
 * verifierMotDePasse, signerSession, COOKIE_SESSION, DUREE_SESSION.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!email || !password) {
    throw createError({ statusCode: 400, message: 'Email et mot de passe requis.' })
  }

  const res = await query<{ id: string; nom: string; slug: string; password_hash: string }>(
    'SELECT id, nom, slug, password_hash FROM commerces WHERE email = $1',
    [email],
  )
  const commerce = res.rows[0]

  // Always run a comparison shape that yields a generic failure, so the response
  // doesn't leak whether the email is registered.
  const motDePasseValide = commerce ? await verifierMotDePasse(password, commerce.password_hash) : false
  if (!commerce || !motDePasseValide) {
    throw createError({ statusCode: 401, message: 'Email ou mot de passe incorrect.' })
  }

  const token = await signerSession({ commerceId: commerce.id, slug: commerce.slug })
  setCookie(event, COOKIE_SESSION, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production', // HTTPS-only in production
    path: '/',
    maxAge: DUREE_SESSION,
  })

  return { commerce: { nom: commerce.nom, slug: commerce.slug } }
})
