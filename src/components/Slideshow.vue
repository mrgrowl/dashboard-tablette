<script setup lang="ts">
import { computed, markRaw, onMounted, onUnmounted, ref } from 'vue'
import ClockSlide from '../slides/ClockSlide.vue'
import TransitSlide from '../slides/TransitSlide.vue'
import CalendarSlide from '../slides/CalendarSlide.vue'
import EventsSlide from '../slides/EventsSlide.vue'
import { useFullscreen } from '../composables/useFullscreen'
import { useCalendar } from '../composables/useCalendar'
import { useTcl, STOPS, LINE_GROUPS } from '../composables/useTcl'

const { isFullscreen } = useFullscreen()
const { startCalendarPolling, stopCalendarPolling } = useCalendar()
const { startTclPolling, stopTclPolling } = useTcl()

const SLIDE_DURATION_MS = 30_000
const TRANSIT_SLIDE_DURATION_MS = 15_000 // métro/tram tournent plus vite que le reste

interface Slide {
  key: string
  component: unknown
  props?: Record<string, unknown>
  duration: number
}

// Purement statique (STOPS/LINE_GROUPS ne changent jamais) : ne dépend d'aucune
// donnée live (départs TCL, évènements calendrier...). C'est essentiel — si ce
// tableau se recalculait à chaque rafraîchissement de données, le nœud transitionné
// par <transition> changerait d'identité en plein fondu et gelait l'écran (le
// composant recevait de nouvelles props pendant sa propre animation de sortie).
// Chaque diapo va donc chercher ses données live elle-même via les composables
// partagés (useTcl/useCalendar), qui se mettent à jour sans jamais toucher à
// cette liste ni à la diapo actuellement affichée.
const slides: Slide[] = [
  { key: 'clock', component: markRaw(ClockSlide), duration: SLIDE_DURATION_MS },
  ...LINE_GROUPS.map(({ line, stopKeys }) => {
    const first = STOPS[stopKeys[0]]
    return {
      key: line,
      component: markRaw(TransitSlide),
      props: {
        mode: first.mode,
        lineLabel: first.lineLabel,
        lineColor: first.lineColor,
        lineTextColor: '#ffffff',
        station: first.station,
        columns: stopKeys.map((key) => ({
          key,
          direction: STOPS[key].terminus,
        })),
      },
      duration: TRANSIT_SLIDE_DURATION_MS,
    }
  }),
  { key: 'calendar', component: markRaw(CalendarSlide), duration: SLIDE_DURATION_MS },
  { key: 'events', component: markRaw(EventsSlide), duration: SLIDE_DURATION_MS },
]

const current = ref(0)
const currentSlide = computed(() => slides[current.value])
let slideTimer: number | undefined

const now = ref(new Date())
const timeLabel = computed(() => now.value.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))
let clockTimer: number | undefined

// Filet de sécurité pour <transition mode="out-in"> : sortie et entrée
// attendent chacune un événement transitionend pour continuer, et si cet
// événement est raté (onglet en arrière-plan, perte de focus, changement de
// diapo trop rapproché...), Vue reste bloqué indéfiniment sur un écran figé —
// reproduit à volonté en testant (sortie ET entrée, séparément). On force donc
// la suite nous-mêmes si l'événement ne vient pas, sans changer l'animation
// CSS elle-même.
function withTransitionFallback(el: Element, done: () => void) {
  let finished = false
  const finish = () => {
    if (finished) return
    finished = true
    el.removeEventListener('transitionend', finish)
    done()
  }
  el.addEventListener('transitionend', finish)
  window.setTimeout(finish, 700) // durée du fondu (0.6s) + marge
}

function goTo(index: number) {
  current.value = index
  restartSlideTimer()
}

function next() {
  current.value = (current.value + 1) % slides.length
}

// setTimeout récursif (pas setInterval) : chaque diapo a sa propre durée
// (voir TRANSIT_SLIDE_DURATION_MS), relue à chaque cycle via currentSlide.
function restartSlideTimer() {
  window.clearTimeout(slideTimer)
  slideTimer = window.setTimeout(() => {
    next()
    restartSlideTimer()
  }, currentSlide.value.duration)
}

onMounted(() => {
  restartSlideTimer()
  startTclPolling()
  startCalendarPolling()
  clockTimer = window.setInterval(() => (now.value = new Date()), 1000)
})

onUnmounted(() => {
  window.clearTimeout(slideTimer)
  window.clearInterval(clockTimer)
  stopTclPolling()
  stopCalendarPolling()
})
</script>

<template>
  <div class="slideshow">
    <transition name="fade" mode="out-in" @enter="withTransitionFallback" @leave="withTransitionFallback">
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
