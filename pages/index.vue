<script setup lang="ts">
/**
 * pages/index.vue — public landing page (the site root "/").
 *
 * Presents Revu to prospective merchants and routes them to their space. We
 * deliberately do NOT list existing clients here: customers reach the review
 * form by scanning the QR code on-site (/avis/[slug]), not via a directory, and
 * a public client list would only expose the customer base.
 */
useSeoMeta({
  title: 'Revu — Les avis de vos clients, et les alertes qui comptent',
  ogTitle: 'Revu',
  description:
    'Revu collecte les avis de vos clients par QR code et vous alerte automatiquement des problèmes récurrents.',
})

// The three steps of the product loop, rendered in the "how it works" section.
const etapes = [
  {
    titre: 'Vos clients scannent',
    texte: 'Un QR code sur la table, le ticket ou la vitrine. Aucune application à installer.',
  },
  {
    titre: 'Ils notent en 10 secondes',
    texte: 'Une note, quelques détails, un commentaire facultatif. Simple et rapide.',
  },
  {
    titre: 'Revu vous alerte',
    texte: 'On analyse les commentaires et on vous prévient dès qu’un problème revient souvent.',
  },
]
</script>

<template>
  <div class="min-h-screen bg-surface text-ink">
    <!-- NAV -->
    <header class="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
      <p class="text-2xl font-bold text-brand">Revu</p>
      <NuxtLink
        to="/login"
        class="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark active:scale-[0.98]"
      >
        Espace commerçant
      </NuxtLink>
    </header>

    <!-- HERO -->
    <section class="mx-auto max-w-3xl px-5 pt-12 pb-16 text-center sm:pt-20">
      <span class="inline-block rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand-dark">
        Avis clients pour commerces de proximité
      </span>
      <h1 class="mt-5 text-3xl font-bold leading-tight sm:text-4xl">
        Les avis de vos clients,<br />et les alertes qui comptent.
      </h1>
      <p class="mx-auto mt-4 max-w-xl text-base text-gray-600">
        Revu collecte les avis de vos clients par QR code et vous prévient
        automatiquement dès qu’un problème revient — avant qu’il ne vous coûte des clients.
      </p>
      <div class="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <NuxtLink
          to="/login"
          class="w-full rounded-xl bg-brand px-6 py-3.5 font-semibold text-white transition hover:bg-brand-dark active:scale-[0.98] sm:w-auto"
        >
          Accéder à mon espace
        </NuxtLink>
      </div>
    </section>

    <!-- HOW IT WORKS -->
    <section class="mx-auto max-w-5xl px-5 pb-20">
      <h2 class="text-center text-xl font-bold">Comment ça marche</h2>
      <div class="mt-10 grid gap-6 sm:grid-cols-3">
        <div
          v-for="(etape, i) in etapes"
          :key="etape.titre"
          class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <span class="flex h-9 w-9 items-center justify-center rounded-full bg-brand-light font-bold text-brand-dark">
            {{ i + 1 }}
          </span>
          <h3 class="mt-4 font-semibold">{{ etape.titre }}</h3>
          <p class="mt-1.5 text-sm text-gray-600">{{ etape.texte }}</p>
        </div>
      </div>
    </section>

    <!-- FOOTER -->
    <footer class="border-t border-gray-200">
      <div class="mx-auto flex max-w-5xl flex-col items-center gap-2 px-5 py-8 text-center text-xs text-gray-400 sm:flex-row sm:justify-between sm:text-left">
        <p>© 2026 Revu — Tous droits réservés</p>
        <p class="flex gap-3">
          <NuxtLink to="/mentions-legales" class="hover:underline">Mentions légales</NuxtLink>
          <NuxtLink to="/confidentialite" class="hover:underline">Confidentialité</NuxtLink>
        </p>
      </div>
    </footer>
  </div>
</template>
