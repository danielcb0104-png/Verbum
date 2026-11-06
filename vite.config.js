import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// BASE: ruta donde se publica (p. ej. "/Verbum/" en GitHub Pages)
const base = process.env.BASE || '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Sagrada Biblia',
        short_name: 'Biblia',
        description: 'Sagrada Biblia (Navarra) con Vulgata y comentarios de los Santos Padres',
        lang: 'es',
        theme_color: '#7a2e2e',
        background_color: '#faf6ef',
        display: 'standalone',
        start_url: '.',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}', 'data/books.json', 'data/autores.json'],
        navigateFallbackDenylist: [/^\/data\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/data/'),
            handler: 'CacheFirst',
            options: { cacheName: 'datos-biblia', expiration: { maxEntries: 2000 } }
          }
        ]
      }
    })
  ]
})
