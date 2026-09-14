<script setup lang="ts">
import { computed, markRaw, onMounted, onUnmounted, ref } from 'vue'
import ClockSlide from '../slides/ClockSlide.vue'
import TransitSlide from '../slides/TransitSlide.vue'
import CalendarSlide from '../slides/CalendarSlide.vue'
import EventsSlide from '../slides/EventsSlide.vue'
import CredentialsModal from './CredentialsModal.vue'
import CalendarLinkModal from './CalendarLinkModal.vue'
import { useFullscreen } from '../composables/useFullscreen'
import { useCalendar } from '../composables/useCalendar'

const { isFullscreen } = useFullscreen()
const {
  calendarUrl,
  events: calendarEvents,
  hasCalendarUrl,
  setCalendarUrl,
  startCalendarPolling,
  stopCalendarPolling,
} = useCalendar()
const showCalendarLinkModal = ref(false)

const SLIDE_DURATION_MS = 30_000
const TCL_REFRESH_MS = 25_000

const STORAGE_LOGIN_KEY = 'tcl_login'
const STORAGE_PASSWORD_KEY = 'tcl_password'

const tclLogin = ref(localStorage.getItem(STORAGE_LOGIN_KEY) ?? '')
const tclPassword = ref(localStorage.getItem(STORAGE_PASSWORD_KEY) ?? '')
const hasCredentials = computed(() => Boolean(tclLogin.value && tclPassword.value))

function handleCredentialsSubmit(login: string, password: string) {
  tclLogin.value = login
  tclPassword.value = password
  localStorage.setItem(STORAGE_LOGIN_KEY, login)
  localStorage.setItem(STORAGE_PASSWORD_KEY, password)
  fetchTclDepartures()
}

function clearCredentials() {
  tclLogin.value = ''
  tclPassword.value = ''
  localStorage.removeItem(STORAGE_LOGIN_KEY)
  localStorage.removeItem(STORAGE_PASSWORD_KEY)
}

const TCL_PASSAGES_URL =
  'https://data.grandlyon.com/fr/datapusher/ws/rdata/tcl_sytral.tclpassagearret/all.json?maxfeatures=-1&start=1'

interface StopConfig {
  id: number
  terminus: string
  mode: 'metro' | 'tramway'
  lineLabel: string
  lineColor: string
  station: string
}

// Chaque ligne a des services partiels qui passent par l'arrêt sans aller
// jusqu'au terminus complet (ex: T1 s'arrête parfois à La Doua, Palais Justice...
// la ligne B s'arrête parfois à Stade de Gerland, Place Jean Jaurès...) : on ne
// garde que les passages signés pour le terminus complet de chaque sens.
const STOPS = {
  liberteNord: { id: 32112, terminus: 'IUT Feyssine', mode: 'tramway', lineLabel: 'T1', lineColor: '#1565C0', station: 'Liberté' },
  liberteSud: { id: 32113, terminus: 'Debourg', mode: 'tramway', lineLabel: 'T1', lineColor: '#1565C0', station: 'Liberté' },
  guichardNord: { id: 46027, terminus: 'Charpennes Charles Hernu', mode: 'metro', lineLabel: 'B', lineColor: '#D62828', station: 'Place Guichard' },
  guichardSud: { id: 46026, terminus: 'St-Genis-Laval Hôp. Sud', mode: 'metro', lineLabel: 'B', lineColor: '#D62828', station: 'Place Guichard' },
} as const satisfies Record<string, StopConfig>

type StopKey = keyof typeof STOPS

interface Departure {
  destination: string
  minutes: number
  isLast?: boolean
}

interface TclRow {
  id: number
  direction: string
  delaipassage: string
}

const departures = ref<Record<StopKey, Departure[]>>(
  Object.fromEntries(Object.keys(STOPS).map((key) => [key, [] as Departure[]])) as Record<StopKey, Departure[]>,
)

function parseDelai(delaipassage: string): number {
  const match = /^(\d+)/.exec(delaipassage)
  return match ? Number(match[1]) : 0 // "Proche" ou autre libellé imminent
}

async function fetchTclDepartures() {
  if (!hasCredentials.value) return
  try {
    const auth = btoa(`${tclLogin.value}:${tclPassword.value}`)
    const res = await fetch(TCL_PASSAGES_URL, {
      headers: { Authorization: `Basic ${auth}` },
    })
    if (res.status === 401) {
      console.error('Identifiants Grand Lyon refusés, on redemande.')
      clearCredentials()
      return
    }
    if (!res.ok) throw new Error(`Grand Lyon API ${res.status}`)
    const data: { values: TclRow[] } = await res.json()

    const byStop = Object.fromEntries(Object.keys(STOPS).map((key) => [key, [] as Departure[]])) as Record<
      StopKey,
      Departure[]
    >
    for (const row of data.values) {
      for (const key of Object.keys(STOPS) as StopKey[]) {
        const stop = STOPS[key]
        if (row.id === stop.id && row.direction === stop.terminus) {
          byStop[key].push({ destination: row.direction, minutes: parseDelai(row.delaipassage) })
        }
      }
    }

    const DISPLAY_COUNT = 3
    const result = {} as Record<StopKey, Departure[]>
    for (const key of Object.keys(byStop) as StopKey[]) {
      const sorted = byStop[key].sort((a, b) => a.minutes - b.minutes)
      const displayed = sorted.slice(0, DISPLAY_COUNT)
      // Pas de 4e passage derrière dans la fenêtre temps réel (~60 min) : le
      // dernier affiché est probablement le dernier de la soirée.
      if (displayed.length > 0 && sorted.length < DISPLAY_COUNT + 1) {
        displayed[displayed.length - 1] = { ...displayed[displayed.length - 1], isLast: true }
      }
      result[key] = displayed
    }

    departures.value = result
  } catch (err) {
    console.error('Erreur récupération des départs TCL', err)
  }
}

interface Slide {
  key: string
  component: unknown
  props?: Record<string, unknown>
}

const slides = computed<Slide[]>(() => [
  { key: 'clock', component: markRaw(ClockSlide) },
  ...(Object.keys(STOPS) as StopKey[]).map((key) => {
    const stop = STOPS[key]
    return {
      key,
      component: markRaw(TransitSlide),
      props: {
        mode: stop.mode,
        lineLabel: stop.lineLabel,
        lineColor: stop.lineColor,
        lineTextColor: '#ffffff',
        station: stop.station,
        direction: stop.terminus,
        departures: departures.value[key],
      },
    }
  }),
  {
    key: 'calendar',
    component: markRaw(CalendarSlide),
    props: {
      events: calendarEvents.value,
      hasLink: hasCalendarUrl.value,
      onAddLink: () => (showCalendarLinkModal.value = true),
    },
  },
  {
    key: 'events',
    component: markRaw(EventsSlide),
    props: {
      events: calendarEvents.value,
      hasLink: hasCalendarUrl.value,
      onAddLink: () => (showCalendarLinkModal.value = true),
    },
  },
])

const current = ref(0)
const currentSlide = computed(() => slides.value[current.value])
let slideTimer: number | undefined
let tclTimer: number | undefined

const now = ref(new Date())
const timeLabel = computed(() => now.value.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))
let clockTimer: number | undefined

function goTo(index: number) {
  current.value = index
  restartSlideTimer()
}

function next() {
  current.value = (current.value + 1) % slides.value.length
}

function restartSlideTimer() {
  window.clearInterval(slideTimer)
  slideTimer = window.setInterval(next, SLIDE_DURATION_MS)
}

onMounted(() => {
  restartSlideTimer()
  fetchTclDepartures()
  tclTimer = window.setInterval(fetchTclDepartures, TCL_REFRESH_MS)
  startCalendarPolling()
  clockTimer = window.setInterval(() => (now.value = new Date()), 1000)
})

onUnmounted(() => {
  window.clearInterval(slideTimer)
  window.clearInterval(tclTimer)
  window.clearInterval(clockTimer)
  stopCalendarPolling()
})
</script>

<template>
  <div class="slideshow">
    <transition name="fade" mode="out-in">
      <component :is="currentSlide.component" v-bind="currentSlide.props" :key="currentSlide.key" />
    </transition>

    <div v-if="currentSlide.key !== 'clock'" class="mini-clock">{{ timeLabel }}</div>

    <div v-if="!isFullscreen" class="dots">
      <button
        v-for="(slide, i) in slides"
        :key="slide.key"
        class="dot"
        :class="{ active: i === current }"
        :aria-label="`Aller à la diapositive ${i + 1}`"
        @click="goTo(i)"
      />
    </div>

    <CredentialsModal v-if="!hasCredentials" @submit="handleCredentialsSubmit" />
    <CalendarLinkModal v-model="showCalendarLinkModal" :current-url="calendarUrl" @save="setCalendarUrl" />
  </div>
</template>

<style scoped>
.slideshow {
  position: relative;
  height: 100%;
  width: 100%;
}

.slideshow :deep(.slide) {
  position: absolute;
  inset: 0;
}

.mini-clock {
  position: absolute;
  left: max(1.5rem, env(safe-area-inset-left));
  bottom: max(1.5rem, env(safe-area-inset-bottom));
  z-index: 10;
  font-variant-numeric: tabular-nums;
  font-size: clamp(0.85rem, 1.6vw, 1.1rem);
  font-weight: 600;
  letter-spacing: 0.02em;
  color: rgba(244, 246, 248, 0.55);
}

.dots {
  position: absolute;
  left: 0;
  right: 0;
  bottom: max(1.5rem, env(safe-area-inset-bottom));
  display: flex;
  justify-content: center;
  gap: 0.6rem;
  z-index: 10;
}

.dot {
  width: 0.6rem;
  height: 0.6rem;
  border-radius: 999px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  padding: 0;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease;
}

.dot.active {
  background: var(--accent);
  transform: scale(1.3);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.6s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
