<script setup lang="ts">
/**
 * pages/compte.vue — "Mon compte": the merchant manages their own profile and
 * password. Protected by the `auth` middleware.
 *
 * Loads the current profile from GET /api/auth/me, then exposes two independent
 * forms posting to POST /api/compte (name/email) and POST /api/compte/password.
 * The slug (public review URL) is shown read-only — changing it would break
 * printed QR codes.
 */
definePageMeta({ middleware: 'auth' })
useSeoMeta({ title: 'Mon compte · Revu' })

interface Profil {
  id: string
  nom: string
  email: string
  slug: string
  role?: string
}

// Shared input styling (same look as the login / admin forms).
const champ =
  'mt-1.5 w-full rounded-xl border border-gray-200 bg-white p-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30'

// Prefill from the session. useRequestFetch forwards the auth cookie on SSR.
const { data: profil } = await useFetch<Profil>('/api/auth/me')

// --- Profile form (name + email) -----------------------------------------
const nom = ref(profil.value?.nom ?? '')
const email = ref(profil.value?.email ?? '')
const profilState = reactive({ loading: false, ok: '', erreur: '' })

/** Save the merchant's name and email. */
async function enregistrerProfil() {
  profilState.ok = ''
  profilState.erreur = ''
  profilState.loading = true
  try {
    const maj = await $fetch<Profil>('/api/compte', {
      method: 'POST',
      body: { nom: nom.value, email: email.value },
    })
    nom.value = maj.nom
    email.value = maj.email
    profilState.ok = 'Profil mis à jour.'
  } catch (err: unknown) {
    profilState.erreur =
      (err as { data?: { message?: string } })?.data?.message ?? 'Échec de la mise à jour.'
  } finally {
    profilState.loading = false
  }
}

// --- Password form -------------------------------------------------------
const ancien = ref('')
const nouveau = ref('')
const confirmation = ref('')
const mdpState = reactive({ loading: false, ok: '', erreur: '' })

/** Change the merchant's password (after re-entering the current one). */
async function changerMotDePasse() {
  mdpState.ok = ''
  mdpState.erreur = ''
  if (nouveau.value.length < 8) {
    mdpState.erreur = 'Mot de passe trop court (8 caractères minimum).'
    return
  }
  if (nouveau.value !== confirmation.value) {
    mdpState.erreur = 'Les deux mots de passe ne correspondent pas.'
    return
  }
  mdpState.loading = true
  try {
    await $fetch('/api/compte/password', {
      method: 'POST',
      body: { ancienMotDePasse: ancien.value, nouveauMotDePasse: nouveau.value },
    })
    mdpState.ok = 'Mot de passe modifié.'
    ancien.value = ''
    nouveau.value = ''
    confirmation.value = ''
  } catch (err: unknown) {
    mdpState.erreur =
      (err as { data?: { message?: string } })?.data?.message ?? 'Échec du changement.'
  } finally {
    mdpState.loading = false
  }
}

/** Log out (clears the session cookie) then return to login. */
async function seDeconnecter() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await navigateTo('/login')
}
</script>

<template>
  <main class="min-h-screen bg-surface pb-12 text-ink">
    <div class="mx-auto max-w-md lg:max-w-2xl">
      <!-- HEADER -->
      <header class="bg-brand px-5 py-5 text-white sm:mt-6 sm:rounded-2xl">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="truncate text-lg font-bold leading-tight">Mon compte</p>
            <p class="mt-0.5 text-xs text-white/85">Profil &amp; sécurité</p>
          </div>
          <span class="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold">Revu</span>
        </div>
        <div class="mt-3 flex gap-4 text-xs text-white/90">
          <NuxtLink :to="`/dashboard?slug=${profil?.slug ?? ''}`" class="hover:underline">← Tableau de bord</NuxtLink>
          <button type="button" class="hover:underline" @click="seDeconnecter">Déconnexion</button>
        </div>
      </header>

      <div class="px-5 lg:px-8">
        <!-- PROFILE -->
        <section class="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 class="text-base font-semibold">Profil</h2>
          <form class="mt-4 flex flex-col gap-4" @submit.prevent="enregistrerProfil">
            <div>
              <label for="nom" class="text-sm font-medium">Nom du commerce</label>
              <input id="nom" v-model="nom" type="text" :class="champ" />
            </div>
            <div>
              <label for="email" class="text-sm font-medium">Adresse email</label>
              <input id="email" v-model="email" type="email" autocomplete="email" :class="champ" />
            </div>
            <div>
              <label class="text-sm font-medium text-gray-500">Lien public des avis</label>
              <p class="mt-1.5 rounded-xl bg-surface px-3 py-3 font-mono text-xs text-gray-500">
                /avis/{{ profil?.slug }}
              </p>
              <p class="mt-1 text-xs text-gray-400">Non modifiable : votre QR code pointe vers ce lien.</p>
            </div>

            <p v-if="profilState.erreur" class="rounded-lg bg-alert-bg px-3 py-2 text-sm text-alert">{{ profilState.erreur }}</p>
            <p v-if="profilState.ok" class="rounded-lg bg-brand-light px-3 py-2 text-sm text-brand-dark">{{ profilState.ok }}</p>

            <button
              type="submit"
              :disabled="profilState.loading"
              class="self-start rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark active:scale-[0.98] disabled:opacity-50"
            >
              {{ profilState.loading ? 'Enregistrement…' : 'Enregistrer' }}
            </button>
          </form>
        </section>

        <!-- PASSWORD -->
        <section class="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 class="text-base font-semibold">Mot de passe</h2>
          <form class="mt-4 flex flex-col gap-4" @submit.prevent="changerMotDePasse">
            <div>
              <label for="ancien" class="text-sm font-medium">Mot de passe actuel</label>
              <input id="ancien" v-model="ancien" type="password" autocomplete="current-password" :class="champ" />
            </div>
            <div>
              <label for="nouveau" class="text-sm font-medium">Nouveau mot de passe</label>
              <input id="nouveau" v-model="nouveau" type="password" autocomplete="new-password" placeholder="8 caractères minimum" :class="champ" />
            </div>
            <div>
              <label for="confirmation" class="text-sm font-medium">Confirmer le nouveau mot de passe</label>
              <input id="confirmation" v-model="confirmation" type="password" autocomplete="new-password" :class="champ" />
            </div>

            <p v-if="mdpState.erreur" class="rounded-lg bg-alert-bg px-3 py-2 text-sm text-alert">{{ mdpState.erreur }}</p>
            <p v-if="mdpState.ok" class="rounded-lg bg-brand-light px-3 py-2 text-sm text-brand-dark">{{ mdpState.ok }}</p>

            <button
              type="submit"
              :disabled="mdpState.loading || !ancien || !nouveau"
              class="self-start rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark active:scale-[0.98] disabled:opacity-50"
            >
              {{ mdpState.loading ? 'Modification…' : 'Changer le mot de passe' }}
            </button>
          </form>
        </section>
      </div>
    </div>
  </main>
</template>
