<script setup lang="ts">
import { computed } from 'vue'
import { useWeather } from '../composables/useWeather'
import WeatherIcon from '../components/WeatherIcon.vue'

// Seul `day` est une prop stable ('today'/'tomorrow' ne change jamais pour ce
// slide) : les données live (prévisions, erreur, chargement) sont lues
// directement du composable partagé, pas passées en prop — ça évite que ce
// composant reçoive de nouvelles props (et change d'identité pour
// <transition>) à chaque rafraîchissement Open-Meteo (voir Slideshow.vue).
const props = defineProps<{
  day: 'today' | 'tomorrow'
}>()

const { today, tomorrow, error, loading } = useWeather()

const forecast = computed(() => (props.day === 'today' ? today.value : tomorrow.value))
const dayLabel = computed(() => (props.day === 'today' ? "Aujourd'hui" : 'Demain'))

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
const dateLabel = computed(() => {
  const date = new Date()
  if (props.day === 'tomorrow') date.setDate(date.getDate() + 1)
  return dateFormatter.format(date)
})
</script>

<template>
  <section class="slide weather">
    <header class="head">
      <div class="head-text">
        <p class="city">Lyon</p>
        <h2>{{ dayLabel }}</h2>
      </div>
      <p class="date">{{ dateLabel }}</p>
    </header>

    <p v-if="loading && !forecast" class="status loading">Chargement de la météo…</p>
    <p v-else-if="error && !forecast" class="status error">{{ error }}</p>
    <template v-else-if="forecast">
      <div class="periods">
        <div v-for="(p, i) in forecast.periods" :key="p.label" class="period" :style="{ '--i': i }">
          <span class="period-label">{{ p.label }}</span>
          <WeatherIcon :name="p.icon" class="period-icon" />
          <span class="period-temp">{{ p.temp }}°</span>
          <span class="period-condition">{{ p.condition }}</span>
        </div>
      </div>

      <div class="hourly">
        <div v-for="(h, i) in forecast.hourly" :key="h.hour" class="hour" :style="{ '--i': i }">
          <span class="hour-label">{{ h.hour }}</span>
          <WeatherIcon :name="h.icon" class="hour-icon" />
          <span class="hour-temp">{{ h.temp }}°</span>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.weather {
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
  /* Laisse la place à l'horloge globale (Slideshow.vue), affichée en overlay
     en haut à droite de chaque diapo. */
  padding-right: clamp(6rem, 10vw, 8rem);
}

.city {
  margin: 0 0 0.2rem;
  color: var(--accent, #4dd0c7);
  font-size: clamp(0.8rem, 1.6vw, 1.6rem);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.head h2 {
  margin: 0;
  font-size: clamp(1.6rem, 3.5vw, 3.4rem);
  font-weight: 800;
}

.date {
  margin: 0;
  color: var(--fg-muted, rgba(244, 246, 248, 0.5));
  font-size: clamp(1rem, 2vw, 1.8rem);
  font-weight: 600;
  text-transform: capitalize;
}

.status {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  font-size: clamp(1.1rem, 2.4vw, 2.4rem);
  font-weight: 700;
  text-align: center;
}

.status.loading {
  color: var(--fg-muted);
  animation: soon-pulse 1.6s ease-in-out infinite;
}

.status.error {
  color: #ff6b6b;
}

@keyframes soon-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.55;
  }
}

.periods {
  display: flex;
  gap: clamp(1rem, 2.5vw, 2rem);
  flex: 1;
}

.period {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(0.4rem, 1vw, 0.8rem);
  padding: clamp(1rem, 2.5vw, 2rem);
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

.period-label {
  font-size: clamp(0.85rem, 1.7vw, 1.5rem);
  font-weight: 700;
  color: var(--fg-muted, rgba(244, 246, 248, 0.6));
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.period-icon {
  font-size: clamp(2.2rem, 5vw, 4.5rem);
  line-height: 1;
}

.period-temp {
  font-size: clamp(1.6rem, 3.4vw, 3.2rem);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.period-condition {
  font-size: clamp(0.85rem, 1.7vw, 1.5rem);
  color: var(--fg-muted, rgba(244, 246, 248, 0.6));
  text-align: center;
}

.hourly {
  display: flex;
  gap: clamp(0.6rem, 1.6vw, 1.2rem);
  flex: 1;
}

.hour {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(0.3rem, 0.8vw, 0.6rem);
  padding: clamp(0.7rem, 1.8vw, 1.4rem) clamp(0.4rem, 1vw, 0.8rem);
  background: var(--bg-elevated, rgba(255, 255, 255, 0.03));
  border-radius: 0.9rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
  animation: row-in 0.5s ease both;
  animation-delay: calc(var(--i, 0) * 60ms);
}

.hour-label {
  font-size: clamp(0.75rem, 1.4vw, 1.2rem);
  font-weight: 700;
  color: var(--fg-muted, rgba(244, 246, 248, 0.55));
}

.hour-icon {
  font-size: clamp(1.4rem, 3vw, 2.6rem);
  line-height: 1;
}

.hour-temp {
  font-size: clamp(1rem, 2vw, 1.8rem);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
</style>
