<script setup lang="ts">
/**
 * pages/mentions-legales.vue — legal notice (mentions légales).
 *
 * Required by French law (art. 6-III LCEN) for any public website. The bracketed
 * [À COMPLÉTER] fields must be filled with the publisher's real details before
 * going live.
 */
useSeoMeta({ title: 'Mentions légales · Revu' })
</script>

<template>
  <main class="min-h-screen bg-surface px-5 py-12 text-ink">
    <article class="mx-auto max-w-2xl">
      <NuxtLink to="/login" class="text-sm text-brand transition hover:underline">← Retour</NuxtLink>
      <h1 class="mt-4 text-2xl font-bold">Mentions légales</h1>
      <p class="mt-1 text-sm text-gray-500">Dernière mise à jour : juin 2026</p>

      <section class="mt-8 space-y-2 text-sm leading-relaxed">
        <h2 class="text-base font-semibold">Éditeur du site</h2>
        <p>
          Le site <strong>Revu</strong> est édité par [À COMPLÉTER : nom / raison sociale],
          [À COMPLÉTER : statut juridique — ex. auto-entrepreneur, SAS],
          immatriculé sous le numéro [À COMPLÉTER : SIRET / RCS].
        </p>
        <p>Siège / adresse : [À COMPLÉTER : adresse postale].</p>
        <p>Contact : [À COMPLÉTER : adresse email de contact].</p>
        <p>Directeur de la publication : [À COMPLÉTER : nom].</p>
      </section>

      <section class="mt-6 space-y-2 text-sm leading-relaxed">
        <h2 class="text-base font-semibold">Hébergement</h2>
        <p>
          L'application est hébergée par [À COMPLÉTER : ex. Vercel Inc. / Railway], dont le
          siège est situé [À COMPLÉTER : adresse de l'hébergeur]. La base de données est
          hébergée par [À COMPLÉTER : ex. Railway].
        </p>
      </section>

      <section class="mt-6 space-y-2 text-sm leading-relaxed">
        <h2 class="text-base font-semibold">Propriété intellectuelle</h2>
        <p>
          L'ensemble des éléments du site (marque « Revu », interface, contenus) est protégé.
          Toute reproduction sans autorisation est interdite.
        </p>
      </section>

      <section class="mt-6 space-y-2 text-sm leading-relaxed">
        <h2 class="text-base font-semibold">Données personnelles</h2>
        <p>
          Le traitement des données personnelles est décrit dans notre
          <NuxtLink to="/confidentialite" class="text-brand hover:underline">politique de confidentialité</NuxtLink>.
        </p>
      </section>
    </article>
  </main>
</template>
