import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

// En GitHub Pages el sitio vive bajo /pokelink/. En local, en la raíz.
const base = process.env.GITHUB_PAGES ? '/pokelink/' : '/'

export default defineConfig({
  base,
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Datos generados (dex/movimientos/megas) en su propio chunk.
          if (id.includes('src/data/generated')) return 'pokedata'
          if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) return 'react'
          if (id.includes('node_modules')) return 'vendor'
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // registramos manualmente en main.tsx (con auto-recarga)
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'PokéRogue — Roguelike',
        short_name: 'PokéRogue',
        description: 'Pokémon roguelike autobattler — todas las generaciones, mobile-first.',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        // Relativos para que funcionen tanto en raíz como bajo /pokelink/
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            // Sprites/artwork de PokeAPI -> cache-first para offline
            urlPattern: /^https:\/\/raw\.githubusercontent\.com\/PokeAPI\/sprites\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'pokeapi-sprites',
              expiration: { maxEntries: 3000, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Retratos de entrenador (Pokémon Showdown) -> cache-first
            urlPattern: /^https:\/\/play\.pokemonshowdown\.com\/sprites\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'showdown-trainers',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
})
