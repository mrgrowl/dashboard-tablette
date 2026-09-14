<script setup lang="ts">
import Slideshow from './components/Slideshow.vue'
import { useFullscreen } from './composables/useFullscreen'

const { isFullscreen, enterFullscreen } = useFullscreen()
</script>

<template>
  <Slideshow />
  <button
    v-if="!isFullscreen"
    class="fullscreen-toggle"
    aria-label="Passer en plein écran"
    @click="enterFullscreen"
  >
    ⛶
  </button>
</template>

<style scoped>
.fullscreen-toggle {
  position: fixed;
  top: max(1rem, env(safe-area-inset-top));
  right: max(1rem, env(safe-area-inset-right));
  z-index: 30;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 0.6rem;
  background: rgba(11, 15, 20, 0.55);
  color: rgba(244, 246, 248, 0.85);
  font-size: 1.2rem;
  line-height: 1;
  cursor: pointer;
  backdrop-filter: blur(4px);
  transition: background 0.15s ease;
}

.fullscreen-toggle:hover {
  background: rgba(11, 15, 20, 0.85);
}
</style>
