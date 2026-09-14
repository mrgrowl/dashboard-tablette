<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{ submit: [login: string, password: string] }>()

const login = ref('')
const password = ref('')

function handleSubmit() {
  if (!login.value || !password.value) return
  emit('submit', login.value, password.value)
}
</script>

<template>
  <div class="overlay">
    <form class="modal" @submit.prevent="handleSubmit">
      <h2>Connexion Grand Lyon Data</h2>
      <p class="hint">
        Identifiants du compte "plateforme Data" (pas FranceConnect) — stockés uniquement dans ce
        navigateur, jamais envoyés ailleurs qu'à data.grandlyon.com.
      </p>
      <label>
        <span>Email</span>
        <input v-model="login" type="email" autocomplete="username" required autofocus />
      </label>
      <label>
        <span>Mot de passe</span>
        <input v-model="password" type="password" autocomplete="current-password" required />
      </label>
      <button type="submit">Se connecter</button>
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
  width: min(90vw, 26rem);
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

button {
  margin-top: 0.3rem;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 0.6rem;
  background: var(--accent, #4dd0c7);
  color: #0b0f14;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  transition: filter 0.15s ease;
}

button:hover {
  filter: brightness(1.08);
}
</style>
