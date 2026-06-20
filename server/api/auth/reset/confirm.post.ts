/**
 * server/api/auth/reset/confirm.post.ts — POST /api/auth/reset/confirm
 *
 * Step 2 of the "forgot password" flow. Body: { token, password }.
 *
 * Looks the token up by its SHA-256 hash, checks it's unused and not expired,
 * stores the new (hashed) password, then marks the token used so the link can't
 * be replayed.
 *
 * Auto-imported: defineEventHandler, readBody, createError, query,
 * hasherMotDePasse.
 */
import { createHash } from 'node:crypto'

interface ConfirmBody {
  token?: string
  password?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<ConfirmBody>(event)
  const token = body?.token ?? ''
  const password = body?.password ?? ''

  if (!token || !password) {
    throw createError({ statusCode: 400, message: 'Lien et mot de passe requis.' })
  }
  if (password.length < 8) {
    throw createError({ statusCode: 400, message: 'Mot de passe trop court (8 caractères minimum).' })
  }

  // Look up by hash — the raw token is never stored, so we hash to compare.
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const res = await query<{ id: string; commerce_id: string }>(
    `SELECT id, commerce_id FROM password_resets
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()`,
    [tokenHash],
  )
  const reset = res.rows[0]
  if (!reset) {
    throw createError({ statusCode: 400, message: 'Lien invalide ou expiré. Refaites une demande.' })
  }

  const motDePasseHashe = await hasherMotDePasse(password)
  // Set the new password, then burn the token so it can't be reused.
  await query('UPDATE commerces SET password_hash = $1 WHERE id = $2', [motDePasseHashe, reset.commerce_id])
  await query('UPDATE password_resets SET used_at = NOW() WHERE id = $1', [reset.id])

  return { success: true }
})
