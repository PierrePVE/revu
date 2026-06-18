<script setup lang="ts">
/**
 * StarRating.vue — reusable 1-to-5 star rating input (no external dependency).
 *
 * Two-way bound through `v-model` (0 means "not rated yet"). Built from real
 * <button> elements so it is keyboard-accessible and screen-reader friendly.
 */
const props = withDefaults(
  defineProps<{
    /** Selected value, 0..5 (v-model). */
    modelValue: number
    /** Visual size: 'lg' for the global rating, 'sm' for category rows. */
    size?: 'sm' | 'lg'
    /** Accessible group label (e.g. "Service"). */
    label?: string
  }>(),
  { size: 'lg', label: 'Note' },
)

const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

// Star currently hovered (0 = none); drives the live preview highlight.
const hover = ref(0)

/** Set the rating; clicking the current value again clears it back to 0. */
function choisir(n: number) {
  emit('update:modelValue', props.modelValue === n ? 0 : n)
}

const tailleClasse = computed(() => (props.size === 'lg' ? 'text-3xl' : 'text-xl'))
</script>

<template>
  <div class="flex items-center gap-1" role="radiogroup" :aria-label="label">
    <button
      v-for="n in 5"
      :key="n"
      type="button"
      role="radio"
      :aria-checked="modelValue === n"
      :aria-label="`${n} étoile${n > 1 ? 's' : ''}`"
      class="rounded leading-none transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      :class="tailleClasse"
      @click="choisir(n)"
      @mouseenter="hover = n"
      @mouseleave="hover = 0"
    >
      <!-- Filled (green) up to the hovered/selected star, light grey beyond. -->
      <span :class="(hover || modelValue) >= n ? 'text-brand' : 'text-gray-300'">★</span>
    </button>
  </div>
</template>
