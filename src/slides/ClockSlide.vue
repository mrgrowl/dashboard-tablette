<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

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
  second: '2-digit',
})

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})
</script>

<template>
  <section class="slide clock">
    <p class="time">{{ timeFormatter.format(now) }}</p>
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
  gap: 0.5rem;
}

.time {
  font-size: clamp(4rem, 16vw, 12rem);
  font-weight: 700;
  margin: 0;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}

.date {
  font-size: clamp(1.2rem, 3vw, 2rem);
  color: var(--fg-muted);
  margin: 0;
  text-transform: capitalize;
}
</style>
