<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{ modelValue: boolean; currentUrl?: string }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; save: [url: string] }>()

const url = ref('')

watch(
  () => props.modelValue,
  (open) => {
    if (open) url.value = props.currentUrl ?? ''
  },
)

function handleSubmit() {
  if (!url.value) return
  emit('save', url.value)
  emit('update:modelValue', false)
}

function close() {
  emit('update:modelValue', false)
}
</script>

<template>
  <div v-if="modelValue" class="overlay" @click.self="close">
    <form class="modal" @submit.prevent="handleSubmit">
      <h2>Lien du calendrier</h2>
      <p class="hint">
        Colle l'adresse secrète au format iCal de ton agenda Google (Paramètres du calendrier →
        Intégrer l'agenda → Adresse secrète au format iCal).
      </p>
      <label>
        <span>URL iCal</span>
        <input
          v-model="url"
          type="url"
          placeholder="https://calendar.google.com/calendar/ical/..."
          required
          autofocus
        />
      </label>
      <div class="actions">
        <button type="button" class="secondary" @click="close">Fermer</button>
        <button type="submit" class="primary">Enregistrer</button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.overlay {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(4, 8, 14, 0.72);
  backdrop-filter: blur(6px);
}

.modal {
  width: min(90vw, 28rem);
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  padding: clamp(1.5rem, 4vw, 2.25rem);
  border-radius: 1.25rem;
  background: #10161f;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  color: #f4f6f8;
}

.modal h2 {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 800;
}

.hint {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.4;
  color: rgba(244, 246, 248, 0.6);
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.85rem;
  color: rgba(244, 246, 248, 0.75);
}

input {
  padding: 0.7rem 0.9rem;
  border-radius: 0.6rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: #0b0f14;
  color: #f4f6f8;
  font-size: 1rem;
}

input:focus {
  outline: 2px solid var(--accent, #4dd0c7);
  outline-offset: 1px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  margin-top: 0.3rem;
}

button {
  padding: 0.7rem 1.1rem;
  border-radius: 0.6rem;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  border: none;
  transition: filter 0.15s ease;
}

button:hover {
  filter: brightness(1.08);
}

button.primary {
  background: var(--accent, #4dd0c7);
  color: #0b0f14;
}

button.secondary {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: #f4f6f8;
}
</style>
