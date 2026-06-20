<script setup lang="ts">
/**
 * error.vue — branded full-page error boundary.
 *
 * Nuxt renders this for any unhandled error (404 included) instead of the raw
 * default page. `clearError` resets the error state and navigates away.
 */
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const estIntrouvable = computed(() => props.error?.statusCode === 404)

useSeoMeta({
  title: () => (estIntrouvable.value ? 'Page introuvable · Revu' : 'Erreur · Revu'),
})

/** Leave the error state and go back to a safe page. */
function revenir() {
  clearError({ redirect: '/login' })
}
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-surface px-5 text-ink">
    <div class="w-full max-w-sm text-center">
      <p class="text-3xl font-bold text-brand">Revu</p>

      <p class="mt-8 text-6xl font-bold text-brand/30">{{ error?.statusCode ?? 500 }}</p>
      <h1 class="mt-4 text-lg font-semibold">
        {{ estIntrouvable ? 'Page introuvable' : 'Une erreur est survenue' }}
      </h1>
      <p class="mt-2 text-sm text-gray-500">
        {{
          estIntrouvable
            ? "La page que vous cherchez n'existe pas ou a été déplacée."
            : 'Désolé, quelque chose s’est mal passé de notre côté. Réessayez dans un instant.'
        }}
      </p>

      <button
        type="button"
        class="mt-8 rounded-xl bg-brand px-5 py-3 font-semibold text-white transition hover:bg-brand-dark active:scale-[0.98]"
        @click="revenir"
      >
        Retour à l’accueil
      </button>
    </div>
  </main>
</template>
