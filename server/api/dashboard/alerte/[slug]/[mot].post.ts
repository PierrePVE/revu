/**
 * server/api/dashboard/alerte/[slug]/[mot].post.ts
 * POST /api/dashboard/alerte/:slug/:mot — mark this alert as handled.
 *
 * Records a "treated" marker (a row in `alertes` with vue = true, created_at =
 * now). The dashboard then hides the alert until a newer review mentioning the
 * word appears (the problem recurred). Auto-imports: defineEventHandler,
 * getRouterParam, createError, query, analyser, requireSession, dansFenetre.
 */
interface AvisRow {
  id: string
  note_globale: number | null
  commentaire: string | null
  created_at: string | Date
}

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const slug = getRouterParam(event, 'slug')
  const motParam = getRouterParam(event, 'mot')
  if (!slug || !motParam) throw createError({ statusCode: 400, message: 'Paramètres manquants' })
  if (slug !== session.slug) throw createError({ statusCode: 403, message: 'Accès refusé.' })
  const mot = decodeURIComponent(motParam).toLowerCase()

  // Snapshot the word's current windowed figures (alertes columns are NOT NULL).
  const { rows } = await query<AvisRow>(
    'SELECT id, note_globale, commentaire, created_at FROM avis WHERE commerce_id = $1',
    [session.commerceId],
  )
  const stats = analyser(
    dansFenetre(rows).map((r) => ({
      id: r.id,
      noteGlobale: r.note_globale,
      commentaire: r.commentaire ?? '',
    })),
  )
  const stat = stats.find((s: { mot: string; mentions: number; noteMoyenne: number }) => s.mot === mot)
  const mentions = stat?.mentions ?? 0
  const note = stat?.noteMoyenne ?? 0
  const niveau = note <= 2 ? 'critique' : 'attention'

  // Upsert the marker (latest treatment time wins) — no unique index needed.
  await query('DELETE FROM alertes WHERE commerce_id = $1 AND mot = $2', [session.commerceId, mot])
  await query(
    `INSERT INTO alertes (commerce_id, mot, mentions, note_moyenne, niveau, vue)
     VALUES ($1, $2, $3, $4, $5, true)`,
    [session.commerceId, mot, mentions, note, niveau],
  )

  return { success: true }
})
