import { computed, ref } from 'vue'
import ICAL from 'ical.js'

// Relais maison : Google ne renvoie pas de CORS sur les flux ICS, donc on
// passe par notre propre petit serveur (server/calendar-relay.js) qui fait la
// requête à notre place. Par défaut on appelle une URL relative "/api/..." :
// en dev le proxy Vite (vite.config.ts) la redirige vers localhost:3002, en
// prod c'est nginx qui la redirige vers le service calendar-relay (voir
// nginx.conf / docker-compose.yml). VITE_CALENDAR_RELAY_URL permet de
// surcharger avec une URL absolue si le relais est hébergé ailleurs.
const RELAY_BASE = import.meta.env.VITE_CALENDAR_RELAY_URL || ''

const STORAGE_KEY = 'calendar_ics_url'
const WINDOW_DAYS = 90
const REFRESH_MS = 5 * 60_000 // les événements changent rarement, pas besoin de poller vite

export interface CalendarEvent {
  summary: string
  start: Date
  end: Date
  allDay: boolean
  color: string
}

// Google n'exporte pas la couleur choisie pour un événement dans son flux ICS
// (seul le standard RFC 7986 COLOR le permettrait, et Google ne le renseigne
// pas). On retombe donc sur une couleur dérivée du titre : stable pour un même
// événement, mais ne correspondra pas forcément à la couleur vue dans Google
// Calendar lui-même.
const FALLBACK_PALETTE = ['#4dd0c7', '#ff6b6b', '#ffab40', '#7c9eff', '#c792ea', '#82e0aa', '#f48fb1', '#64b5f6']

function hashColor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length]
}

function resolveColor(vevent: ICAL.Component, summary: string): string {
  const explicit = vevent.getFirstPropertyValue('color') as string | null
  return explicit || hashColor(summary)
}

const calendarUrl = ref(localStorage.getItem(STORAGE_KEY) ?? '')
const events = ref<CalendarEvent[]>([])
const hasCalendarUrl = computed(() => Boolean(calendarUrl.value))

function setCalendarUrl(url: string) {
  calendarUrl.value = url
  localStorage.setItem(STORAGE_KEY, url)
  fetchCalendarEvents()
}

function clearCalendarUrl() {
  calendarUrl.value = ''
  events.value = []
  localStorage.removeItem(STORAGE_KEY)
}

function expandEvents(vevents: ICAL.Component[], rangeStart: Date, rangeEnd: Date): CalendarEvent[] {
  const result: CalendarEvent[] = []

  for (const vevent of vevents) {
    const event = new ICAL.Event(vevent)
    const summary = event.summary || '(sans titre)'
    const color = resolveColor(vevent, summary)
    const durationMs = event.endDate.toJSDate().getTime() - event.startDate.toJSDate().getTime()

    if (!event.isRecurring()) {
      const start = event.startDate.toJSDate()
      if (start >= rangeStart && start <= rangeEnd) {
        result.push({
          summary,
          start,
          end: event.endDate.toJSDate(),
          allDay: event.startDate.isDate,
          color,
        })
      }
      continue
    }

    // Développe les occurrences d'un événement récurrent (RRULE) dans la fenêtre.
    const iterator = event.iterator()
    let guard = 0
    let next: ICAL.Time | null
    while (guard < 500 && (next = iterator.next())) {
      guard++
      const occStart = next.toJSDate()
      if (occStart > rangeEnd) break
      if (occStart >= rangeStart) {
        result.push({
          summary,
          start: occStart,
          end: new Date(occStart.getTime() + durationMs),
          allDay: next.isDate,
          color,
        })
      }
    }
  }

  return result.sort((a, b) => a.start.getTime() - b.start.getTime())
}

async function fetchCalendarEvents() {
  if (!calendarUrl.value) return
  try {
    const res = await fetch(`${RELAY_BASE}/api/calendar-proxy?url=${encodeURIComponent(calendarUrl.value)}`)
    if (!res.ok) throw new Error(`Relais calendrier ${res.status}`)
    const icsText = await res.text()

    const jcal = ICAL.parse(icsText)
    const vcalendar = new ICAL.Component(jcal)
    const vevents = vcalendar.getAllSubcomponents('vevent')

    const rangeStart = new Date()
    rangeStart.setDate(rangeStart.getDate() - 1) // marge pour les événements en cours
    const rangeEnd = new Date()
    rangeEnd.setDate(rangeEnd.getDate() + WINDOW_DAYS)

    events.value = expandEvents(vevents, rangeStart, rangeEnd)
  } catch (err) {
    console.error('Erreur récupération du calendrier', err)
  }
}

let refreshTimer: number | undefined

function startCalendarPolling() {
  fetchCalendarEvents()
  window.clearInterval(refreshTimer)
  refreshTimer = window.setInterval(fetchCalendarEvents, REFRESH_MS)
}

function stopCalendarPolling() {
  window.clearInterval(refreshTimer)
}

export function useCalendar() {
  return {
    calendarUrl,
    hasCalendarUrl,
    events,
    setCalendarUrl,
    clearCalendarUrl,
    startCalendarPolling,
    stopCalendarPolling,
  }
}
