/**
 * analyser.js — Revu review-analysis engine.
 *
 * Pure Node.js (zero external dependencies). Turns a batch of customer reviews
 * into per-word statistics and actionable alerts so a local business owner can
 * spot recurring problems (a dish, the waiting time, the welcome...) at a glance.
 *
 * Authored as an ES module so it imports cleanly into the Nitro server while
 * staying runnable on its own. Public API:
 *   - nettoyer(texte)       -> string[]   normalize + tokenize a French comment
 *   - analyser(avis)        -> object[]   per-word stats sorted by mentions desc
 *   - genererAlertes(stats) -> object[]   alerts triggered from those stats
 *
 * Run the built-in test suite with: node analyser.js
 */

// ---------------------------------------------------------------------------
// Stopwords
// ---------------------------------------------------------------------------

/**
 * Raw French stopword list (as provided by the product spec).
 * Kept verbatim so it stays easy to audit/extend; it is normalized once below.
 */
const STOPWORDS_BRUTS = [
  'le', 'la', 'les', 'un', 'une', 'des', 'est', 'très', 'avec', 'que', 'qui',
  'dans', 'sur', 'pour', 'par', 'pas', 'plus', 'bien', 'mais', 'aussi', 'tout',
  'cette', 'mon', 'ma', 'mes', 'son', 'sa', 'ses', 'été', 'avoir', 'nous',
  'vous', 'ils', 'elles', 'leur', 'leurs', 'comme', 'fait', 'cest', 'etait',
  'avait', 'avoir', 'trop', 'donc', 'alors', 'après', 'avant',
  // Common filler / intensifier adverbs and function words (non-actionable noise).
  'beaucoup', 'vraiment', 'encore', 'tellement', 'totalement', 'complètement',
  'absolument', 'plutôt', 'assez', 'sans', 'sont', 'être', 'cela', 'toujours', 'jamais',
];

/**
 * Remove diacritics from a string via NFD decomposition.
 *
 * NFD splits an accented character into base letter + combining mark, then we
 * strip the combining marks (U+0300–U+036F). This keeps comparisons stable so
 * "qualité" and "qualite" are treated as the same token.
 *
 * @param {string} texte - input string (any case).
 * @returns {string} the string without accents/diacritics.
 */
function retirerAccents(texte) {
  return texte.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Stopword set, normalized exactly like review text (lowercase, no accents).
 *
 * Why normalize here: incoming words are accent-stripped before lookup, so the
 * set must be too — otherwise "très" (stored with accent) would never match the
 * cleaned token "tres".
 */
const STOPWORDS = new Set(
  STOPWORDS_BRUTS.map((mot) => retirerAccents(mot.toLowerCase()))
);

// ---------------------------------------------------------------------------
// 1. nettoyer(texte)
// ---------------------------------------------------------------------------

/**
 * Normalize and tokenize a free-form French comment into significant words.
 *
 * Pipeline: lowercase -> strip accents -> replace every non-alphanumeric run by
 * a space (this also splits French elisions like "l'accueil" -> "accueil") ->
 * tokenize on whitespace -> drop tokens shorter than 4 chars and stopwords.
 *
 * @param {string} texte - the raw comment.
 * @returns {string[]} cleaned, lowercased, accent-free significant words.
 */
function nettoyer(texte) {
  // Guard against missing/non-string comments rather than throwing.
  if (typeof texte !== 'string') return [];

  return retirerAccents(texte.toLowerCase())
    .replace(/[^a-z0-9]+/g, ' ') // punctuation & apostrophes become separators
    .split(/\s+/)
    .filter(Boolean) // drop empty tokens from leading/trailing spaces
    .filter((mot) => mot.length >= 4) // ignore words shorter than 4 chars
    .filter((mot) => !STOPWORDS.has(mot)); // ignore stopwords
}

// ---------------------------------------------------------------------------
// 2. analyser(avis)
// ---------------------------------------------------------------------------

/**
 * Collapse simple French plurals onto their singular root ("steaks" -> "steak").
 *
 * We only strip a trailing "s" when the remaining root keeps at least 4 chars.
 * This avoids mangling short tokens and prevents accidentally collapsing
 * unrelated words; it is intentionally lightweight (no real stemmer needed).
 *
 * @param {string} mot - a cleaned token.
 * @returns {string} the canonical (singular) form used as grouping key.
 */
function regrouperVariante(mot) {
  if (mot.length >= 5 && mot.endsWith('s')) return mot.slice(0, -1);
  return mot;
}

/**
 * Round to a single decimal place (e.g. 1.6667 -> 1.7).
 * @param {number} n
 * @returns {number}
 */
function arrondi1(n) {
  return Math.round(n * 10) / 10;
}

/**
 * Classify an average global rating into a sentiment trend.
 *
 * @param {number} noteMoyenne - average global rating (1..5).
 * @returns {'positif'|'négatif'|'neutre'}
 */
function tendancePour(noteMoyenne) {
  if (noteMoyenne >= 3.5) return 'positif';
  if (noteMoyenne <= 2.5) return 'négatif';
  return 'neutre';
}

/**
 * Aggregate a batch of reviews into per-word statistics.
 *
 * For every significant word we count how many distinct reviews mention it and
 * average those reviews' global ratings. A word counts once per review even if
 * it appears several times in the same comment, because the average is computed
 * over reviews (noteGlobale is a per-review value, not a per-occurrence one).
 *
 * @param {Array<{id:string, noteGlobale:number, categories?:object,
 *   commentaire:string, date?:string}>} avis - the reviews to analyse.
 * @returns {Array<{mot:string, mentions:number, noteMoyenne:number,
 *   tendance:string, avisIds:string[]}>} stats sorted by mentions descending.
 */
function analyser(avis) {
  if (!Array.isArray(avis)) return [];

  // canonical word -> aggregated data across all reviews.
  const motsMap = new Map();

  for (const a of avis) {
    if (!a || typeof a.noteGlobale !== 'number') continue;

    const mots = nettoyer(a.commentaire);
    if (mots.length === 0) continue;

    // Group this review's tokens by canonical form. The Map keys also dedupe
    // repeated words so each review contributes a single count per word.
    const canonVersSurfaces = new Map();
    for (const mot of mots) {
      const canon = regrouperVariante(mot);
      if (!canonVersSurfaces.has(canon)) canonVersSurfaces.set(canon, new Set());
      canonVersSurfaces.get(canon).add(mot); // keep surface forms for display
    }

    for (const [canon, surfaces] of canonVersSurfaces) {
      let entree = motsMap.get(canon);
      if (!entree) {
        entree = { avisIds: [], sommeNotes: 0, surfaces: new Set() };
        motsMap.set(canon, entree);
      }
      entree.avisIds.push(a.id); // one review counted once for this word
      entree.sommeNotes += a.noteGlobale;
      for (const s of surfaces) entree.surfaces.add(s);
    }
  }

  const stats = [];
  for (const entree of motsMap.values()) {
    const mentions = entree.avisIds.length;
    if (mentions < 2) continue; // ignore words seen in fewer than 2 reviews

    const noteMoyenne = arrondi1(entree.sommeNotes / mentions);

    // Display the shortest surface form: usually the singular ("steak" over
    // "steaks"), while leaving genuinely-plural-looking words (e.g. "repas")
    // untouched when no shorter variant was observed.
    const mot = [...entree.surfaces].sort(
      (a, b) => a.length - b.length || a.localeCompare(b)
    )[0];

    stats.push({
      mot,
      mentions,
      noteMoyenne,
      tendance: tendancePour(noteMoyenne),
      avisIds: entree.avisIds,
    });
  }

  // Primary sort: mentions desc. Secondary (for stable, useful output): worst
  // rating first, then alphabetical.
  stats.sort(
    (a, b) =>
      b.mentions - a.mentions ||
      a.noteMoyenne - b.noteMoyenne ||
      a.mot.localeCompare(b.mot)
  );

  return stats;
}

// ---------------------------------------------------------------------------
// 3. genererAlertes(stats)
// ---------------------------------------------------------------------------

/**
 * Derive alerts from per-word statistics.
 *
 * Trigger rules:
 *   - "critique"  : mentions >= 3 AND noteMoyenne <= 2.0
 *   - "attention" : mentions >= 3 AND noteMoyenne <= 2.5
 *   - nothing is triggered when noteMoyenne > 2.5
 *
 * @param {Array<{mot:string, mentions:number, noteMoyenne:number}>} stats
 *   - the array returned by analyser().
 * @returns {Array<{mot:string, mentions:number, noteMoyenne:number,
 *   niveau:'critique'|'attention', message:string}>} triggered alerts.
 */
function genererAlertes(stats) {
  if (!Array.isArray(stats)) return [];

  const alertes = [];
  for (const s of stats) {
    // Both levels require at least 3 mentions and a poor average (<= 2.5).
    if (s.mentions < 3 || s.noteMoyenne > 2.5) continue;

    const niveau = s.noteMoyenne <= 2.0 ? 'critique' : 'attention';

    alertes.push({
      mot: s.mot,
      mentions: s.mentions,
      noteMoyenne: s.noteMoyenne,
      niveau,
      message: `"${s.mot}" mentionné dans ${s.mentions} avis · note moyenne : ${s.noteMoyenne.toFixed(
        1
      )}/5`,
    });
  }

  return alertes;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { nettoyer, analyser, genererAlertes };

// ---------------------------------------------------------------------------
// Console rendering helpers (used only by the built-in test run)
// ---------------------------------------------------------------------------

/**
 * Emoji marker for a sentiment trend, used in the stats table.
 * @param {string} tendance
 * @returns {string}
 */
function iconeTendance(tendance) {
  if (tendance === 'positif') return '✅';
  if (tendance === 'négatif') return '⚠️';
  return '😐';
}

/**
 * Pretty-print stats and alerts to the console in the expected human format.
 * @param {object[]} stats
 * @param {object[]} alertes
 */
function afficherResultats(stats, alertes) {
  console.log('=== STATS PAR MOT ===');
  for (const s of stats) {
    console.log(
      `${s.mot.padEnd(12)} | ${String(s.mentions).padStart(2)} mentions | ` +
        `note moy: ${s.noteMoyenne.toFixed(1)} | ${iconeTendance(s.tendance)} ${s.tendance}`
    );
  }

  console.log('\n=== ALERTES DÉCLENCHÉES ===');
  if (alertes.length === 0) {
    console.log('Aucune alerte déclenchée. 🎉');
    return;
  }
  for (const a of alertes) {
    const icone = a.niveau === 'critique' ? '🔴' : '🟠';
    console.log(
      `${icone} ${a.niveau.toUpperCase()} : "${a.mot}" — ${a.mentions} mentions — ` +
        `note moy: ${a.noteMoyenne.toFixed(1)}/5`
    );
  }
}

// ---------------------------------------------------------------------------
// Built-in test dataset & run (node analyser.js)
// ---------------------------------------------------------------------------

/**
 * Five fictional reviews for a restaurant. "steak" recurs and is badly rated
 * (-> critical alert), "accueil" is praised, "attente" is mixed, and the
 * "steaks"/"cuits" plurals exercise the variant-grouping logic.
 */
const AVIS_TEST = [
  {
    id: 'a1',
    noteGlobale: 1,
    categories: { qualite: 1, service: 3, attente: 2 },
    commentaire:
      "Le steak était totalement immangeable, beaucoup trop cuit. En plus, une attente interminable avant d'être servi.",
    date: '2026-06-10T19:30:00Z',
  },
  {
    id: 'a2',
    noteGlobale: 2,
    categories: { qualite: 2, service: 2, attente: 3 },
    commentaire: 'Steak trop dur, viande de mauvaise qualité. Service lent également.',
    date: '2026-06-11T20:00:00Z',
  },
  {
    id: 'a3',
    noteGlobale: 2,
    categories: { qualite: 1, service: 3, attente: 3 },
    commentaire:
      'Les steaks sont systématiquement trop cuits. Vraiment dommage pour ce restaurant.',
    date: '2026-06-12T12:45:00Z',
  },
  {
    id: 'a4',
    noteGlobale: 5,
    categories: { qualite: 5, service: 5, attente: 4 },
    commentaire:
      'Accueil au top, personnel adorable et souriant ! Petite attente mais largement supportable.',
    date: '2026-06-13T13:15:00Z',
  },
  {
    id: 'a5',
    noteGlobale: 4,
    categories: { qualite: 4, service: 5, attente: 4 },
    commentaire: 'Très bon accueil, équipe chaleureuse. On reviendra avec plaisir.',
    date: '2026-06-14T21:10:00Z',
  },
];

// Run the demo only when executed directly (node analyser.js), never when the
// module is imported (e.g. by the Nitro server). We test that the *entry* script
// is analyser.js — which stays false in any bundled/server context, unlike an
// import.meta.url comparison that breaks once Nitro inlines this module.
const estExecuteDirectement =
  !!process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('/analyser.js');
if (estExecuteDirectement) {
  const stats = analyser(AVIS_TEST);
  const alertes = genererAlertes(stats);
  afficherResultats(stats, alertes);
}
