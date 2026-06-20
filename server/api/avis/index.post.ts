/**
 * server/api/avis/index.post.ts — POST /api/avis
 *
 * Receives an anonymous customer review, validates it (server-side — the client
 * validates too), inserts it into PostgreSQL, and returns { success: true }.
 *
 * Expected body:
 *   {
 *     commerceId?: string,   // UUID (sent by the form)
 *     slug?: string,         // alternative to commerceId (handy for manual tests)
 *     noteGlobale: number,   // required, 1..5
 *     noteQualite?: number,  // optional, 1..5
 *     noteService?: number,  // optional, 1..5
 *     noteAttente?: number,  // optional, 1..5
 *     commentaire?: string,  // optional, <= 1000 chars
 *   }
 *
 * `defineEventHandler`, `readBody`, `createError` and `query` are auto-imported.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Validate a 1..5 integer rating.
 * @param valeur raw value from the body
 * @param champ  human label used in the error message
 * @param requis whether the field must be present
 * @returns the integer, or null when absent and not required
 */
function lireNote(valeur: unknown, champ: string, requis: boolean): number | null {
  if (valeur === null || valeur === undefined || valeur === '') {
    if (requis) throw createError({ statusCode: 400, message: `${champ} requise.` })
    return null
  }
  const n = Number(valeur)
  if (!Number.isInteger(n) || n < 1 || n > 5) {
    throw createError({ statusCode: 400, message: `${champ} invalide (1 à 5).` })
  }
  return n
}

export default defineEventHandler(async (event) => {
  // Anti-spam: cap submissions per IP so the analysis can't be poisoned by a
  // flood of fake reviews. 5 per hour is generous for a real customer but stops
  // scripted abuse. (Customers on a shared venue Wi-Fi share one IP — raise this
  // if legitimate reviews ever hit the limit.)
  rateLimit(event, { cle: 'avis', max: 5, fenetreMs: 60 * 60 * 1000 })

  const body = await readBody(event)

  // --- Resolve the commerce from a UUID or a slug, and confirm it exists ----
  let commerceId: string | undefined
  if (typeof body?.commerceId === 'string' && UUID_RE.test(body.commerceId)) {
    const r = await query<{ id: string }>('SELECT id FROM commerces WHERE id = $1', [
      body.commerceId,
    ])
    commerceId = r.rows[0]?.id
  } else if (typeof body?.slug === 'string' && body.slug.length > 0) {
    const r = await query<{ id: string }>('SELECT id FROM commerces WHERE slug = $1', [body.slug])
    commerceId = r.rows[0]?.id
  }
  if (!commerceId) {
    throw createError({ statusCode: 404, message: 'Commerce introuvable.' })
  }

  // --- Validate ratings -----------------------------------------------------
  const noteGlobale = lireNote(body?.noteGlobale, 'Note globale', true)
  const noteQualite = lireNote(body?.noteQualite, 'Note qualité', false)
  const noteService = lireNote(body?.noteService, 'Note service', false)
  const noteAttente = lireNote(body?.noteAttente, 'Note attente', false)

  // --- Validate the optional comment ---------------------------------------
  let commentaire: string | null = null
  if (typeof body?.commentaire === 'string') {
    const trimmed = body.commentaire.trim()
    if (trimmed.length > 1000) {
      throw createError({ statusCode: 400, message: 'Commentaire trop long (max 1000).' })
    }
    commentaire = trimmed.length > 0 ? trimmed : null
  }

  // --- Insert ---------------------------------------------------------------
  await query(
    `INSERT INTO avis (commerce_id, note_globale, note_qualite, note_service, note_attente, commentaire)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [commerceId, noteGlobale, noteQualite, noteService, noteAttente, commentaire],
  )

  return { success: true }
})
