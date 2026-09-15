<script setup lang="ts">
import { computed } from 'vue'
import type { CalendarEvent } from '../composables/useCalendar'

const props = defineProps<{
  events: CalendarEvent[]
  error?: string | null
}>()

// Évènements récurrents perso à masquer de cette vue (pas du calendrier mensuel).
const HIDDEN_SUMMARIES = ['Cours', 'Entreprise']

const upcoming = computed(() => {
  const now = new Date()
  return props.events
    .filter((e) => e.end >= now && !HIDDEN_SUMMARIES.includes(e.summary))
    .slice(0, 6)
})

function formatWhen(e: CalendarEvent): string {
  if (e.allDay) {
    return e.start.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
  }
  const day = e.start.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
  const time = e.start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  return `${day} · ${time}`
}
</script>

<template>
  <section class="slide events">
    <header class="head">
      <h2>Évènements à venir</h2>
    </header>

    <p v-if="error" class="error">{{ error }}</p>
    <ul v-else-if="upcoming.length > 0" class="list">
      <li v-for="(e, i) in upcoming" :key="i" class="item" :style="{ '--i': i }">
        <span class="when">{{ formatWhen(e) }}</span>
        <span class="summary">{{ e.summary }}</span>
      </li>
    </ul>
    <p v-else class="empty">Aucun évènement dans les prochains jours.</p>
  </section>
</template>

<style scoped>
.events {
  position: relative;
  height: 100%;
  width: 100%;
  background: #0b0f14;
  padding: clamp(1.5rem, 5vw, 4rem);
  display: flex;
  flex-direction: column;
  gap: clamp(1.5rem, 4vw, 2.5rem);
}

.head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.head h2 {
  margin: 0;
  font-size: clamp(1.6rem, 3.5vw, 2.4rem);
  font-weight: 800;
}

.error {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  color: #ff6b6b;
  font-size: clamp(1.1rem, 2.4vw, 1.6rem);
  font-weight: 700;
  text-align: center;
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: clamp(0.75rem, 2vw, 1.1rem);
  flex: 1;
  justify-content: center;
}

.item {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: clamp(0.8rem, 2vw, 1.2rem) clamp(1.2rem, 3vw, 2rem);
  background: var(--bg-elevated, rgba(255, 255, 255, 0.04));
  border-radius: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.06);
  animation: row-in 0.5s ease both;
  animation-delay: calc(var(--i, 0) * 80ms);
}

@keyframes row-in {
  from {
    opacity: 0;
    transform: translateY(0.5rem);
  }
}

.when {
  font-size: clamp(0.8rem, 1.6vw, 1rem);
  color: var(--accent, #4dd0c7);
  font-weight: 700;
  text-transform: capitalize;
}

.summary {
  font-size: clamp(1.05rem, 2.4vw, 1.5rem);
  font-weight: 600;
}

.empty {
  color: var(--fg-muted, rgba(244, 246, 248, 0.5));
  font-size: 1.1rem;
}
</style>
