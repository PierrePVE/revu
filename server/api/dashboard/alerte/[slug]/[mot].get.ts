/**
 * server/api/dashboard/alerte/[slug]/[mot].get.ts
 * GET /api/dashboard/alerte/:slug/:mot
 *
 * Returns every review of :slug whose comment mentions :mot, reusing the
 * analyser's grouping so "steak" also matches "steaks". Powers the alert-detail
 * screen. Auto-imports: defineEventHandler, getRouterParam, createError, query,
 * analyser.
 */

interface AvisRow {
  id: string
  note_globale: number | null
  commentaire: string | null
  created_at: string | Date
}

/** Human-friendly relative date in French (e.g. "Il y a 3 jours"). */
function ilYA(date: string | Date, now: number): string {
  const jours = Math.floor((now - new Date(date).getTime()) / 86_400_000)
  if (jours <= 0) return "Aujourd'hui"
  if (jours === 1) return 'Il y a 1 jour'
  return `Il y a ${jours} jours`
}

export default defineEventHandler(async (event) => {
  // Protected: a merchant may only read their OWN alerts (server-enforced).
  const session = await requireSession(event)
  const slug = getRouterParam(event, 'slug')
  const motParam = getRouterParam(event, 'mot')
  if (!slug || !motParam) throw createError({ statusCode: 400, message: 'Paramètres manquants' })
  if (slug !== session.slug) throw createError({ statusCode: 403, message: 'Accès refusé.' })

  // The analyser lowercases + strips accents, so normalise the lookup the same way.
  const mot = decodeURIComponent(motParam).toLowerCase()

  const commerceRes = await query<{ id: string }>('SELECT id FROM commerces WHERE slug = $1', [slug])
  const commerce = commerceRes.rows[0]
  if (!commerce) throw createError({ statusCode: 404, message: 'Commerce introuvable' })

  const { rows } = await query<AvisRow>(
    `SELECT id, note_globale, commentaire, created_at
       FROM avis
      WHERE commerce_id = $1
      ORDER BY created_at DESC`,
    [commerce.id],
  )

  // Recompute keyword stats to find which reviews contain this word (same
  // grouping as the dashboard) and its aggregate mentions / average rating.
  const stats = analyser(
    rows.map((r) => ({ id: r.id, noteGlobale: r.note_globale, commentaire: r.commentaire ?? '' })),
  )
  const stat = stats.find((s: { mot: string }) => s.mot === mot)

  if (!stat) {
    // Unknown word (or seen in fewer than 2 reviews): nothing to show.
    return { mot, mentions: 0, noteMoyenne: 0, pourcentageCetteSemaine: 0, commentaires: [] }
  }

  const ids = new Set<string>(stat.avisIds)
  const concernes = rows.filter((r) => ids.has(r.id)) // already sorted DESC by date

  const now = Date.now()
  const SEMAINE = 7 * 24 * 60 * 60 * 1000
  const cetteSemaine = concernes.filter((r) => now - new Date(r.created_at).getTime() <= SEMAINE).length

  return {
    mot: stat.mot,
    mentions: stat.mentions,
    noteMoyenne: stat.noteMoyenne,
    pourcentageCetteSemaine: stat.mentions ? Math.round((cetteSemaine / stat.mentions) * 100) : 0,
    commentaires: concernes.map((r) => ({
      note: r.note_globale,
      texte: r.commentaire,
      date: ilYA(r.created_at, now),
    })),
  }
})
