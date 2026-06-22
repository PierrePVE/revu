/**
 * server/api/dashboard/[slug].get.ts — GET /api/dashboard/:slug
 *
 * Single endpoint feeding the merchant dashboard. It:
 *   1. loads every review of the commerce from PostgreSQL,
 *   2. runs them through server/utils/analyser.js (keyword stats + alerts),
 *   3. computes global/category averages, best & worst category and a 4-week trend.
 *
 * `defineEventHandler`, `getRouterParam`, `createError`, `query`, `analyser` and
 * `genererAlertes` are auto-imported by Nitro.
 */

interface AvisRow {
  id: string
  note_globale: number | null
  note_qualite: number | null
  note_service: number | null
  note_attente: number | null
  commentaire: string | null
  created_at: string | Date
}

/** Round to one decimal (e.g. 4.06 -> 4.1). */
const round1 = (n: number) => Math.round(n * 10) / 10
/** Arithmetic mean, 0 for an empty list. */
const moyenne = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

export default defineEventHandler(async (event) => {
  // Protected: a merchant may only read their OWN dashboard (server-enforced).
  const session = await requireSession(event)
  const slug = getRouterParam(event, 'slug')
  if (!slug) throw createError({ statusCode: 400, message: 'Slug manquant' })
  if (slug !== session.slug) throw createError({ statusCode: 403, message: 'Accès refusé.' })

  // 1) Commerce -------------------------------------------------------------
  const commerceRes = await query<{ id: string; nom: string; slug: string }>(
    'SELECT id, nom, slug FROM commerces WHERE slug = $1',
    [slug],
  )
  const commerce = commerceRes.rows[0]
  if (!commerce) throw createError({ statusCode: 404, message: 'Commerce introuvable' })

  // 2) Every review of this commerce ---------------------------------------
  const { rows } = await query<AvisRow>(
    `SELECT id, note_globale, note_qualite, note_service, note_attente, commentaire, created_at
       FROM avis
      WHERE commerce_id = $1
      ORDER BY created_at ASC`,
    [commerce.id],
  )
  const totalAvis = rows.length

  // Period the merchant is focusing on (drives note / count / categories / keywords).
  const periode = lirePeriode(getQuery(event).periode)
  const rowsPeriode = filtrerPeriode(rows, periode)
  const avisPeriode = rowsPeriode.length

  // 3a) Keyword stats over the SELECTED period (top 8 most mentioned).
  // Drop reviews without a global rating (column is nullable) before averaging.
  const statsPeriode = analyser(
    rowsPeriode
      .filter((r): r is AvisRow & { note_globale: number } => r.note_globale !== null)
      .map((r) => ({ id: r.id, noteGlobale: r.note_globale, commentaire: r.commentaire ?? '' })),
  )
  const motsCles = statsPeriode
    .slice(0, 8)
    .map((s: { mot: string; mentions: number; noteMoyenne: number; tendance: string }) => ({
      mot: s.mot,
      mentions: s.mentions,
      noteMoyenne: s.noteMoyenne,
      tendance: s.tendance,
    }))

  // 3b) Alerts over a FIXED rolling 30-day window (operational, independent of the
  //     selected period); handled alerts stay hidden until a newer review recurs.
  const rowsFenetre = dansFenetre(rows)
  const statsAlertes = analyser(
    rowsFenetre
      .filter((r): r is AvisRow & { note_globale: number } => r.note_globale !== null)
      .map((r) => ({ id: r.id, noteGlobale: r.note_globale, commentaire: r.commentaire ?? '' })),
  )
  const traites = await motsTraites(commerce.id)
  const alertes = genererAlertes(statsAlertes).filter(
    (a: { mot: string }) =>
      !estTraitee(
        a.mot,
        statsAlertes.find((s: { mot: string; avisIds: string[] }) => s.mot === a.mot)?.avisIds ?? [],
        rowsFenetre,
        traites,
      ),
  )

  // 4) Aggregates over the SELECTED period -----------------------------------
  const globales = rowsPeriode
    .map((r) => r.note_globale)
    .filter((n): n is number => typeof n === 'number')
  const noteMoyenne = round1(moyenne(globales))

  // Average of a category column, ignoring rows that didn't rate it (NULL).
  const moyenneCategorie = (col: 'note_qualite' | 'note_service' | 'note_attente') => {
    const vals = rowsPeriode.map((r) => r[col]).filter((n): n is number => typeof n === 'number')
    return round1(moyenne(vals))
  }
  const categories = {
    qualite: moyenneCategorie('note_qualite'),
    service: moyenneCategorie('note_service'),
    attente: moyenneCategorie('note_attente'),
  }

  // Best / worst category, ignoring categories that have no ratings yet (note 0).
  const notees = [
    { label: 'Qualité', note: categories.qualite },
    { label: 'Service', note: categories.service },
    { label: 'Attente', note: categories.attente },
  ].filter((c) => c.note > 0)
  const meilleure = notees.length ? notees.reduce((a, b) => (b.note > a.note ? b : a)) : null
  const aAmeliorer = notees.length ? notees.reduce((a, b) => (b.note < a.note ? b : a)) : null

  // 4-week trend: bucket reviews by week, oldest "Sem. 1" → current "Sem. 4".
  const SEMAINE = 7 * 24 * 60 * 60 * 1000
  const now = Date.now()
  const evolution = [] as { semaine: string; note: number }[]
  for (let i = 3; i >= 0; i--) {
    const debut = now - (i + 1) * SEMAINE
    const fin = now - i * SEMAINE
    const notes = rows
      .filter((r) => {
        const t = new Date(r.created_at).getTime()
        return t >= debut && t < fin && typeof r.note_globale === 'number'
      })
      .map((r) => r.note_globale as number)
    evolution.push({ semaine: `Sem. ${4 - i}`, note: round1(moyenne(notes)) })
  }

  return {
    commerce: { nom: commerce.nom, slug: commerce.slug },
    periode,
    stats: { noteMoyenne, totalAvis, avisPeriode, categories, meilleure, aAmeliorer, evolution },
    motsCles,
    alertes,
  }
})
