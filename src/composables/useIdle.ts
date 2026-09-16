import { onMounted, onUnmounted, ref } from 'vue'

const IDLE_MS = 10_000

// Écran public : les contrôles (bouton plein écran, points de navigation)
// disparaissent après 10s sans mouvement de souris, et ne reviennent qu'au
// prochain mouvement — comme un lecteur vidéo.
const isIdle = ref(false)
let timer: number | undefined

function resetTimer() {
  isIdle.value = false
  window.clearTimeout(timer)
  timer = window.setTimeout(() => {
    isIdle.value = true
  }, IDLE_MS)
}

export function useIdle() {
  onMounted(() => {
    window.addEventListener('mousemove', resetTimer)
    resetTimer()
  })
  onUnmounted(() => {
    window.removeEventListener('mousemove', resetTimer)
  })

  return { isIdle }
}
