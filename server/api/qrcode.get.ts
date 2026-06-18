/**
 * server/api/qrcode.get.ts — GET /api/qrcode
 *
 * Returns the QR code (as inline SVG) for the logged-in commerce's public review
 * URL, plus that URL and the commerce name. Protected (session required).
 *
 * Auto-imported: defineEventHandler, getRequestURL, createError, query,
 * requireSession.
 */
import QRCode from 'qrcode'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)

  const res = await query<{ nom: string; slug: string }>(
    'SELECT nom, slug FROM commerces WHERE id = $1',
    [session.commerceId],
  )
  const commerce = res.rows[0]
  if (!commerce) throw createError({ statusCode: 404, message: 'Commerce introuvable.' })

  // Public review URL customers reach by scanning. The origin comes from the
  // request, so it's localhost in dev and the deployed domain in production.
  const url = `${getRequestURL(event).origin}/avis/${commerce.slug}`

  // Generate an SVG (crisp at any print size), in the brand ink colour.
  const svg = await QRCode.toString(url, {
    type: 'svg',
    margin: 1,
    color: { dark: '#1a1a1a', light: '#ffffff' },
  })

  return { nom: commerce.nom, slug: commerce.slug, url, svg }
})
