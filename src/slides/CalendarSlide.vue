<script setup lang="ts">
import { computed } from 'vue'
import { useCalendar } from '../composables/useCalendar'

// Pas de props pour les données live : lues directement du composable partagé
// pour ne jamais faire changer les props de ce composant depuis le parent au
// gré des rafraîchissements (voir le commentaire dans Slideshow.vue).
const { events, error } = useCalendar()

const now = new Date()
const monthLabel = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

const MAX_ITEMS = 2 // moins d'étiquettes mais plus grandes/lisibles sur écran kiosque

interface DayItem {
  summary: string
  color: string
}

interface DayCell {
  day: number
  isToday: boolean
  isOtherMonth: boolean
  items: DayItem[]
  overflow: number
}

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

const itemsByDate = computed(() => {
  const days = new Map<string, DayItem[]>()
  for (const e of events.value) {
    const key = dateKey(e.start)
    const list = days.get(key) ?? []
    list.push({ summary: e.summary, color: e.color })
    days.set(key, list)
  }
  return days
})

const today = new Date()

const cells = computed<DayCell[]>(() => {
  const year = now.getFullYear()
  const month = now.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  // Décale pour que la semaine commence le lundi (getDay(): 0=dimanche).
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  // Complète la dernière semaine jusqu'au dimanche, sans jamais laisser de trou.
  const trailingBlanks = (7 - ((leadingBlanks + daysInMonth) % 7)) % 7

  const dates: Date[] = []
  for (let i = leadingBlanks; i > 0; i--) dates.push(new Date(year, month, 1 - i))
  for (let day = 1; day <= daysInMonth; day++) dates.push(new Date(year, month, day))
  for (let i = 1; i <= trailingBlanks; i++) dates.push(new Date(year, month + 1, i))

  return dates.map((date) => {
    const items = itemsByDate.value.get(dateKey(date)) ?? []
    return {
      day: date.getDate(),
      isToday: dateKey(date) === dateKey(today),
      isOtherMonth: date.getMonth() !== month,
      items: items.slice(0, MAX_ITEMS),
      overflow: Math.max(0, items.length - MAX_ITEMS),
    }
  })
})
</script>

<template>
  <section class="slide calendar">
    <header class="head">
      <h2>{{ monthLabel }}</h2>
      <p v-if="error" class="error">{{ error }}</p>
    </header>

    <div class="grid">
      <div v-for="w in WEEKDAYS" :key="w" class="weekday">{{ w }}</div>
      <div
        v-for="(cell, i) in cells"
        :key="i"
        class="cell"
        :class="{ 'other-month': cell.isOtherMonth, today: cell.isToday }"
      >
        <span class="day-number">{{ cell.day }}</span>
        <div v-if="cell.items.length > 0" class="chips">
          <span
            v-for="(item, i) in cell.items"
            :key="i"
            class="chip"
            :style="{ background: item.color }"
            >{{ item.summary }}</span
          >
          <span v-if="cell.overflow > 0" class="overflow">+{{ cell.overflow }} autre{{ cell.overflow > 1 ? 's' : '' }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.calendar {
  position: relative;
  height: 100%;
  width: 100%;
  background: #0b0f14;
  padding: clamp(1.5rem, 5vw, 4rem);
  display: flex;
  flex-direction: column;
  gap: clamp(0.75rem, 1.5vw, 1.25rem);
}

.head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  /* Laisse la place à l'horloge globale (Slideshow.vue), affichée en overlay
     en haut à droite de chaque diapo — pertinent seulement quand .error
     s'affiche (dans ce coin), mais gratuit sinon. */
  padding-right: clamp(6rem, 10vw, 8rem);
}

.head h2 {
  margin: 0;
  font-size: clamp(1rem, 1.6vw, 1.4rem);
  font-weight: 800;
  text-transform: capitalize;
}

.error {
  margin: 0;
  color: #ff6b6b;
  font-size: clamp(0.8rem, 1.6vw, 1rem);
  font-weight: 600;
  text-align: right;
}

.grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: clamp(0.5rem, 1.1vw, 1rem);
  animation: fade-in 0.5s ease both;
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
}

.weekday {
  text-align: center;
  font-size: clamp(0.9rem, 1.7vw, 1.4rem);
  color: var(--fg-muted, rgba(244, 246, 248, 0.5));
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding-bottom: 0.4rem;
}

.cell {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: clamp(0.3rem, 0.8vw, 0.6rem);
  padding: clamp(0.5rem, 1.3vw, 1rem);
  border-radius: 0.7rem;
  background: var(--bg-elevated, rgba(255, 255, 255, 0.03));
  overflow: hidden;
}

.cell.other-month {
  background: transparent;
  opacity: 0.35;
}

.cell.today {
  background: var(--accent, #4dd0c7);
  animation: today-pulse 2.4s ease-in-out infinite;
}

@keyframes today-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(77, 208, 199, 0.45);
  }
  50% {
    box-shadow: 0 0 0 7px rgba(77, 208, 199, 0);
  }
}

.day-number {
  flex: none;
  align-self: flex-start;
  line-height: 1;
  font-size: clamp(1.1rem, 2.4vw, 2.2rem);
  font-weight: 700;
}

.cell.today .day-number {
  color: #0b0f14;
  font-weight: 800;
}

.chips {
  display: flex;
  flex-direction: column;
  gap: clamp(0.2rem, 0.5vw, 0.4rem);
  min-width: 0;
}

.chip {
  display: block;
  padding: clamp(0.15rem, 0.35vw, 0.3rem) clamp(0.45rem, 0.9vw, 0.7rem);
  border-radius: 0.4rem;
  color: #0b0f14;
  font-size: clamp(0.85rem, 1.7vw, 1.4rem);
  font-weight: 700;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  animation: chip-in 0.35s ease both;
}

@keyframes chip-in {
  from {
    opacity: 0;
    transform: scale(0.85);
  }
}

.overflow {
  font-size: clamp(0.75rem, 1.4vw, 1.1rem);
  font-weight: 700;
  color: var(--fg-muted, rgba(244, 246, 248, 0.6));
  padding-left: 0.2rem;
}

.cell.today .overflow {
  color: rgba(11, 15, 20, 0.7);
}
</style>
