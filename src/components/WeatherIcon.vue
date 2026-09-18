<script setup lang="ts">
import type { WeatherIconName } from '../composables/useWeather'

// SVG inline plutôt qu'emoji : certains navigateurs kiosque (Chromium sur
// Raspberry Pi OS Lite sans police d'emoji couleur installée) affichent les
// emojis météo comme des carrés vides. Un SVG ne dépend d'aucune police
// système et s'affiche à l'identique partout.
defineProps<{ name: WeatherIconName }>()
</script>

<template>
  <svg viewBox="0 0 48 48" class="weather-icon" aria-hidden="true">
    <g v-if="name === 'sun'">
      <circle cx="24" cy="24" r="10" fill="#ffb84d" />
      <g stroke="#ffb84d" stroke-width="3" stroke-linecap="round">
        <line x1="24" y1="2" x2="24" y2="8" />
        <line x1="24" y1="40" x2="24" y2="46" />
        <line x1="2" y1="24" x2="8" y2="24" />
        <line x1="40" y1="24" x2="46" y2="24" />
        <line x1="7.5" y1="7.5" x2="11.8" y2="11.8" />
        <line x1="36.2" y1="36.2" x2="40.5" y2="40.5" />
        <line x1="7.5" y1="40.5" x2="11.8" y2="36.2" />
        <line x1="36.2" y1="11.8" x2="40.5" y2="7.5" />
      </g>
    </g>

    <path v-else-if="name === 'moon'" d="M30 6a18 18 0 1 0 12 31.4A14 14 0 0 1 30 6Z" fill="#e3c66b" />

    <g v-else-if="name === 'cloud-sun'">
      <circle cx="18" cy="15" r="8" fill="#ffb84d" />
      <g stroke="#ffb84d" stroke-width="2.5" stroke-linecap="round">
        <line x1="18" y1="1" x2="18" y2="4" />
        <line x1="3" y1="15" x2="6" y2="15" />
        <line x1="7.8" y1="4.8" x2="9.9" y2="6.9" />
        <line x1="26.2" y1="4.8" x2="24.1" y2="6.9" />
      </g>
      <path d="M14 40a9 9 0 0 1-1-17.9A11 11 0 0 1 34 24a8 8 0 0 1-1 16H14Z" fill="#b8c2d9" />
    </g>

    <path
      v-else-if="name === 'cloud'"
      d="M14 38a10 10 0 0 1-1-19.9A12 12 0 0 1 36 22a9 9 0 0 1-1 16H14Z"
      fill="#b8c2d9"
    />

    <g v-else-if="name === 'fog'">
      <path d="M14 24a10 10 0 0 1-1-19.9A12 12 0 0 1 36 8a9 9 0 0 1-1 16H14Z" fill="#b8c2d9" />
      <g stroke="#8a97a8" stroke-width="3" stroke-linecap="round">
        <line x1="6" y1="34" x2="42" y2="34" />
        <line x1="10" y1="41" x2="38" y2="41" />
      </g>
    </g>

    <g v-else-if="name === 'drizzle'">
      <path d="M14 30a10 10 0 0 1-1-19.9A12 12 0 0 1 36 14a9 9 0 0 1-1 16H14Z" fill="#b8c2d9" />
      <g stroke="#4fa8e0" stroke-width="2.5" stroke-linecap="round">
        <line x1="16" y1="38" x2="14" y2="43" />
        <line x1="24" y1="38" x2="22" y2="43" />
        <line x1="32" y1="38" x2="30" y2="43" />
      </g>
    </g>

    <g v-else-if="name === 'rain'">
      <path d="M14 28a10 10 0 0 1-1-19.9A12 12 0 0 1 36 12a9 9 0 0 1-1 16H14Z" fill="#9aa6bd" />
      <g stroke="#4fa8e0" stroke-width="3" stroke-linecap="round">
        <line x1="14" y1="36" x2="11" y2="44" />
        <line x1="24" y1="36" x2="21" y2="44" />
        <line x1="34" y1="36" x2="31" y2="44" />
      </g>
    </g>

    <g v-else-if="name === 'snow-light'">
      <path d="M14 28a10 10 0 0 1-1-19.9A12 12 0 0 1 36 12a9 9 0 0 1-1 16H14Z" fill="#b8c2d9" />
      <g stroke="#e8eef7" stroke-width="2.5" stroke-linecap="round">
        <line x1="16" y1="37" x2="16" y2="43" />
        <line x1="13.5" y1="40" x2="18.5" y2="40" />
        <line x1="32" y1="37" x2="32" y2="43" />
        <line x1="29.5" y1="40" x2="34.5" y2="40" />
      </g>
    </g>

    <g v-else-if="name === 'snow'">
      <path d="M14 26a10 10 0 0 1-1-19.9A12 12 0 0 1 36 10a9 9 0 0 1-1 16H14Z" fill="#9aa6bd" />
      <g stroke="#e8eef7" stroke-width="2.5" stroke-linecap="round">
        <line x1="12" y1="35" x2="12" y2="41" />
        <line x1="9.5" y1="38" x2="14.5" y2="38" />
        <line x1="24" y1="37" x2="24" y2="43" />
        <line x1="21.5" y1="40" x2="26.5" y2="40" />
        <line x1="36" y1="35" x2="36" y2="41" />
        <line x1="33.5" y1="38" x2="38.5" y2="38" />
      </g>
    </g>

    <g v-else-if="name === 'thunderstorm'">
      <path d="M14 26a10 10 0 0 1-1-19.9A12 12 0 0 1 36 10a9 9 0 0 1-1 16H14Z" fill="#7c879c" />
      <path d="M25 30 17 42h7l-3 8 12-14h-7l3-6Z" fill="#ffd23f" />
    </g>
  </svg>
</template>

<style scoped>
.weather-icon {
  width: 1em;
  height: 1em;
  display: block;
}
</style>
