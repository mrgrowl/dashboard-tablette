<script setup lang="ts">
interface Departure {
  destination: string
  minutes: number
  isLast?: boolean
}

interface Column {
  direction: string
  departures: Departure[]
  errorMessage?: string | null
}

withDefaults(
  defineProps<{
    mode: 'metro' | 'tramway'
    lineLabel: string
    lineColor: string
    lineTextColor?: string
    station: string
    columns: Column[]
  }>(),
  {
    lineTextColor: '#0b0f14',
  },
)
</script>

<template>
  <section class="slide transit">
    <div class="glow" :style="{ background: lineColor }" />

    <header class="head">
      <div class="badge" :style="{ background: lineColor, color: lineTextColor }">
        {{ lineLabel }}
      </div>
      <div class="head-text">
        <p class="mode">
          <svg v-if="mode === 'metro'" viewBox="0 0 24 24" class="mode-icon" aria-hidden="true">
            <path
              fill="currentColor"
              d="M12 2c-4.4 0-8 .5-8 4v9.5A3.5 3.5 0 0 0 7.5 19L6 20.5v.5h2.2l2-2h3.6l2 2H18v-.5L16.5 19A3.5 3.5 0 0 0 20 15.5V6c0-3.5-3.6-4-8-4Zm-4.5 4h9a1 1 0 0 1 1 1v3.5a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1ZM8 15.75a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Zm8 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Z"
            />
          </svg>
          <svg v-else viewBox="0 0 24 24" class="mode-icon" aria-hidden="true">
            <path
              fill="currentColor"
              d="M4 16.5V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10.5a2.5 2.5 0 0 1-2.5 2.5H18l1.5 2v.5h-2l-1.5-2h-7.9l-1.5 2H5v-.5L6.5 19H6.5A2.5 2.5 0 0 1 4 16.5ZM6.5 6a.5.5 0 0 0-.5.5V10h12V6.5a.5.5 0 0 0-.5-.5ZM6 12v3.5c0 .28.22.5.5.5h11a.5.5 0 0 0 .5-.5V12Zm1.5 2.25a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm9 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z"
            />
          </svg>
          {{ mode === 'metro' ? 'Métro' : 'Tramway' }}
        </p>
        <p class="station">Arrêt {{ station }}</p>
      </div>
    </header>

    <div class="columns">
      <template v-for="(col, i) in columns" :key="i">
        <div class="column">
          <h2 class="direction">→ {{ col.direction }}</h2>

          <p v-if="col.errorMessage" class="error">{{ col.errorMessage }}</p>
          <ul v-else-if="col.departures.length > 0" class="departures">
            <li
              v-for="(d, di) in col.departures"
              :key="d.destination + di"
              class="departure"
              :class="{ last: d.isLast }"
            >
              <span class="dest">
                {{ d.destination }}
                <span v-if="d.isLast" class="last-badge">Dernier</span>
              </span>
              <span class="minutes" :class="{ soon: d.minutes <= 2 }">
                <template v-if="d.minutes === 0">à quai</template>
                <template v-else>{{ d.minutes }} min</template>
              </span>
            </li>
          </ul>
          <p v-else class="no-more">Plus d'horaire ce soir !</p>
        </div>
        <div v-if="i < columns.length - 1" class="divider" />
      </template>
    </div>
  </section>
</template>

<style scoped>
.transit {
  position: relative;
  height: 100%;
  width: 100%;
  background: #0b0f14;
  overflow: hidden;
  padding: clamp(1.5rem, 5vw, 4rem);
  display: flex;
  flex-direction: column;
  gap: clamp(1.25rem, 3vw, 2.5rem);
}

.glow {
  position: absolute;
  top: -30%;
  right: -20%;
  width: 70vw;
  height: 70vw;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0.25;
  pointer-events: none;
}

.head {
  position: relative;
  display: flex;
  align-items: center;
  gap: clamp(1rem, 3vw, 2rem);
}

.badge {
  flex: none;
  width: clamp(3rem, 6vw, 4.5rem);
  height: clamp(3rem, 6vw, 4.5rem);
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: clamp(1.2rem, 2.4vw, 1.7rem);
  box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.08);
}

.mode {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0 0 0.2rem;
  color: var(--fg-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: clamp(0.8rem, 1.4vw, 1rem);
}

.mode-icon {
  width: 1.1em;
  height: 1.1em;
}

.station {
  margin: 0;
  color: var(--fg-muted);
  font-size: clamp(1.1rem, 2.4vw, 1.6rem);
  font-weight: 700;
}

.columns {
  position: relative;
  flex: 1;
  display: flex;
  gap: clamp(1.25rem, 3vw, 2.5rem);
  min-height: 0;
}

.column {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: clamp(1rem, 2.5vw, 1.5rem);
}

.divider {
  flex: none;
  width: 1px;
  align-self: stretch;
  background: rgba(255, 255, 255, 0.1);
}

h2.direction {
  margin: 0;
  font-size: clamp(1.3rem, 3vw, 2rem);
  font-weight: 800;
  line-height: 1.15;
}

.departures {
  position: relative;
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: clamp(0.6rem, 1.6vw, 1rem);
  flex: 1;
  justify-content: center;
  min-width: 0;
}

.departure {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.3rem 0.6rem;
  padding: clamp(0.7rem, 1.8vw, 1.1rem) clamp(0.9rem, 2.2vw, 1.4rem);
  background: var(--bg-elevated);
  border-radius: 0.9rem;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.dest {
  font-size: clamp(0.9rem, 1.9vw, 1.25rem);
  font-weight: 600;
  min-width: 0;
}

.minutes {
  font-variant-numeric: tabular-nums;
  font-size: clamp(1.05rem, 2.2vw, 1.5rem);
  font-weight: 700;
  color: var(--accent);
}

.minutes.soon {
  color: #ff6b6b;
}

.departure.last {
  background: rgba(255, 171, 64, 0.12);
  border-color: rgba(255, 171, 64, 0.45);
}

.last-badge {
  display: inline-block;
  margin-left: 0.5em;
  padding: 0.15em 0.55em;
  border-radius: 999px;
  background: #ffab40;
  color: #0b0f14;
  font-size: 0.55em;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  vertical-align: middle;
}

.no-more {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  color: var(--fg-muted);
  font-size: clamp(1rem, 2.2vw, 1.4rem);
  font-weight: 700;
  text-align: center;
}

.error {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  color: #ff6b6b;
  font-size: clamp(0.9rem, 1.9vw, 1.25rem);
  font-weight: 700;
  text-align: center;
}
</style>
