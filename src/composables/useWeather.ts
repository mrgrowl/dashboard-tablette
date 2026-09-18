import { ref } from 'vue'

// Coordonnées de Lyon — pas de clé API nécessaire (Open-Meteo est gratuit et
// public), contrairement à useTcl.ts.
const LAT = 45.75
const LON = 4.85

const WEATHER_URL = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&hourly=temperature_2m,weathercode,is_day&timezone=Europe%2FParis&forecast_days=2`

const REFRESH_MS = 30 * 60_000 // météo peu volatile : 30 min suffit largement

// SVG (WeatherIcon.vue) plutôt qu'emoji : voir le commentaire dans ce fichier.
export type WeatherIconName =
  | 'sun'
  | 'moon'
  | 'cloud-sun'
  | 'cloud'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'snow-light'
  | 'snow'
  | 'thunderstorm'

export interface WeatherPeriod {
  label: string
  icon: WeatherIconName
  temp: number
  condition: string
}

export interface WeatherHour {
  hour: string
  icon: WeatherIconName
  temp: number
}

export interface DayForecast {
  periods: WeatherPeriod[]
  hourly: WeatherHour[]
}

interface OpenMeteoResponse {
  hourly: {
    time: string[]
    temperature_2m: number[]
    weathercode: number[]
    is_day: number[]
  }
}

// Codes WMO (norme utilisée par Open-Meteo) → icône/libellé FR. nightIcon
// n'est utilisé que pour les codes où le pictogramme dépend du jour/nuit
// (soleil/nuageux clair) — les autres (pluie, neige, orage...) sont les mêmes.
const WEATHER_CODES: Record<number, { label: string; icon: WeatherIconName; nightIcon?: WeatherIconName }> = {
  0: { label: 'Ciel dégagé', icon: 'sun', nightIcon: 'moon' },
  1: { label: 'Peu nuageux', icon: 'cloud-sun', nightIcon: 'moon' },
  2: { label: 'Éclaircies', icon: 'cloud-sun', nightIcon: 'cloud' },
  3: { label: 'Couvert', icon: 'cloud' },
  45: { label: 'Brumeux', icon: 'fog' },
  48: { label: 'Brouillard givrant', icon: 'fog' },
  51: { label: 'Bruine légère', icon: 'drizzle' },
  53: { label: 'Bruine', icon: 'drizzle' },
  55: { label: 'Bruine dense', icon: 'rain' },
  56: { label: 'Bruine verglaçante', icon: 'rain' },
  57: { label: 'Bruine verglaçante', icon: 'rain' },
  61: { label: 'Pluie légère', icon: 'drizzle' },
  63: { label: 'Pluie', icon: 'rain' },
  65: { label: 'Forte pluie', icon: 'rain' },
  66: { label: 'Pluie verglaçante', icon: 'rain' },
  67: { label: 'Pluie verglaçante', icon: 'rain' },
  71: { label: 'Neige légère', icon: 'snow-light' },
  73: { label: 'Neige', icon: 'snow' },
  75: { label: 'Forte neige', icon: 'snow' },
  77: { label: 'Neige en grains', icon: 'snow' },
  80: { label: 'Averses légères', icon: 'drizzle' },
  81: { label: 'Averses', icon: 'rain' },
  82: { label: 'Fortes averses', icon: 'thunderstorm' },
  85: { label: 'Averses de neige', icon: 'snow-light' },
  86: { label: 'Fortes averses de neige', icon: 'snow' },
  95: { label: 'Orage', icon: 'thunderstorm' },
  96: { label: 'Orage avec grêle', icon: 'thunderstorm' },
  99: { label: 'Orage avec grêle', icon: 'thunderstorm' },
}

function describe(code: number, isDay: number): { label: string; icon: WeatherIconName } {
  const entry = WEATHER_CODES[code] ?? { label: 'Indisponible', icon: 'cloud' as WeatherIconName }
  return { label: entry.label, icon: isDay === 0 && entry.nightIcon ? entry.nightIcon : entry.icon }
}

// Le tableau `time` d'Open-Meteo contient une entrée ISO locale par heure
// ("2026-09-18T14:00") : on retrouve l'index par correspondance exacte plutôt
// que par calcul, pour rester robuste au DST et aux bornes de journée.
function findHourIndex(times: string[], date: Date, hour: number): number {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(hour).padStart(2, '0')
  return times.indexOf(`${y}-${m}-${d}T${h}:00`)
}

function hourLabel(iso: string): string {
  return `${iso.slice(11, 13)}h`
}

const PERIOD_HOURS: { label: string; hour: number }[] = [
  { label: 'Matin', hour: 9 },
  { label: 'Après-midi', hour: 15 },
  { label: 'Soir', hour: 21 },
]

function buildDay(data: OpenMeteoResponse, date: Date, hourlyStart: number): DayForecast | null {
  const { time, temperature_2m, weathercode, is_day } = data.hourly

  const periods: WeatherPeriod[] = []
  for (const p of PERIOD_HOURS) {
    const idx = findHourIndex(time, date, p.hour)
    if (idx === -1) return null
    const { label, icon } = describe(weathercode[idx], is_day[idx])
    periods.push({ label: p.label, icon, temp: Math.round(temperature_2m[idx]), condition: label })
  }

  const startIdx = findHourIndex(time, date, hourlyStart)
  if (startIdx === -1) return null

  const hourly: WeatherHour[] = []
  for (let i = 0; i < 6 && startIdx + i < time.length; i++) {
    const idx = startIdx + i
    const { icon } = describe(weathercode[idx], is_day[idx])
    hourly.push({ hour: hourLabel(time[idx]), icon, temp: Math.round(temperature_2m[idx]) })
  }

  return { periods, hourly }
}

const today = ref<DayForecast | null>(null)
const tomorrow = ref<DayForecast | null>(null)
const error = ref<string | null>(null)
const loading = ref(true)

async function fetchWeather() {
  try {
    const res = await fetch(WEATHER_URL)
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`)
    const data: OpenMeteoResponse = await res.json()

    const now = new Date()
    const tomorrowDate = new Date(now)
    tomorrowDate.setDate(tomorrowDate.getDate() + 1)

    // Diapo "aujourd'hui" : les 6 prochaines heures à partir de maintenant.
    // Diapo "demain" : bloc matin→début d'après-midi (08h-13h), faute de
    // "maintenant" pertinent pour un jour qui n'a pas encore commencé.
    const todayForecast = buildDay(data, now, now.getHours())
    const tomorrowForecast = buildDay(data, tomorrowDate, 8)

    if (!todayForecast || !tomorrowForecast) {
      throw new Error('Données horaires incomplètes dans la réponse Open-Meteo')
    }

    today.value = todayForecast
    tomorrow.value = tomorrowForecast
    error.value = null
  } catch (err) {
    console.error('Erreur récupération de la météo', err)
    error.value = 'Impossible de récupérer la météo.'
  } finally {
    loading.value = false
  }
}

let refreshTimer: number | undefined

function startWeatherPolling() {
  fetchWeather()
  window.clearInterval(refreshTimer)
  refreshTimer = window.setInterval(fetchWeather, REFRESH_MS)
}

function stopWeatherPolling() {
  window.clearInterval(refreshTimer)
}

export function useWeather() {
  return { today, tomorrow, error, loading, startWeatherPolling, stopWeatherPolling }
}
