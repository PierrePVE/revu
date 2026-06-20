<script setup lang="ts">
/**
 * pages/confidentialite.vue — privacy policy (RGPD).
 *
 * Note on the data model: customer reviews are ANONYMOUS (the `avis` table stores
 * only ratings + an optional free-text comment, no customer name/email). The only
 * personal data is the MERCHANT account. Retention periods below are proposals —
 * adjust the [À COMPLÉTER] values to your real choices before going live.
 */
useSeoMeta({ title: 'Politique de confidentialité · Revu' })
</script>

<template>
  <main class="min-h-screen bg-surface px-5 py-12 text-ink">
    <article class="mx-auto max-w-2xl">
      <NuxtLink to="/login" class="text-sm text-brand transition hover:underline">← Retour</NuxtLink>
      <h1 class="mt-4 text-2xl font-bold">Politique de confidentialité</h1>
      <p class="mt-1 text-sm text-gray-500">Dernière mise à jour : juin 2026</p>

      <section class="mt-8 space-y-2 text-sm leading-relaxed">
        <h2 class="text-base font-semibold">Responsable du traitement</h2>
        <p>
          Le responsable du traitement des données est [À COMPLÉTER : nom / raison sociale],
          joignable à l'adresse [À COMPLÉTER : email de contact].
        </p>
      </section>

      <section class="mt-6 space-y-2 text-sm leading-relaxed">
        <h2 class="text-base font-semibold">Données collectées</h2>
        <p><strong>Compte commerçant :</strong> nom du commerce, adresse email, mot de passe (stocké chiffré). Ces données sont fournies par le commerçant lors de la création de son compte.</p>
        <p><strong>Avis clients :</strong> les avis sont <strong>anonymes</strong>. Nous collectons uniquement des notes (1 à 5) et un commentaire libre facultatif. Aucune information d'identification du client (nom, email, adresse IP enregistrée durablement) n'est associée à un avis.</p>
        <p class="text-gray-600">
          Le champ commentaire étant libre, nous invitons les clients à ne pas y inscrire de
          données personnelles. Le cas échéant, toute donnée identifiante peut être supprimée
          sur demande.
        </p>
      </section>

      <section class="mt-6 space-y-2 text-sm leading-relaxed">
        <h2 class="text-base font-semibold">Finalités &amp; base légale</h2>
        <p>Les données du compte servent à fournir le service (accès au tableau de bord, authentification) — base légale : exécution du contrat. Les avis servent à produire les statistiques et alertes destinées au commerçant — base légale : intérêt légitime.</p>
      </section>

      <section class="mt-6 space-y-2 text-sm leading-relaxed">
        <h2 class="text-base font-semibold">Durées de conservation</h2>
        <p><strong>Compte commerçant :</strong> conservé pendant toute la durée de la relation, puis supprimé [À COMPLÉTER — proposition : 12 mois] après la clôture du compte.</p>
        <p><strong>Avis clients :</strong> conservés pendant la durée d'utilisation du service par le commerçant, puis supprimés automatiquement à la clôture de son compte. [À COMPLÉTER — option : définir une durée glissante max., ex. 36 mois.]</p>
      </section>

      <section class="mt-6 space-y-2 text-sm leading-relaxed">
        <h2 class="text-base font-semibold">Destinataires &amp; sous-traitants</h2>
        <p>Les données ne sont ni vendues ni cédées. Elles peuvent être traitées par nos sous-traitants techniques : l'hébergeur [À COMPLÉTER : Vercel / Railway] et le service d'envoi d'emails <strong>Brevo</strong> (emails transactionnels, ex. réinitialisation de mot de passe).</p>
      </section>

      <section class="mt-6 space-y-2 text-sm leading-relaxed">
        <h2 class="text-base font-semibold">Vos droits</h2>
        <p>Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation et d'opposition. Pour les exercer, écrivez à [À COMPLÉTER : email de contact]. Vous pouvez également saisir la CNIL.</p>
      </section>

      <section class="mt-6 space-y-2 text-sm leading-relaxed">
        <h2 class="text-base font-semibold">Cookies</h2>
        <p>Revu n'utilise qu'un seul cookie, strictement nécessaire au fonctionnement : le cookie de session (<code class="rounded bg-gray-100 px-1">revu_session</code>), qui maintient le commerçant connecté. Aucun cookie de mesure d'audience ou de publicité n'est déposé — aucune bannière de consentement n'est donc requise.</p>
      </section>
    </article>
  </main>
</template>
