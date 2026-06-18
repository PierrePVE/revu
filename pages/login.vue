<script setup lang="ts">
/**
 * pages/login.vue — merchant login (Figma screen 04).
 *
 * Posts credentials to /api/auth/login (which sets the httpOnly session cookie),
 * then redirects to the merchant's dashboard. A "Voir la démo" shortcut opens
 * the demo commerce without logging in.
 */
const email = ref('')
const password = ref('')
const submitting = ref(false)
const errorMessage = ref('')

useSeoMeta({ title: 'Connexion · Revu' })

const peutEnvoyer = computed(
  () => email.value.trim() !== '' && password.value !== '' && !submitting.value,
)

/** Submit credentials; on success redirect to the merchant's dashboard. */
async function seConnecter() {
  errorMessage.value = ''
  submitting.value = true
  try {
    const { commerce } = await $fetch<{ commerce: { nom: string; slug: string } }>(
      '/api/auth/login',
      { method: 'POST', body: { email: email.value, password: password.value } },
    )
    await navigateTo(`/dashboard?slug=${encodeURIComponent(commerce.slug)}`)
  } catch (err: unknown) {
    const message = (err as { data?: { message?: string } })?.data?.message
    errorMessage.value = message || 'Connexion impossible. Réessayez.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-surface px-5 text-ink">
    <div class="w-full max-w-sm">
      <!-- Logo -->
      <div class="mb-8 text-center">
        <p class="text-3xl font-bold text-brand">Revu</p>
        <p class="mt-1 text-sm text-gray-500">Espace commerçant</p>
      </div>

      <form class="flex flex-col gap-4" @submit.prevent="seConnecter">
        <div>
          <label for="email" class="text-sm font-medium">Adresse email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            autocomplete="email"
            placeholder="votre@email.com"
            class="mt-1.5 w-full rounded-xl border border-gray-200 bg-white p-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </div>

        <div>
          <div class="flex items-center justify-between">
            <label for="password" class="text-sm font-medium">Mot de passe</label>
            <!-- Placeholder for a future password-reset flow. -->
            <span class="cursor-default text-xs text-gray-400">Mot de passe oublié ?</span>
          </div>
          <input
            id="password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            placeholder="••••••••"
            class="mt-1.5 w-full rounded-xl border border-gray-200 bg-white p-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </div>

        <p v-if="errorMessage" class="rounded-lg bg-alert-bg px-3 py-2 text-sm text-alert">
          {{ errorMessage }}
        </p>

        <button
          type="submit"
          :disabled="!peutEnvoyer"
          class="rounded-xl bg-brand py-3.5 font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{ submitting ? 'Connexion…' : 'Se connecter' }}
        </button>
      </form>

      <!-- Divider -->
      <div class="my-6 flex items-center gap-3 text-xs text-gray-400">
        <span class="h-px flex-1 bg-gray-200" />ou<span class="h-px flex-1 bg-gray-200" />
      </div>

      <!-- Demo access (no account needed) -->
      <NuxtLink
        to="/dashboard?slug=brasserie-du-centre"
        class="block rounded-xl border border-gray-200 bg-white py-3.5 text-center font-semibold transition hover:bg-gray-50"
      >
        Voir la démo
      </NuxtLink>

      <p class="mt-8 text-center text-xs text-gray-400">© 2026 Revu — Tous droits réservés</p>
    </div>
  </main>
</template>
