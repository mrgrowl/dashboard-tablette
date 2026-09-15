<script setup lang="ts">
import { computed } from 'vue'
import type { CalendarEvent } from '../composables/useCalendar'

const props = defineProps<{
  events: CalendarEvent[]
  error?: string | null
}>()

const now = new Date()
const monthLabel = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

const MAX_ITEMS = 3

interface DayItem {
  summary: string
  color: string
}

interface DayCell {
  day: number | null
  isToday: boolean
  items: DayItem[]
  overflow: number
}

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const itemsByDay = computed(() => {
  const days = new Map<number, DayItem[]>()
  for (const e of props.events) {
    if (e.start.getMonth() === now.getMonth() && e.start.getFullYear() === now.getFullYear()) {
      const day = e.start.getDate()
      const list = days.get(day) ?? []
      list.push({ summary: e.summary, color: e.color })
      days.set(day, list)
    }
  }
  return days
})

const cells = computed<DayCell[]>(() => {
  const year = now.getFullYear()
  const month = now.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  // Décale pour que la semaine commence le lundi (getDay(): 0=dimanche).
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const result: DayCell[] = []
  for (let i = 0; i < leadingBlanks; i++) {
    result.push({ day: null, isToday: false, items: [], overflow: 0 })
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const items = itemsByDay.value.get(day) ?? []
    result.push({
      day,
      isToday: day === now.getDate(),
      items: items.slice(0, MAX_ITEMS),
      overflow: Math.max(0, items.length - MAX_ITEMS),
    })
  }
  return result
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
        :class="{ empty: cell.day === null, today: cell.isToday }"
      >
        <span v-if="cell.day !== null" class="day-number">{{ cell.day }}</span>
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
  gap: clamp(1.25rem, 3vw, 2rem);
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
  gap: clamp(0.4rem, 1vw, 0.7rem);
}

.weekday {
  text-align: center;
  font-size: clamp(0.75rem, 1.4vw, 0.95rem);
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
  gap: 0.25rem;
  padding: 0.35rem;
  border-radius: 0.7rem;
  background: var(--bg-elevated, rgba(255, 255, 255, 0.03));
  overflow: hidden;
}

.cell.empty {
  background: transparent;
}

.cell.today {
  background: var(--accent, #4dd0c7);
}

.day-number {
  flex: none;
  align-self: flex-start;
  line-height: 1;
  font-size: clamp(0.85rem, 1.8vw, 1.15rem);
  font-weight: 700;
}

.cell.today .day-number {
  color: #0b0f14;
  font-weight: 800;
}

.chips {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.chip {
  display: block;
  padding: 0.05rem 0.35rem;
  border-radius: 0.3rem;
  color: #0b0f14;
  font-size: clamp(0.55rem, 1.1vw, 0.75rem);
  font-weight: 700;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.overflow {
  font-size: clamp(0.5rem, 1vw, 0.65rem);
  font-weight: 700;
  color: var(--fg-muted, rgba(244, 246, 248, 0.6));
  padding-left: 0.2rem;
}

.cell.today .overflow {
  color: rgba(11, 15, 20, 0.7);
}
</style>
