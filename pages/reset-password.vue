<script setup lang="ts">
/**
 * pages/reset-password.vue — self-service password reset.
 *
 * One page, two modes driven by the `?token=` query parameter:
 *   - no token  -> "request" mode: enter your email to receive a reset link.
 *   - token set -> "confirm" mode: choose a new password (link from the email).
 *
 * Posts to /api/auth/reset/request and /api/auth/reset/confirm. The success
 * message in request mode is deliberately vague (anti-enumeration): it never
 * reveals whether the email matches an account.
 */
const route = useRoute()
// The reset link from the email is /reset-password?token=...
const token = computed(() => String(route.query.token ?? ''))
const modeConfirmation = computed(() => token.value !== '')

useSeoMeta({ title: 'Mot de passe oublié · Revu' })

// Shared input styling.
const champ =
  'mt-1.5 w-full rounded-xl border border-gray-200 bg-white p-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30'

const loading = ref(false)
const erreur = ref('')
const message = ref('') // success / info message

// --- Request mode --------------------------------------------------------
const email = ref('')

/** Ask the server to email a reset link. */
async function demanderLien() {
  erreur.value = ''
  message.value = ''
  loading.value = true
  try {
    await $fetch('/api/auth/reset/request', { method: 'POST', body: { email: email.value } })
    // Vague on purpose — don't disclose whether the email exists.
    message.value =
      'Si un compte est associé à cet email, un lien de réinitialisation vient d’être envoyé. Pensez à vérifier vos spams.'
  } catch (err: unknown) {
    erreur.value =
      (err as { data?: { message?: string } })?.data?.message ?? 'Une erreur est survenue. Réessayez.'
  } finally {
    loading.value = false
  }
}

// --- Confirm mode --------------------------------------------------------
const password = ref('')
const password2 = ref('')

/** Submit the new password for the token carried in the URL. */
async function definirMotDePasse() {
  erreur.value = ''
  message.value = ''
  if (password.value.length < 8) {
    erreur.value = 'Mot de passe trop court (8 caractères minimum).'
    return
  }
  if (password.value !== password2.value) {
    erreur.value = 'Les deux mots de passe ne correspondent pas.'
    return
  }
  loading.value = true
  try {
    await $fetch('/api/auth/reset/confirm', {
      method: 'POST',
      body: { token: token.value, password: password.value },
    })
    message.value = 'Mot de passe mis à jour ! Redirection vers la connexion…'
    setTimeout(() => navigateTo('/login'), 1600)
  } catch (err: unknown) {
    erreur.value =
      (err as { data?: { message?: string } })?.data?.message ?? 'Lien invalide ou expiré.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-surface px-5 text-ink">
    <div class="w-full max-w-sm">
      <!-- Logo -->
      <div class="mb-8 text-center">
        <p class="text-3xl font-bold text-brand">Revu</p>
        <p class="mt-1 text-sm text-gray-500">
          {{ modeConfirmation ? 'Nouveau mot de passe' : 'Mot de passe oublié' }}
        </p>
      </div>

      <!-- CONFIRM MODE: choose a new password -->
      <form v-if="modeConfirmation" class="flex flex-col gap-4" @submit.prevent="definirMotDePasse">
        <div>
          <label for="password" class="text-sm font-medium">Nouveau mot de passe</label>
          <input
            id="password"
            v-model="password"
            type="password"
            autocomplete="new-password"
            placeholder="8 caractères minimum"
            :class="champ"
          />
        </div>
        <div>
          <label for="password2" class="text-sm font-medium">Confirmer le mot de passe</label>
          <input
            id="password2"
            v-model="password2"
            type="password"
            autocomplete="new-password"
            placeholder="••••••••"
            :class="champ"
          />
        </div>

        <p v-if="erreur" class="rounded-lg bg-alert-bg px-3 py-2 text-sm text-alert">{{ erreur }}</p>
        <p v-if="message" class="rounded-lg bg-brand-light px-3 py-2 text-sm text-brand-dark">{{ message }}</p>

        <button
          type="submit"
          :disabled="loading"
          class="rounded-xl bg-brand py-3.5 font-semibold text-white transition hover:bg-brand-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{ loading ? 'Enregistrement…' : 'Définir le mot de passe' }}
        </button>
      </form>

      <!-- REQUEST MODE: ask for a reset link -->
      <form v-else class="flex flex-col gap-4" @submit.prevent="demanderLien">
        <p class="text-sm text-gray-500">
          Saisissez votre adresse email&nbsp;: nous vous enverrons un lien pour choisir un nouveau mot de passe.
        </p>
        <div>
          <label for="email" class="text-sm font-medium">Adresse email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            autocomplete="email"
            placeholder="votre@email.com"
            :class="champ"
          />
        </div>

        <p v-if="erreur" class="rounded-lg bg-alert-bg px-3 py-2 text-sm text-alert">{{ erreur }}</p>
        <p v-if="message" class="rounded-lg bg-brand-light px-3 py-2 text-sm text-brand-dark">{{ message }}</p>

        <button
          type="submit"
          :disabled="loading || email.trim() === ''"
          class="rounded-xl bg-brand py-3.5 font-semibold text-white transition hover:bg-brand-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{ loading ? 'Envoi…' : 'Envoyer le lien' }}
        </button>
      </form>

      <!-- Back to login -->
      <p class="mt-8 text-center text-sm">
        <NuxtLink to="/login" class="text-brand transition hover:underline">← Retour à la connexion</NuxtLink>
      </p>
    </div>
  </main>
</template>
