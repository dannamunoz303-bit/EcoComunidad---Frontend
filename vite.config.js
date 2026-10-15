import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/pruebas/setup.js'],
    // Con toda la suite en paralelo, algunas pruebas pasan de 5 s en un equipo cargado.
    testTimeout: 15000,
  },
})
