/**
 * server/api/auth/reset/request.post.ts — POST /api/auth/reset/request
 *
 * Step 1 of the self-service "forgot password" flow. Body: { email }.
 *
 * Generates a random reset token, stores ONLY its SHA-256 hash (so a database
 * leak can't be turned into account takeovers) with a 1-hour expiry, then emails
 * the merchant a link carrying the raw token.
 *
 * Anti-enumeration: the response is always the same whether or not the email
 * matches an account, so the endpoint can't be used to probe who has one.
 *
 * Auto-imported: defineEventHandler, readBody, createError, getRequestURL,
 * query, estMailConfigure, envoyerEmail.
 */
import { createHash, randomBytes } from 'node:crypto'

/** Reset links stay valid for one hour. */
const DUREE_VALIDITE_MS = 60 * 60 * 1000

interface DemandeBody {
  email?: string
}

export default defineEventHandler(async (event) => {
  // Anti-abuse: don't let anyone spam reset emails. 3 requests per IP / hour.
  rateLimit(event, { cle: 'reset', max: 3, fenetreMs: 60 * 60 * 1000 })

  const body = await readBody<DemandeBody>(event)
  const email = body?.email?.trim().toLowerCase() ?? ''
  if (!email) {
    throw createError({ statusCode: 400, message: 'Email requis.' })
  }

  const res = await query<{ id: string; nom: string; email: string }>(
    'SELECT id, nom, email FROM commerces WHERE LOWER(email) = $1',
    [email],
  )
  const commerce = res.rows[0]

  // Act only when the email matches a real account — but the response below is
  // identical either way (anti-enumeration).
  if (commerce) {
    // 32 random bytes -> the raw token travels in the link; only its hash is stored.
    const token = randomBytes(32).toString('hex')
    const tokenHash = createHash('sha256').update(token).digest('hex')
    const expiration = new Date(Date.now() + DUREE_VALIDITE_MS)

    // One active token per merchant: drop any previous (unused) request first.
    await query('DELETE FROM password_resets WHERE commerce_id = $1', [commerce.id])
    await query(
      'INSERT INTO password_resets (commerce_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [commerce.id, tokenHash, expiration],
    )

    // Same origin as the request, so it works in both local dev and production.
    const lien = `${getRequestURL(event).origin}/reset-password?token=${token}`

    if (estMailConfigure()) {
      await envoyerEmail({
        to: commerce.email,
        subject: 'Réinitialisation de votre mot de passe Revu',
        text:
          `Bonjour ${commerce.nom},\n\n` +
          `Pour choisir un nouveau mot de passe, ouvrez ce lien (valable 1 heure) :\n${lien}\n\n` +
          `Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.`,
        html: emailHtml(commerce.nom, lien),
      })
    } else {
      // No SMTP configured (local dev): log the link so the flow stays testable.
      console.log(`[reset] SMTP non configuré — lien pour ${email} : ${lien}`)
    }
  }

  return { success: true }
})

/**
 * Branded HTML body for the reset email.
 *
 * @param nom  - merchant name, for a personal greeting.
 * @param lien - the reset link (contains the raw token).
 * @returns the HTML string.
 */
function emailHtml(nom: string, lien: string): string {
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;color:#1a1a1a">
    <p style="font-size:22px;font-weight:700;color:#1d9e75;margin:0 0 16px">Revu</p>
    <p>Bonjour ${nom},</p>
    <p>Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau&nbsp;:</p>
    <p style="text-align:center;margin:28px 0">
      <a href="${lien}" style="background:#1d9e75;color:#fff;text-decoration:none;padding:12px 24px;border-radius:12px;font-weight:600;display:inline-block">
        Choisir un nouveau mot de passe
      </a>
    </p>
    <p style="font-size:13px;color:#6b7280">Ce lien est valable <strong>1 heure</strong>. Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email&nbsp;: votre mot de passe restera inchangé.</p>
  </div>`
}
