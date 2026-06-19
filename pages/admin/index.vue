<script setup lang="ts">
/**
 * pages/admin/index.vue — admin console: manage merchants.
 *
 * Gated by the `admin` middleware (UX). The real security is server-side: every
 * route below is protected with requireAdmin().
 *
 *   GET    /api/commerces                 -> Commercant[]  (list)
 *   POST   /api/commerces                 body { nom, email, slug, password }
 *   POST   /api/commerces/:slug/password  body { password }
 *   DELETE /api/commerces/:slug
 */
definePageMeta({ middleware: 'admin' })
useSeoMeta({ title: 'Administration · Revu' })

interface Commercant {
  id: string
  nom: string
  email: string
  slug: string
  role?: string
  created_at?: string
}

// Shared input styling (kept in the script so it stays in one place).
const champ =
  'mt-1 w-full rounded-lg border border-gray-200 bg-white p-2.5 text-sm placeholder:text-gray-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30'

// --- Merchant list -------------------------------------------------------
const { data, refresh } = await useFetch<Commercant[]>('/api/commerces', { default: () => [] })
// Hide the admin account itself from the list.
const commercants = computed(() => (data.value ?? []).filter((c) => c.role !== 'admin'))

// --- Add a merchant ------------------------------------------------------
const form = reactive({ nom: '', email: '', slug: '', password: '' })
const slugManuel = ref(false)

/** Turn a name into a URL-safe slug ("La Brasserie!" -> "la-brasserie"). */
function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
// Auto-fill the slug from the name until the admin edits it manually.
watch(
  () => form.nom,
  (nom) => {
    if (!slugManuel.value) form.slug = slugify(nom)
  },
)

const ajout = reactive({ loading: false, ok: '', erreur: '' })
const peutAjouter = computed(
  () => form.nom && form.email && form.slug && form.password && !ajout.loading,
)

async function ajouterCommercant() {
  ajout.ok = ''
  ajout.erreur = ''
  ajout.loading = true
  try {
    await $fetch('/api/commerces', { method: 'POST', body: { ...form } })
    ajout.ok = `« ${form.nom} » ajouté.`
    form.nom = ''
    form.email = ''
    form.slug = ''
    form.password = ''
    slugManuel.value = false
    await refresh()
  } catch (err: unknown) {
    ajout.erreur =
      (err as { data?: { message?: string } })?.data?.message ?? "Impossible d'ajouter le commerçant."
  } finally {
    ajout.loading = false
  }
}

// --- Per-merchant: change password ---------------------------------------
const mdpOuvert = ref<string | null>(null) // slug currently being edited
const mdpValeur = ref('')
const mdpLoading = ref(false)
const mdpMsg = ref('')

function ouvrirMdp(slug: string) {
  mdpOuvert.value = slug
  mdpValeur.value = ''
  mdpMsg.value = ''
  suppr.value = null
}

async function enregistrerMdp(slug: string) {
  if (!mdpValeur.value) return
  mdpLoading.value = true
  mdpMsg.value = ''
  try {
    await $fetch(`/api/commerces/${slug}/password`, {
      method: 'POST',
      body: { password: mdpValeur.value },
    })
    mdpMsg.value = '✓ Mot de passe mis à jour.'
    mdpValeur.value = ''
  } catch (err: unknown) {
    mdpMsg.value =
      (err as { data?: { message?: string } })?.data?.message ?? 'Échec de la mise à jour.'
  } finally {
    mdpLoading.value = false
  }
}

// --- Per-merchant: delete (with inline confirm) --------------------------
const suppr = ref<string | null>(null) // slug awaiting confirmation
const supprLoading = ref(false)

function demanderSuppression(slug: string) {
  suppr.value = slug
  mdpOuvert.value = null
}

async function confirmerSuppression(slug: string) {
  supprLoading.value = true
  try {
    await $fetch(`/api/commerces/${slug}`, { method: 'DELETE' })
    suppr.value = null
    await refresh()
  } catch {
    // Keep the confirm open on failure so the admin can retry.
  } finally {
    supprLoading.value = false
  }
}

// --- Logout --------------------------------------------------------------
async function seDeconnecter() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await navigateTo('/login')
}
</script>

<template>
  <main class="min-h-screen bg-surface pb-12 text-ink">
    <div class="mx-auto max-w-3xl">
      <!-- HEADER -->
      <header class="bg-brand px-5 py-5 text-white shadow-sm sm:mt-6 sm:rounded-2xl">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-lg font-bold leading-tight">Revu · Administration</p>
            <p class="mt-0.5 text-xs text-white/85">Gestion des commerçants</p>
          </div>
          <button type="button" class="text-xs text-white/90 transition hover:underline" @click="seDeconnecter">
            Déconnexion
          </button>
        </div>
      </header>

      <div class="px-5">
        <!-- ADD A MERCHANT -->
        <section
          class="mt-6 animate-fade-in-up rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
        >
          <h2 class="text-base font-semibold">Ajouter un commerçant</h2>
          <form class="mt-4 grid gap-4 sm:grid-cols-2" @submit.prevent="ajouterCommercant">
            <div>
              <label class="text-xs font-medium text-gray-500">Nom</label>
              <input v-model="form.nom" type="text" placeholder="La Brasserie du Centre" :class="champ" />
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500">Email</label>
              <input v-model="form.email" type="email" placeholder="contact@brasserie.fr" :class="champ" />
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500">Slug — URL de l'avis</label>
              <input
                v-model="form.slug"
                type="text"
                placeholder="brasserie-du-centre"
                :class="[champ, 'font-mono']"
                @input="slugManuel = true"
              />
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500">Mot de passe initial</label>
              <input v-model="form.password" type="text" placeholder="à communiquer au commerçant" :class="champ" />
            </div>

            <div class="flex flex-wrap items-center gap-3 sm:col-span-2">
              <button
                type="submit"
                :disabled="!peutAjouter"
                class="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {{ ajout.loading ? 'Ajout…' : 'Ajouter le commerçant' }}
              </button>
              <p v-if="ajout.ok" class="text-sm font-medium text-brand">{{ ajout.ok }}</p>
              <p v-if="ajout.erreur" class="text-sm text-alert">{{ ajout.erreur }}</p>
            </div>
          </form>
        </section>

        <!-- MERCHANT LIST -->
        <section class="mt-8">
          <h2 class="text-base font-semibold">
            Commerçants <span class="font-normal text-gray-400">· {{ commercants.length }}</span>
          </h2>

          <p
            v-if="commercants.length === 0"
            class="mt-4 rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500"
          >
            Aucun commerçant pour le moment. Ajoutez-en un ci-dessus.
          </p>

          <ul v-else class="mt-4 flex flex-col gap-3">
            <li
              v-for="c in commercants"
              :key="c.id"
              class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow"
            >
              <div class="flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <p class="truncate font-semibold">{{ c.nom }}</p>
                  <p class="truncate text-xs text-gray-500">{{ c.email }}</p>
                  <p class="mt-0.5 truncate font-mono text-[11px] text-gray-400">/avis/{{ c.slug }}</p>
                </div>
                <div class="flex shrink-0 gap-2">
                  <button
                    type="button"
                    class="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium transition hover:bg-gray-50 active:scale-[0.97]"
                    @click="ouvrirMdp(c.slug)"
                  >
                    🔑 Mot de passe
                  </button>
                  <button
                    type="button"
                    class="rounded-lg border border-alert/30 px-3 py-1.5 text-xs font-medium text-alert transition hover:bg-alert-bg active:scale-[0.97]"
                    @click="demanderSuppression(c.slug)"
                  >
                    🗑 Supprimer
                  </button>
                </div>
              </div>

              <!-- Inline: change password -->
              <div
                v-if="mdpOuvert === c.slug"
                class="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-surface p-3"
              >
                <input
                  v-model="mdpValeur"
                  type="text"
                  placeholder="Nouveau mot de passe"
                  :class="[champ, 'mt-0 flex-1']"
                />
                <button
                  type="button"
                  :disabled="!mdpValeur || mdpLoading"
                  class="rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-dark active:scale-[0.97] disabled:opacity-50"
                  @click="enregistrerMdp(c.slug)"
                >
                  {{ mdpLoading ? '…' : 'Enregistrer' }}
                </button>
                <button type="button" class="px-2 py-2 text-xs text-gray-500 transition hover:text-ink" @click="mdpOuvert = null">
                  Annuler
                </button>
                <p v-if="mdpMsg" class="w-full text-xs text-brand">{{ mdpMsg }}</p>
              </div>

              <!-- Inline: confirm delete -->
              <div
                v-if="suppr === c.slug"
                class="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-alert-bg p-3"
              >
                <p class="flex-1 text-xs text-gray-700">
                  Supprimer <b>{{ c.nom }}</b> ? Ses avis et alertes seront supprimés aussi.
                </p>
                <button
                  type="button"
                  :disabled="supprLoading"
                  class="rounded-lg bg-alert px-3 py-2 text-xs font-semibold text-white transition hover:brightness-90 active:scale-[0.97] disabled:opacity-50"
                  @click="confirmerSuppression(c.slug)"
                >
                  {{ supprLoading ? '…' : 'Oui, supprimer' }}
                </button>
                <button type="button" class="px-2 py-2 text-xs text-gray-500 transition hover:text-ink" @click="suppr = null">
                  Annuler
                </button>
              </div>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </main>
</template>
