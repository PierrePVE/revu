<script setup lang="ts">
/**
 * pages/avis/[slug].vue — public client review form (Figma screen 01).
 *
 * Reached by scanning a business's QR code: /avis/<slug>. Mobile-first.
 * Flow: load the commerce by slug (header name) → customer rates + comments →
 * submit anonymously → thank-you state. Shows a "not found" state on a bad slug.
 */

/** Shape returned by GET /api/commerces/[slug]. */
interface Commerce {
  id: string
  nom: string
  slug: string
}

const route = useRoute()
const slug = computed(() => String(route.params.slug))

// Load the commerce server-side (fast first paint + SEO-friendly header).
// A 404 from the API lands in `commerceError`; we render a dedicated state.
const { data: commerce, error: commerceError } = await useFetch<Commerce>(
  `/api/commerces/${slug.value}`,
)

useSeoMeta({
  title: () => (commerce.value ? `Votre avis · ${commerce.value.nom}` : 'Votre avis · Revu'),
})

// --- Form state -----------------------------------------------------------
const noteGlobale = ref(0)
const noteQualite = ref(0)
const noteService = ref(0)
const noteAttente = ref(0)
const commentaire = ref('')

const submitting = ref(false)
const submitted = ref(false)
const errorMessage = ref('')

// Only the global rating is required (keep friction minimal — categories are a
// bonus). Server-side validation mirrors this rule.
const peutEnvoyer = computed(() => noteGlobale.value >= 1 && !submitting.value)

/** Validate client-side, POST the review, then switch to the thank-you state. */
async function envoyer() {
  errorMessage.value = ''
  if (noteGlobale.value < 1) {
    errorMessage.value = 'Merci de donner au moins une note globale.'
    return
  }

  submitting.value = true
  try {
    await $fetch('/api/avis', {
      method: 'POST',
      body: {
        commerceId: commerce.value?.id,
        noteGlobale: noteGlobale.value,
        // Send null for axes left untouched (the column is nullable).
        noteQualite: noteQualite.value || null,
        noteService: noteService.value || null,
        noteAttente: noteAttente.value || null,
        commentaire: commentaire.value.trim() || null,
      },
    })
    submitted.value = true
  } catch (err: unknown) {
    // Surface the server's message when available, otherwise a generic one.
    const message = (err as { data?: { message?: string } })?.data?.message
    errorMessage.value = message || 'Une erreur est survenue. Merci de réessayer.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="flex min-h-screen justify-center text-ink sm:py-8">
    <div
      class="flex w-full max-w-md flex-col overflow-hidden bg-white sm:rounded-2xl sm:shadow-sm sm:ring-1 sm:ring-black/5"
    >
      <!-- Header — green banner with the Revu wordmark + commerce name. -->
      <header class="bg-brand px-7 py-6 text-white">
        <p class="text-2xl font-bold leading-none">Revu</p>
        <p class="mt-1 text-sm text-white/90">{{ commerce?.nom ?? '…' }}</p>
      </header>

      <!-- Commerce not found (invalid slug / QR code). -->
      <section v-if="commerceError" class="p-7">
        <h1 class="text-lg font-bold">Commerce introuvable</h1>
        <p class="mt-1 text-sm text-gray-500">
          Ce lien ne correspond à aucun commerce. Vérifiez le QR code.
        </p>
      </section>

      <!-- Success — review submitted. -->
      <section v-else-if="submitted" class="p-7 text-center">
        <div
          class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-light text-2xl"
        >
          ✅
        </div>
        <h1 class="text-lg font-bold">Merci pour votre avis !</h1>
        <p class="mt-1 text-sm text-gray-500">
          Votre retour aide {{ commerce?.nom }} à s'améliorer.
        </p>
      </section>

      <!-- Review form. -->
      <form v-else class="flex flex-col p-7" novalidate @submit.prevent="envoyer">
        <!-- Global rating (required). -->
        <h2 class="text-base font-semibold">Votre note globale</h2>
        <StarRating v-model="noteGlobale" size="lg" label="Note globale" class="mt-3" />

        <hr class="my-6 border-gray-200" />

        <!-- Per-category ratings (optional). -->
        <h2 class="text-base font-semibold">Détail par catégorie</h2>
        <div class="mt-4 flex flex-col gap-4">
          <div class="flex items-center justify-between gap-3">
            <span class="text-sm">🍽️ Qualité des plats</span>
            <StarRating v-model="noteQualite" size="sm" label="Qualité des plats" />
          </div>
          <div class="flex items-center justify-between gap-3">
            <span class="text-sm">😊 Service</span>
            <StarRating v-model="noteService" size="sm" label="Service" />
          </div>
          <div class="flex items-center justify-between gap-3">
            <span class="text-sm">⏱️ Temps d'attente</span>
            <StarRating v-model="noteAttente" size="sm" label="Temps d'attente" />
          </div>
        </div>

        <hr class="my-6 border-gray-200" />

        <!-- Free-text comment (optional). -->
        <label for="commentaire" class="text-base font-semibold">
          Commentaire <span class="font-normal text-gray-400">(optionnel)</span>
        </label>
        <textarea
          id="commentaire"
          v-model="commentaire"
          rows="3"
          maxlength="1000"
          placeholder="Un détail à nous signaler..."
          class="mt-3 w-full resize-none rounded-xl border border-gray-200 bg-surface p-3 text-sm placeholder:text-gray-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
        />

        <!-- Validation / submission error. -->
        <p v-if="errorMessage" class="mt-3 rounded-lg bg-alert-bg px-3 py-2 text-sm text-alert">
          {{ errorMessage }}
        </p>

        <!-- Submit. -->
        <button
          type="submit"
          :disabled="!peutEnvoyer"
          class="mt-6 w-full rounded-xl bg-brand py-3.5 font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{ submitting ? 'Envoi…' : 'Envoyer mon avis' }}
        </button>

        <p class="mt-4 text-center text-xs text-gray-400">Anonyme — aucun compte requis</p>
      </form>
    </div>
  </main>
</template>
