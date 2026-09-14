import { onMounted, onUnmounted, ref } from 'vue'

export function useFullscreen() {
  const isFullscreen = ref(!!document.fullscreenElement)

  function update() {
    isFullscreen.value = !!document.fullscreenElement
  }

  onMounted(() => document.addEventListener('fullscreenchange', update))
  onUnmounted(() => document.removeEventListener('fullscreenchange', update))

  function enterFullscreen() {
    document.documentElement.requestFullscreen().catch((err: unknown) => {
      console.error('Impossible de passer en plein écran', err)
    })
  }

  return { isFullscreen, enterFullscreen }
}
