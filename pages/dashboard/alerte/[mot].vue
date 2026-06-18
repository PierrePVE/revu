<script setup lang="ts">
/**
 * pages/dashboard/alerte/[mot].vue — alert detail (Figma screen 03).
 *
 * Lists every review of the commerce whose comment mentions [mot]. The commerce
 * is taken from the ?slug= query param (same convention as the dashboard), so a
 * link looks like /dashboard/alerte/steak?slug=brasserie-du-centre.
 */
// Protected page — redirects to /login without a valid session.
definePageMeta({ middleware: 'auth' })

interface Commentaire {
  note: number
  texte: string
  date: string
}
interface AlerteDetail {
  mot: string
  mentions: number
  noteMoyenne: number
  pourcentageCetteSemaine: number
  traite: boolean
  commentaires: Commentaire[]
}

const route = useRoute()
const mot = computed(() => String(route.params.mot ?? ''))
const slug = computed(() => String(route.query.slug ?? ''))
const periode = computed(() => String(route.query.periode ?? 'mois'))

// Single API call (windowed to the period passed by the dashboard).
const { data, error } = await useFetch<AlerteDetail>(
  () => `/api/dashboard/alerte/${slug.value}/${encodeURIComponent(mot.value)}?periode=${periode.value}`,
  { immediate: !!slug.value, watch: [slug, mot, periode] },
)

useSeoMeta({ title: () => `Alerte « ${mot.value} » · Revu` })

const lienRetour = computed(
  () => `/dashboard?slug=${encodeURIComponent(slug.value)}&periode=${periode.value}`,
)

// "Marquer comme traité": persisted server-side. Initialise from the API and
// flip it after a successful POST.
const traite = ref(false)
watchEffect(() => {
  if (data.value) traite.value = data.value.traite
})

/** Persist the "handled" state for this word, then reflect it in the UI. */
async function marquerTraite() {
  if (traite.value) return
  try {
    await $fetch(
      `/api/dashboard/alerte/${encodeURIComponent(slug.value)}/${encodeURIComponent(mot.value)}`,
      { method: 'POST' },
    )
    traite.value = true
  } catch {
    // Stay un-treated on failure; the merchant can retry.
  }
}
</script>

<template>
  <main class="min-h-screen bg-surface pb-12 text-ink">
    <div class="mx-auto max-w-md">
      <!-- HEADER -->
      <header class="bg-white px-5 pb-4 pt-6">
        <NuxtLink :to="lienRetour" class="text-sm text-gray-500 transition hover:text-ink">
          ← Tableau de bord
        </NuxtLink>
        <h1 class="mt-2 text-xl font-bold">Détail de l'alerte</h1>
      </header>

      <div class="px-5">
        <p v-if="!slug || error" class="mt-8 text-center text-sm text-gray-500">Alerte introuvable.</p>

        <template v-else-if="data">
          <!-- RED BANNER -->
          <div class="flex items-start gap-3 rounded-xl border border-alert/20 bg-alert-bg p-4">
            <span class="text-2xl leading-none">⚠️</span>
            <div class="min-w-0">
              <p class="text-lg font-bold text-alert">« {{ data.mot }} »</p>
              <p class="mt-0.5 text-xs text-gray-600">
                {{ data.mentions }} mention{{ data.mentions > 1 ? 's' : '' }} · note moyenne
                {{ data.noteMoyenne.toFixed(1) }} / 5
              </p>
            </div>
          </div>

          <!-- 3 KEY FIGURES -->
          <div class="mt-5 grid grid-cols-3 gap-3 text-center">
            <div class="rounded-xl border border-gray-200 bg-white p-3">
              <p class="text-[11px] text-gray-500">Mentions</p>
              <p class="mt-1 text-lg font-bold">{{ data.mentions }}</p>
            </div>
            <div class="rounded-xl border border-gray-200 bg-white p-3">
              <p class="text-[11px] text-gray-500">Note moy.</p>
              <p class="mt-1 text-lg font-bold">{{ data.noteMoyenne.toFixed(1) }} ★</p>
            </div>
            <div class="rounded-xl border border-gray-200 bg-white p-3">
              <p class="text-[11px] text-gray-500">Cette semaine</p>
              <p class="mt-1 text-lg font-bold">{{ data.pourcentageCetteSemaine }}%</p>
            </div>
          </div>

          <!-- COMMENTS -->
          <section class="mt-6">
            <h2 class="text-sm font-semibold">Commentaires clients</h2>
            <p class="text-xs text-gray-500">{{ data.mentions }} avis mentionnant ce mot</p>

            <p v-if="data.commentaires.length === 0" class="mt-4 text-sm text-gray-500">
              Aucun commentaire pour ce mot.
            </p>

            <div v-else class="mt-4 flex flex-col gap-3">
              <article
                v-for="(c, i) in data.commentaires"
                :key="i"
                class="rounded-xl border border-gray-200 bg-white p-4"
              >
                <div class="flex items-center justify-between">
                  <StarRating :model-value="c.note" size="sm" readonly />
                  <span class="text-xs text-gray-400">{{ c.date }}</span>
                </div>
                <p class="mt-2 text-sm">{{ c.texte }}</p>
                <p class="mt-2 text-xs text-gray-400">Client anonyme</p>
              </article>
            </div>
          </section>

          <!-- MARK AS HANDLED (local-only placeholder for now) -->
          <button
            type="button"
            :disabled="traite"
            class="mt-6 w-full rounded-xl py-3.5 font-semibold transition active:scale-[0.98]"
            :class="
              traite
                ? 'bg-brand-light text-brand-dark'
                : 'bg-brand text-white hover:bg-brand-dark'
            "
            @click="marquerTraite"
          >
            {{ traite ? '✓ Marquée comme traitée' : 'Marquer comme traité' }}
          </button>
        </template>
      </div>
    </div>
  </main>
</template>
