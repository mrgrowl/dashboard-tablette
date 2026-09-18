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
  liberteNord: { id: 32112, terminus: 'IUT Feyssine', mode: 'tramway', lineLabel: 'T1', lineColor: '#1565C0', station: 'Liberté', line: 'tram' },
  liberteSud: { id: 32113, terminus: 'Debourg', mode: 'tramway', lineLabel: 'T1', lineColor: '#1565C0', station: 'Liberté', line: 'tram' },
  guichardNord: { id: 46027, terminus: 'Charpennes Charles Hernu', mode: 'metro', lineLabel: 'B', lineColor: '#D62828', station: 'Place Guichard', line: 'metroB' },
  guichardSud: { id: 46026, terminus: 'St-Genis-Laval Hôp. Sud', mode: 'metro', lineLabel: 'B', lineColor: '#D62828', station: 'Place Guichard', line: 'metroB' },
  guillotiereVenissieux: { id: 30199, terminus: 'Gare de Vénissieux', mode: 'metro', lineLabel: 'D', lineColor: '#F5871F', station: 'Guillotière', line: 'metroD' },
  guillotiereVaise: { id: 30200, terminus: 'Gare de Vaise-G.Collomb', mode: 'metro', lineLabel: 'D', lineColor: '#F5871F', station: 'Guillotière', line: 'metroD' },
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

// Ordre officiel réel des stations, dans UN sens de référence par ligne
// (source : ordre des stations T1/B/D publié par SYTRAL) — sert à dessiner
// la mini-carte de suivi (TransitSlide) avec de vrais arrêts, pas juste une
// barre de progression abstraite. `ourIndex` repère notre arrêt configuré
// dans ce tableau ; `getRouteStations` se charge d'inverser l'ordre pour le
// sens retour.
const LINE_STATIONS: Record<StopConfig['line'], { stations: string[]; ourIndex: number }> = {
  tram: {
    stations: [
      'Debourg',
      'ENS Lyon',
      'Halle Tony-Garnier',
      'Musée des Confluences',
      'Hôtel de région - Montrochet',
      'Sainte-Blandine',
      'Place des Archives',
      'Perrache',
      'Quai Claude-Bernard',
      "Rue de l'Université",
      'Saint-André',
      'Guillotière - Gabriel Péri',
      'Liberté',
      'Saxe - Préfecture',
      'Palais de Justice - Mairie du 3e',
      'Part-Dieu - Auditorium',
      'Gare Part-Dieu - Vivier Merle',
      'Thiers - Lafayette',
      'Collège Bellecombe',
      'Charpennes - Charles Hernu',
      'Le Tonkin',
      'Condorcet',
      'Université Lyon 1',
      'La Doua - Gaston Berger',
      'INSA - Einstein',
      'Croix-Luizet',
      'IUT Feyssine',
    ],
    ourIndex: 12, // Liberté
  },
  metroB: {
    stations: [
      'Charpennes Charles Hernu',
      'Brotteaux',
      'Gare Part-Dieu Vivier Merle',
      'Place Guichard',
      'Saxe - Gambetta',
      'Jean Macé',
      'Place Jean Jaurès',
      'Debourg',
      'Stade de Gerland Le LOU',
      "Gare d'Oullins",
      'Oullins Centre',
      'St-Genis-Laval Hôp. Sud',
    ],
    ourIndex: 3, // Place Guichard
  },
  metroD: {
    stations: [
      'Gare de Vaise-G.Collomb',
      'Valmy',
      'Gorge de Loup',
      'Vieux Lyon - Cathédrale St-Jean',
      'Bellecour',
      'Guillotière - Gabriel Péri',
      'Saxe - Gambetta',
      'Garibaldi',
      'Sans-Souci',
      'Monplaisir - Lumière',
      'Grange Blanche',
      'Laënnec',
      'Mermoz - Pinel',
      'Parilly',
      'Gare de Vénissieux',
    ],
    ourIndex: 5, // Guillotière
  },
}

// Renvoie la liste des stations dans le sens de circulation de `key` (donc
// vers son `terminus`), avec l'index de notre arrêt dans cette liste.
export function getRouteStations(key: StopKey): { stations: string[]; ourIndex: number } {
  const stop = STOPS[key]
  const { stations, ourIndex } = LINE_STATIONS[stop.line]
  const forward = stations[stations.length - 1] === stop.terminus
  const backward = stations[0] === stop.terminus
  if (!forward && !backward) {
    // Le libellé de `terminus` (utilisé aussi pour matcher les passages TCL)
    // ne correspond à aucune extrémité de LINE_STATIONS : sans ce garde-fou,
    // on choisirait silencieusement le mauvais sens (bug vécu : "IUT -
    // Feyssine" vs "IUT Feyssine" inversait 3 des 6 directions).
    throw new Error(`getRouteStations: terminus "${stop.terminus}" absent de LINE_STATIONS["${stop.line}"]`)
  }
  if (forward) return { stations, ourIndex }
  return { stations: [...stations].reverse(), ourIndex: stations.length - 1 - ourIndex }
}

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
