<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

const now = ref(new Date())
let timer: number | undefined

onMounted(() => {
  timer = window.setInterval(() => {
    now.value = new Date()
  }, 1000)
})

onUnmounted(() => {
  window.clearInterval(timer)
})

const timeFormatter = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
})

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

// Découpe en segments pour ne faire clignoter que les ":" (comme un réveil).
const timeParts = computed(() => timeFormatter.formatToParts(now.value))
</script>

<template>
  <section class="slide clock">
    <p class="time">
      <span v-for="(part, i) in timeParts" :key="i" :class="{ colon: part.type === 'literal' }">{{
        part.value
      }}</span>
    </p>
    <p class="date">{{ dateFormatter.format(now) }}</p>
  </section>
</template>

<style scoped>
.clock {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
  background: radial-gradient(circle at 50% 70%, #1a2436 0%, #0b0f14 70%);
  background-size: 130% 130%;
  gap: 0.5rem;
  animation: breathe 9s ease-in-out infinite;
}

.time {
  font-size: clamp(4rem, 16vw, 12rem);
  font-weight: 700;
  margin: 0;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}

.time .colon {
  animation: blink 1s steps(1, jump-none) infinite;
}

.date {
  font-size: clamp(1.2rem, 3vw, 2rem);
  color: var(--fg-muted);
  margin: 0;
  text-transform: capitalize;
  animation: fade-in 0.6s ease both;
}

@keyframes blink {
  50% {
    opacity: 0.2;
  }
}

@keyframes breathe {
  0%,
  100% {
    background-position: 50% 60%;
  }
  50% {
    background-position: 50% 45%;
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(0.4rem);
  }
}
</style>
