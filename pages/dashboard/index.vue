<script setup lang="ts">
/**
 * pages/dashboard/index.vue — merchant dashboard (Figma screen 02).
 *
 * Will be auth-protected later; for now the commerce is selected via the
 * ?slug= query param (e.g. /dashboard?slug=brasserie-du-centre). Everything is
 * loaded in a SINGLE call to GET /api/dashboard/:slug.
 */
// Protected page — redirects to /login without a valid session.
definePageMeta({ middleware: 'auth' })

interface MotCle {
  mot: string
  mentions: number
  noteMoyenne: number
  tendance: string
}
interface Alerte {
  mot: string
  mentions: number
  noteMoyenne: number
  niveau: string
  message: string
}
interface DashboardData {
  commerce: { nom: string; slug: string }
  periode: string
  stats: {
    noteMoyenne: number
    totalAvis: number
    avisPeriode: number
    categories: { qualite: number; service: number; attente: number }
    meilleure: { label: string; note: number } | null
    aAmeliorer: { label: string; note: number } | null
    evolution: { semaine: string; note: number }[]
  }
  motsCles: MotCle[]
  alertes: Alerte[]
}

const route = useRoute()
const slug = computed(() => String(route.query.slug ?? ''))

// Period focus for note / count / categories / keywords (alerts stay 30-day).
type Periode = 'semaine' | 'mois' | 'tout'
const periode = ref<Periode>(
  ['semaine', 'tout'].includes(String(route.query.periode))
    ? (route.query.periode as Periode)
    : 'mois',
)
const periodes: { val: Periode; label: string }[] = [
  { val: 'semaine', label: 'Semaine' },
  { val: 'mois', label: 'Mois' },
  { val: 'tout', label: 'Tout' },
]

// Single API call; re-fetches when the slug or the selected period changes.
const { data, error } = await useFetch<DashboardData>(
  () => `/api/dashboard/${slug.value}?periode=${periode.value}`,
  { immediate: !!slug.value, watch: [slug, periode] },
)

useSeoMeta({
  title: () => (data.value ? `Dashboard · ${data.value.commerce.nom}` : 'Dashboard · Revu'),
})

// Current month, capitalised — e.g. "Juin 2026".
const moisCourant = computed(() => {
  const s = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date())
  return s.charAt(0).toUpperCase() + s.slice(1)
})

// Longest keyword bar = the most-mentioned word (avoid divide-by-zero).
const maxMentions = computed(() => Math.max(1, ...(data.value?.motsCles ?? []).map((m) => m.mentions)))

/** Smooth (Catmull-Rom → Bézier) SVG path through the given points. */
function pathLisse(points: { x: number; y: number }[]): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`
  let d = `M ${points[0].x},${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`
  }
  return d
}

/** SVG geometry for the 4-week evolution curve (area fill + line + points). */
const courbe = computed(() => {
  const pts = data.value?.stats.evolution ?? []
  const W = 320
  const H = 130
  const padX = 16
  const padTop = 22
  const padBottom = 26
  const innerW = W - padX * 2
  const innerH = H - padTop - padBottom
  const bottomY = padTop + innerH
  const n = pts.length
  const points = pts.map((pt, i) => ({
    x: padX + (n > 1 ? (i * innerW) / (n - 1) : innerW / 2),
    y: padTop + (1 - Math.min(Math.max(pt.note, 0), 5) / 5) * innerH,
    note: pt.note,
    semaine: pt.semaine,
  }))
  const line = pathLisse(points)
  const area = points.length
    ? `${line} L ${points[points.length - 1].x.toFixed(1)},${bottomY} L ${points[0].x.toFixed(1)},${bottomY} Z`
    : ''
  return { W, H, bottomY, points, line, area }
})

/** Progress-bar colour by sentiment: red negative, green positive, orange neutral. */
function couleurBarre(tendance: string) {
  if (tendance === 'positif') return 'bg-brand'
  if (tendance === 'négatif') return 'bg-alert'
  return 'bg-orange-400'
}

/** Link to the detail page, carrying the slug + the period to focus on.
 *  Alerts pass 'mois' (their fixed 30-day window); keywords pass the current one. */
function lienDetail(mot: string, p: Periode) {
  return `/dashboard/alerte/${encodeURIComponent(mot)}?slug=${encodeURIComponent(slug.value)}&periode=${p}`
}

/** Human label for the active period (used in KPI captions). */
const libellePeriode = computed(
  () => ({ semaine: '7 jours', mois: '30 jours', tout: 'tout' })[periode.value],
)

/** Log out (clears the session cookie) then return to the login page. */
async function seDeconnecter() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await navigateTo('/login')
}
</script>

<template>
  <main class="min-h-screen bg-surface pb-12 text-ink">
    <div class="mx-auto max-w-md lg:max-w-5xl">
      <!-- HEADER -->
      <header class="bg-brand px-5 py-5 text-white sm:mt-6 sm:rounded-2xl">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="truncate text-lg font-bold leading-tight">{{ data?.commerce.nom ?? 'Revu' }}</p>
            <p class="mt-0.5 text-xs text-white/85">Tableau de bord · {{ moisCourant }}</p>
          </div>
          <span class="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold">Revu</span>
        </div>
        <div class="mt-3 flex gap-4 text-xs text-white/90">
          <NuxtLink to="/dashboard/qrcode" class="hover:underline">Mon QR code</NuxtLink>
          <button type="button" class="hover:underline" @click="seDeconnecter">Déconnexion</button>
        </div>
      </header>

      <div class="px-5 lg:px-8">
        <!-- No slug provided -->
        <p v-if="!slug" class="mt-8 text-center text-sm text-gray-500">
          Aucun commerce spécifié. Ajoutez <code class="rounded bg-gray-100 px-1">?slug=…</code> à l'URL.
        </p>

        <!-- Commerce not found -->
        <p v-else-if="error" class="mt-8 text-center text-sm text-gray-500">Commerce introuvable.</p>

        <!-- Empty: no reviews yet -->
        <div v-else-if="data && data.stats.totalAvis === 0" class="mt-10 text-center">
          <div
            class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-light text-2xl"
          >
            📭
          </div>
          <p class="font-semibold">Pas encore d'avis</p>
          <p class="mt-1 text-sm text-gray-500">Partagez votre QR code !</p>
        </div>

        <!-- Dashboard content -->
        <template v-else-if="data">
          <!-- ALERTES (clickable red banners) -->
          <NuxtLink
            v-for="a in data.alertes"
            :key="a.mot"
            :to="lienDetail(a.mot, 'mois')"
            class="mt-5 flex items-start gap-3 rounded-xl border border-alert/20 bg-alert-bg p-4 shadow-sm transition hover:brightness-95"
          >
            <span class="text-xl leading-none">⚠️</span>
            <div class="min-w-0">
              <p class="text-sm font-semibold text-alert">
                {{ a.niveau === 'critique' ? 'Alerte critique' : 'Point de vigilance' }}
              </p>
              <p class="mt-0.5 text-xs text-gray-600">{{ a.message }}</p>
            </div>
            <span class="ml-auto self-center text-alert">›</span>
          </NuxtLink>

          <!-- Period selector — drives the figures below; alerts stay on 30 days. -->
          <div class="mt-5 flex items-center gap-2">
            <span class="text-xs text-gray-400">Période</span>
            <div class="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 text-xs shadow-sm">
              <button
                v-for="p in periodes"
                :key="p.val"
                type="button"
                class="rounded-md px-3 py-1.5 font-medium transition active:scale-[0.97]"
                :class="periode === p.val ? 'bg-brand text-white' : 'text-gray-600 hover:text-ink'"
                @click="periode = p.val"
              >
                {{ p.label }}
              </button>
            </div>
          </div>

          <!-- 4 KPI CARDS (bigger on desktop) -->
          <div class="mt-5 grid grid-cols-4 gap-2 lg:gap-4">
            <div class="rounded-xl border border-gray-200 bg-white p-3 shadow-sm lg:p-4">
              <p class="text-[11px] leading-tight text-gray-500">Note moyenne</p>
              <p class="mt-1 text-base font-bold lg:text-2xl">{{ data.stats.noteMoyenne.toFixed(1) }} ★</p>
            </div>
            <div class="rounded-xl border border-gray-200 bg-white p-3 shadow-sm lg:p-4">
              <p class="text-[11px] leading-tight text-gray-500">Avis · {{ libellePeriode }}</p>
              <p class="mt-1 text-base font-bold lg:text-2xl">{{ data.stats.avisPeriode }}</p>
            </div>
            <div class="rounded-xl bg-brand-light p-3 shadow-sm lg:p-4">
              <p class="text-[11px] leading-tight text-brand-dark/70">Meilleur</p>
              <p class="mt-1 text-xs font-bold text-brand-dark lg:text-sm">
                {{ data.stats.meilleure ? `${data.stats.meilleure.label} ${data.stats.meilleure.note.toFixed(1)} ★` : '—' }}
              </p>
            </div>
            <div class="rounded-xl bg-alert-bg p-3 shadow-sm lg:p-4">
              <p class="text-[11px] leading-tight text-alert/80">À améliorer</p>
              <p class="mt-1 text-xs font-bold text-alert lg:text-sm">
                {{ data.stats.aAmeliorer ? `${data.stats.aAmeliorer.label} ${data.stats.aAmeliorer.note.toFixed(1)} ★` : '—' }}
              </p>
            </div>
          </div>

          <!-- EVOLUTION + KEYWORDS — stacked on mobile, two panels side-by-side on desktop. -->
          <div class="lg:mt-6 lg:grid lg:grid-cols-2 lg:gap-6">
            <!-- EVOLUTION (pure-CSS bar chart, no charting lib needed for 4 bars) -->
            <section class="mt-6 lg:mt-0 lg:rounded-xl lg:border lg:border-gray-200 lg:bg-white lg:p-5 lg:shadow-sm">
              <h2 class="text-sm font-semibold">Évolution — 4 dernières semaines</h2>
              <svg
                :viewBox="`0 0 ${courbe.W} ${courbe.H}`"
                class="mt-4 w-full"
                role="img"
                aria-label="Évolution de la note moyenne sur 4 semaines"
              >
                <defs>
                  <linearGradient id="grad-evo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#1d9e75" stop-opacity="0.22" />
                    <stop offset="100%" stop-color="#1d9e75" stop-opacity="0" />
                  </linearGradient>
                </defs>
                <!-- Area under the curve. -->
                <path :d="courbe.area" fill="url(#grad-evo)" />
                <!-- The curve itself, drawn in on load. -->
                <path
                  :d="courbe.line"
                  pathLength="1"
                  fill="none"
                  stroke="#1d9e75"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="animate-draw-line"
                />
                <!-- Point markers + value/week labels. -->
                <g v-for="p in courbe.points" :key="p.semaine">
                  <circle :cx="p.x" :cy="p.y" r="3.5" fill="#ffffff" stroke="#1d9e75" stroke-width="2" />
                  <text
                    :x="p.x"
                    :y="p.y - 9"
                    text-anchor="middle"
                    font-size="9"
                    font-weight="600"
                    fill="#1a1a1a"
                  >
                    {{ p.note ? p.note.toFixed(1) : '—' }}
                  </text>
                  <text :x="p.x" :y="courbe.H - 7" text-anchor="middle" font-size="9" fill="#6b7280">
                    {{ p.semaine }}
                  </text>
                </g>
              </svg>
            </section>

            <!-- KEYWORDS -->
            <section class="mt-8 lg:mt-0 lg:rounded-xl lg:border lg:border-gray-200 lg:bg-white lg:p-5 lg:shadow-sm">
              <h2 class="text-sm font-semibold">Mots les plus mentionnés · {{ libellePeriode }}</h2>
              <div class="mt-4 flex flex-col gap-3">
                <NuxtLink
                  v-for="m in data.motsCles"
                  :key="m.mot"
                  :to="lienDetail(m.mot, periode)"
                  class="flex items-center gap-3 rounded-lg px-1 py-1 transition hover:bg-gray-50"
                >
                  <span class="w-16 shrink-0 truncate text-sm font-medium">{{ m.mot }}</span>
                  <div class="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div
                      class="h-full rounded-full animate-grow-right"
                      :class="couleurBarre(m.tendance)"
                      :style="{ width: `${(m.mentions / maxMentions) * 100}%` }"
                    />
                  </div>
                  <span class="w-20 shrink-0 text-right text-xs text-gray-500">
                    {{ m.mentions }} mention{{ m.mentions > 1 ? 's' : '' }}
                  </span>
                </NuxtLink>
              </div>
            </section>
          </div>
        </template>
      </div>
    </div>
  </main>
</template>
