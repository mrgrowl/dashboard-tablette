import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      // Relais calendrier (server/calendar-relay.js) : CORS-free en dev grâce
      // au proxy Vite, comme en prod via nginx. Voir src/composables/useCalendar.ts.
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
    },
  },
})
