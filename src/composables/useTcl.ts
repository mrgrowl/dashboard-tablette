import { ref } from 'vue'

// Identifiants du compte "plateforme Data" Grand Lyon, fournis au build via
// variable d'env (voir .env.example). Fixes pour la durée de vie du build.
const TCL_LOGIN = import.meta.env.VITE_TCL_LOGIN || ''
const TCL_PASSWORD = import.meta.env.VITE_TCL_PASSWORD || ''

const TCL_PASSAGES_URL =
  'https://data.grandlyon.com/fr/datapusher/ws/rdata/tcl_sytral.tclpassagearret/all.json?maxfeatures=-1&start=1'

const REFRESH_MS = 25_000
const DISPLAY_COUNT = 3

export interface StopConfig {
  id: number
  terminus: string
  mode: 'metro' | 'tramway'
  lineLabel: string
  lineColor: string
  station: string
  line: 'tram' | 'metroB' | 'metroD'
  // Arrêt précédent/suivant réels sur la ligne, dans le sens de ce `terminus`
  // (source : ordre officiel des stations T1/B/D) — sert à dessiner la
  // mini-carte de suivi (TransitSlide) avec de vrais noms d'arrêts autour de
  // `station`, plutôt qu'une simple barre de progression sans repère.
  prevStop: string
  nextStop: string
}

export interface Departure {
  destination: string
  minutes: number
  isLast?: boolean
}

interface TclRow {
  id: number
  direction: string
  delaipassage: string
}

// Chaque ligne a des services partiels qui passent par l'arrêt sans aller
// jusqu'au terminus complet (ex: T1 s'arrête parfois à La Doua, Palais Justice...
// la ligne B s'arrête parfois à Stade de Gerland, Place Jean Jaurès...) : on ne
// garde que les passages signés pour le terminus complet de chaque sens.
export const STOPS = {
  liberteNord: { id: 32112, terminus: 'IUT Feyssine', mode: 'tramway', lineLabel: 'T1', lineColor: '#1565C0', station: 'Liberté', line: 'tram', prevStop: 'Guillotière - Gabriel Péri', nextStop: 'Saxe - Préfecture' },
  liberteSud: { id: 32113, terminus: 'Debourg', mode: 'tramway', lineLabel: 'T1', lineColor: '#1565C0', station: 'Liberté', line: 'tram', prevStop: 'Saxe - Préfecture', nextStop: 'Guillotière - Gabriel Péri' },
  guichardNord: { id: 46027, terminus: 'Charpennes Charles Hernu', mode: 'metro', lineLabel: 'B', lineColor: '#D62828', station: 'Place Guichard', line: 'metroB', prevStop: 'Saxe - Gambetta', nextStop: 'Gare Part-Dieu Vivier Merle' },
  guichardSud: { id: 46026, terminus: 'St-Genis-Laval Hôp. Sud', mode: 'metro', lineLabel: 'B', lineColor: '#D62828', station: 'Place Guichard', line: 'metroB', prevStop: 'Gare Part-Dieu Vivier Merle', nextStop: 'Saxe - Gambetta' },
  guillotiereVenissieux: { id: 30199, terminus: 'Gare de Vénissieux', mode: 'metro', lineLabel: 'D', lineColor: '#F5871F', station: 'Guillotière', line: 'metroD', prevStop: 'Bellecour', nextStop: 'Saxe - Gambetta' },
  guillotiereVaise: { id: 30200, terminus: 'Gare de Vaise-G.Collomb', mode: 'metro', lineLabel: 'D', lineColor: '#F5871F', station: 'Guillotière', line: 'metroD', prevStop: 'Saxe - Gambetta', nextStop: 'Bellecour' },
} as const satisfies Record<string, StopConfig>

export type StopKey = keyof typeof STOPS

// Un slide par ligne (tram / métro B / métro D), regroupant les deux sens en
// colonnes — l'ordre des clés dans STOPS fixe l'ordre des colonnes.
export const LINE_GROUPS: { line: StopConfig['line']; stopKeys: StopKey[] }[] = (
  ['tram', 'metroB', 'metroD'] as const
).map((line) => ({
  line,
  stopKeys: (Object.keys(STOPS) as StopKey[]).filter((key) => STOPS[key].line === line),
}))

const departures = ref<Record<StopKey, Departure[]>>(
  Object.fromEntries(Object.keys(STOPS).map((key) => [key, [] as Departure[]])) as Record<StopKey, Departure[]>,
)
const error = ref<string | null>(null)
// Le premier fetch télécharge tout le réseau (~9 Mo, aucun filtre serveur
// possible côté Grand Lyon) : ça prend 2-3s. Sans cet état, le slide affiche
// "Plus d'horaire ce soir !" pendant ce délai, ce qui est trompeur.
const loading = ref(true)

function parseDelai(delaipassage: string): number {
  const minMatch = /^(\d+)\s*min$/.exec(delaipassage)
  if (minMatch) return Number(minMatch[1])

  // Au-delà d'un certain délai, l'API bascule sur une heure absolue ("15h53")
  // plutôt qu'un nombre de minutes — sans ce cas, "15h53" serait lu comme "15".
  const clockMatch = /^(\d{1,2})h(\d{2})$/.exec(delaipassage)
  if (clockMatch) {
    const target = new Date()
    target.setHours(Number(clockMatch[1]), Number(clockMatch[2]), 0, 0)
    let diffMin = Math.round((target.getTime() - Date.now()) / 60_000)
    if (diffMin < 0) diffMin += 24 * 60 // passage après minuit
    return diffMin
  }

  return 0 // "Proche" ou autre libellé imminent
}

async function fetchTclDepartures() {
  if (!TCL_LOGIN || !TCL_PASSWORD) {
    error.value = "Identifiants TCL manquants (variables d'env VITE_TCL_LOGIN / VITE_TCL_PASSWORD)."
    loading.value = false
    return
  }
  try {
    const auth = btoa(`${TCL_LOGIN}:${TCL_PASSWORD}`)
    const res = await fetch(TCL_PASSAGES_URL, {
      headers: { Authorization: `Basic ${auth}` },
    })
    if (res.status === 401) {
      error.value = 'Identifiants TCL refusés par Grand Lyon.'
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
    error.value = null
  } catch (err) {
    console.error('Erreur récupération des départs TCL', err)
    error.value = 'Impossible de récupérer les horaires TCL.'
  } finally {
    loading.value = false
  }
}

let refreshTimer: number | undefined

function startTclPolling() {
  fetchTclDepartures()
  window.clearInterval(refreshTimer)
  refreshTimer = window.setInterval(fetchTclDepartures, REFRESH_MS)
}

function stopTclPolling() {
  window.clearInterval(refreshTimer)
}

export function useTcl() {
  return { departures, error, loading, startTclPolling, stopTclPolling }
}
