<script setup lang="ts">
import { computed } from 'vue'
import type { CalendarEvent } from '../composables/useCalendar'
import { useFullscreen } from '../composables/useFullscreen'

const props = defineProps<{
  events: CalendarEvent[]
  hasLink: boolean
}>()

const emit = defineEmits<{ addLink: [] }>()

const { isFullscreen } = useFullscreen()

const upcoming = computed(() => {
  const now = new Date()
  return props.events.filter((e) => e.end >= now).slice(0, 6)
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
      <button v-if="!isFullscreen" class="add-link" @click="emit('addLink')">
        {{ hasLink ? 'Changer de lien' : 'Ajouter un lien' }}
      </button>
    </header>

    <ul v-if="upcoming.length > 0" class="list">
      <li v-for="(e, i) in upcoming" :key="i" class="item">
        <span class="when">{{ formatWhen(e) }}</span>
        <span class="summary">{{ e.summary }}</span>
      </li>
    </ul>
    <p v-else-if="hasLink" class="empty">Aucun évènement dans les prochains jours.</p>
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

.add-link {
  padding: 0.5rem 1rem;
  border-radius: 0.6rem;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: transparent;
  color: var(--fg-muted, rgba(244, 246, 248, 0.75));
  font-size: 0.9rem;
  cursor: pointer;
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
