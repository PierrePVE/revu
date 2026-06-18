/**
 * server/utils/alertes.ts — alert lifecycle helpers.
 *
 * Alerts (and keyword stats) are analysed over a ROLLING WINDOW, so a problem
 * that was fixed ages out on its own. A "treated" marker (a row in the `alertes`
 * table with vue = true) hides an alert until a *newer* matching review appears
 * — i.e. the problem recurred. `query` is auto-imported by Nitro.
 */

/** How far back alerts and keyword stats look. */
export const FENETRE_ALERTES_JOURS = 30

/** Keep only rows within the alert window (last FENETRE_ALERTES_JOURS days). */
export function dansFenetre<T extends { created_at: string | Date }>(rows: T[], now = Date.now()): T[] {
  const debut = now - FENETRE_ALERTES_JOURS * 24 * 60 * 60 * 1000
  return rows.filter((r) => new Date(r.created_at).getTime() >= debut)
}

/** Map of "word -> moment it was marked treated (ms)" for a commerce. */
export async function motsTraites(commerceId: string): Promise<Map<string, number>> {
  const res = await query<{ mot: string; created_at: string | Date }>(
    'SELECT mot, created_at FROM alertes WHERE commerce_id = $1 AND vue = true',
    [commerceId],
  )
  return new Map(res.rows.map((r) => [r.mot, new Date(r.created_at).getTime()]))
}

/** Most recent review date (ms) among `rows` whose id is in `avisIds`. */
export function dernierAvis(
  avisIds: string[],
  rows: { id: string; created_at: string | Date }[],
): number {
  const ids = new Set(avisIds)
  let max = 0
  for (const r of rows) {
    if (ids.has(r.id)) max = Math.max(max, new Date(r.created_at).getTime())
  }
  return max
}

/**
 * Whether a word's alert is currently hidden: it was marked treated AND no newer
 * matching review has come in since that moment.
 */
export function estTraitee(
  mot: string,
  avisIds: string[],
  rows: { id: string; created_at: string | Date }[],
  traites: Map<string, number>,
): boolean {
  const traiteLe = traites.get(mot)
  if (traiteLe === undefined) return false
  return dernierAvis(avisIds, rows) <= traiteLe
}
