<script setup lang="ts">
import { computed } from 'vue'
import { useTcl, type StopKey } from '../composables/useTcl'

// Colonnes STABLES (juste la clé d'arrêt + le libellé de sens) : les données
// live (départs, erreur, chargement) sont lues depuis useTcl() ci-dessous,
// pas passées en prop — ça évite que ce composant reçoive de nouvelles props
// (et donc change d'identité perçue par <transition>) à chaque rafraîchissement.
interface ColumnDef {
  key: StopKey
  direction: string
  prevStop: string
  nextStop: string
}

const props = withDefaults(
  defineProps<{
    mode: 'metro' | 'tramway'
    lineLabel: string
    lineColor: string
    lineTextColor?: string
    station: string
    columns: ColumnDef[]
  }>(),
  {
    lineTextColor: '#0b0f14',
  },
)

const { departures, error, loading } = useTcl()

// Pas de position GPS réelle disponible pour ces lignes (le flux temps réel
// SIRI-Lite de Grand Lyon couvre les bus et T2-T7, mais ni T1 ni le métro) :
// on approxime la position du prochain véhicule en supposant un temps de
// trajet moyen entre l'arrêt précédent et notre arrêt, et on en déduit une
// progression 0→100 % à partir du compte à rebours déjà affiché. Le marqueur
// ne parcourt donc que le segment "arrêt précédent → notre arrêt" (le seul
// pour lequel on a une estimation) ; le segment suivant n'est affiché que
// comme repère de direction, sans animation.
const AVERAGE_LEG_MINUTES: Record<'metro' | 'tramway', number> = {
  tramway: 3,
  metro: 2,
}

// Position du marqueur sur la piste à 3 points (arrêt précédent = 0,
// notre arrêt = 50, arrêt suivant = 100) : 0→50 pendant l'approche.
function trackingPosition(minutes: number): number {
  const leg = AVERAGE_LEG_MINUTES[props.mode]
  const legProgress = Math.min(1, Math.max(0, 1 - minutes / leg))
  return Math.round(legProgress * 50)
}

const resolvedColumns = computed(() =>
  props.columns.map((col) => {
    const stopDepartures = departures.value[col.key] ?? []
    return {
      direction: col.direction,
      prevStop: col.prevStop,
      nextStop: col.nextStop,
      departures: stopDepartures,
      errorMessage: error.value,
      loading: loading.value,
      trackingPosition: stopDepartures.length > 0 ? trackingPosition(stopDepartures[0].minutes) : null,
    }
  }),
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
      <template v-for="(col, i) in resolvedColumns" :key="i">
        <div class="column">
          <h2 class="direction">→ {{ col.direction }}</h2>

          <div v-if="col.trackingPosition !== null" class="route">
            <div class="route-track">
              <div class="route-fill" :style="{ width: col.trackingPosition + '%' }" />
              <div class="route-point" style="left: 0%" />
              <div class="route-point route-point--here" style="left: 50%" />
              <div class="route-point" style="left: 100%" />
              <div class="route-marker" :style="{ left: col.trackingPosition + '%', background: lineColor, color: lineColor }" />
            </div>
            <div class="route-labels">
              <span class="route-label">{{ col.prevStop }}</span>
              <span class="route-label route-label--here">{{ station }}</span>
              <span class="route-label route-label--muted">{{ col.nextStop }}</span>
            </div>
            <span class="route-caption">Position estimée</span>
          </div>

          <p v-if="col.loading" class="loading">Chargement des horaires…</p>
          <p v-else-if="col.errorMessage" class="error">{{ col.errorMessage }}</p>
          <ul v-else-if="col.departures.length > 0" class="departures">
            <li
              v-for="(d, di) in col.departures"
              :key="d.destination + di"
              class="departure"
              :class="{ last: d.isLast }"
              :style="{ '--i': di }"
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
        <div v-if="i < resolvedColumns.length - 1" class="divider" />
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
  animation: glow-pulse 7s ease-in-out infinite;
}

@keyframes glow-pulse {
  0%,
  100% {
    opacity: 0.18;
    transform: scale(1);
  }
  50% {
    opacity: 0.3;
    transform: scale(1.06);
  }
}

.head {
  position: relative;
  display: flex;
  align-items: center;
  gap: clamp(1rem, 3vw, 2rem);
}

.badge {
  flex: none;
  width: clamp(3rem, 6vw, 7rem);
  height: clamp(3rem, 6vw, 7rem);
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: clamp(1.2rem, 2.4vw, 2.6rem);
  box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.08);
  animation: badge-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes badge-in {
  from {
    opacity: 0;
    transform: scale(0.6);
  }
}

.mode {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0 0 0.2rem;
  color: var(--fg-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: clamp(0.8rem, 1.4vw, 1.5rem);
}

.mode-icon {
  width: 1.1em;
  height: 1.1em;
}

.station {
  margin: 0;
  color: var(--fg-muted);
  font-size: clamp(1.1rem, 2.4vw, 2.6rem);
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
  font-size: clamp(1.3rem, 3vw, 3.4rem);
  font-weight: 800;
  line-height: 1.15;
}

.route {
  display: flex;
  flex-direction: column;
  gap: clamp(0.5rem, 1.2vw, 0.8rem);
}

.route-track {
  position: relative;
  height: clamp(0.9rem, 2vw, 1.3rem);
  margin: 0 clamp(0.4rem, 1vw, 0.65rem);
}

.route-track::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 0.2rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-50%);
}

.route-fill {
  position: absolute;
  top: 50%;
  left: 0;
  height: 0.2rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-50%);
  transition: width 1s ease;
}

.route-point {
  position: absolute;
  top: 50%;
  width: 0.6rem;
  height: 0.6rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%);
}

.route-point--here {
  width: 0.8rem;
  height: 0.8rem;
  background: var(--fg);
}

/* Marqueur du véhicule : nettement plus visible que les arrêts (plus grand,
   couleur de la ligne, halo lumineux + pulsation) — c'est le point demandé. */
.route-marker {
  position: absolute;
  top: 50%;
  width: clamp(1rem, 2.2vw, 1.5rem);
  height: clamp(1rem, 2.2vw, 1.5rem);
  border-radius: 999px;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 0 3px #0b0f14, 0 0 14px 3px currentColor;
  transition: left 1s ease;
  animation: marker-pulse 1.8s ease-in-out infinite;
}

@keyframes marker-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 3px #0b0f14, 0 0 14px 3px currentColor;
  }
  50% {
    box-shadow: 0 0 0 3px #0b0f14, 0 0 20px 6px currentColor;
  }
}

.route-labels {
  display: flex;
  justify-content: space-between;
  gap: 0.4rem;
}

.route-label {
  flex: 1;
  min-width: 0;
  font-size: clamp(0.6rem, 1.1vw, 0.85rem);
  font-weight: 600;
  color: var(--fg-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.route-label--here {
  flex: 1.3;
  text-align: center;
  color: var(--fg);
  font-weight: 800;
}

.route-label--muted {
  text-align: right;
  opacity: 0.7;
}

.route-caption {
  font-size: clamp(0.6rem, 1.1vw, 0.8rem);
  color: var(--fg-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  opacity: 0.7;
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
  padding: clamp(0.7rem, 1.8vw, 1.8rem) clamp(0.9rem, 2.2vw, 2.2rem);
  background: var(--bg-elevated);
  border-radius: 0.9rem;
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

.dest {
  font-size: clamp(0.9rem, 1.9vw, 2.1rem);
  font-weight: 600;
  min-width: 0;
}

.minutes {
  font-variant-numeric: tabular-nums;
  font-size: clamp(1.05rem, 2.2vw, 2.6rem);
  font-weight: 700;
  color: var(--accent);
}

.minutes.soon {
  color: #ff6b6b;
  animation: soon-pulse 1.6s ease-in-out infinite;
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
  animation: badge-pulse 2.4s ease-in-out infinite;
}

@keyframes badge-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.no-more {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  color: var(--fg-muted);
  font-size: clamp(1rem, 2.2vw, 2.3rem);
  font-weight: 700;
  text-align: center;
}

.loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  color: var(--fg-muted);
  font-size: clamp(1rem, 2.2vw, 2.3rem);
  font-weight: 700;
  text-align: center;
  animation: soon-pulse 1.6s ease-in-out infinite;
}

.error {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  color: #ff6b6b;
  font-size: clamp(0.9rem, 1.9vw, 2.1rem);
  font-weight: 700;
  text-align: center;
}
</style>
