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
  stats: {
    noteMoyenne: number
    totalAvis: number
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

// Single API call (only when a slug is present).
const { data, error } = await useFetch<DashboardData>(() => `/api/dashboard/${slug.value}`, {
  immediate: !!slug.value,
  watch: [slug],
})

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

/** Progress-bar colour by sentiment: red negative, green positive, orange neutral. */
function couleurBarre(tendance: string) {
  if (tendance === 'positif') return 'bg-brand'
  if (tendance === 'négatif') return 'bg-alert'
  return 'bg-orange-400'
}

/** Link to the alert-detail page, carrying the slug. */
function lienAlerte(mot: string) {
  return `/dashboard/alerte/${encodeURIComponent(mot)}?slug=${encodeURIComponent(slug.value)}`
}

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
            :to="lienAlerte(a.mot)"
            class="mt-5 flex items-start gap-3 rounded-xl border border-alert/20 bg-alert-bg p-4 transition hover:brightness-95"
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

          <!-- 4 KPI CARDS (bigger on desktop) -->
          <div class="mt-5 grid grid-cols-4 gap-2 lg:gap-4">
            <div class="rounded-xl border border-gray-200 bg-white p-3 lg:p-4">
              <p class="text-[11px] leading-tight text-gray-500">Note globale</p>
              <p class="mt-1 text-base font-bold lg:text-2xl">{{ data.stats.noteMoyenne.toFixed(1) }} ★</p>
            </div>
            <div class="rounded-xl border border-gray-200 bg-white p-3 lg:p-4">
              <p class="text-[11px] leading-tight text-gray-500">Avis ce mois</p>
              <p class="mt-1 text-base font-bold lg:text-2xl">{{ data.stats.totalAvis }}</p>
            </div>
            <div class="rounded-xl bg-brand-light p-3 lg:p-4">
              <p class="text-[11px] leading-tight text-brand-dark/70">Meilleur</p>
              <p class="mt-1 text-xs font-bold text-brand-dark lg:text-sm">
                {{ data.stats.meilleure ? `${data.stats.meilleure.label} ${data.stats.meilleure.note.toFixed(1)} ★` : '—' }}
              </p>
            </div>
            <div class="rounded-xl bg-alert-bg p-3 lg:p-4">
              <p class="text-[11px] leading-tight text-alert/80">À améliorer</p>
              <p class="mt-1 text-xs font-bold text-alert lg:text-sm">
                {{ data.stats.aAmeliorer ? `${data.stats.aAmeliorer.label} ${data.stats.aAmeliorer.note.toFixed(1)} ★` : '—' }}
              </p>
            </div>
          </div>

          <!-- EVOLUTION + KEYWORDS — stacked on mobile, two panels side-by-side on desktop. -->
          <div class="lg:mt-6 lg:grid lg:grid-cols-2 lg:gap-6">
            <!-- EVOLUTION (pure-CSS bar chart, no charting lib needed for 4 bars) -->
            <section class="mt-6 lg:mt-0 lg:rounded-xl lg:border lg:border-gray-200 lg:bg-white lg:p-5">
              <h2 class="text-sm font-semibold">Évolution — 4 dernières semaines</h2>
              <div class="mt-4 flex h-40 items-end justify-between gap-3 lg:h-48">
                <div
                  v-for="pt in data.stats.evolution"
                  :key="pt.semaine"
                  class="flex flex-1 flex-col items-center"
                >
                  <span class="mb-1 text-[11px] font-medium text-gray-600">
                    {{ pt.note ? pt.note.toFixed(1) : '—' }}
                  </span>
                  <div class="flex w-full flex-1 items-end">
                    <div
                      class="w-full rounded-t bg-brand"
                      :style="{ height: `${Math.max(2, (pt.note / 5) * 100)}%` }"
                    />
                  </div>
                  <span class="mt-2 text-[11px] text-gray-500">{{ pt.semaine }}</span>
                </div>
              </div>
            </section>

            <!-- KEYWORDS -->
            <section class="mt-8 lg:mt-0 lg:rounded-xl lg:border lg:border-gray-200 lg:bg-white lg:p-5">
              <h2 class="text-sm font-semibold">Mots les plus mentionnés</h2>
              <div class="mt-4 flex flex-col gap-3">
                <NuxtLink
                  v-for="m in data.motsCles"
                  :key="m.mot"
                  :to="lienAlerte(m.mot)"
                  class="flex items-center gap-3 rounded-lg px-1 py-1 transition hover:bg-gray-50"
                >
                  <span class="w-16 shrink-0 truncate text-sm font-medium">{{ m.mot }}</span>
                  <div class="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div
                      class="h-full rounded-full"
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
