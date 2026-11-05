import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// BASE: ruta donde se publica (p. ej. "/biblia-nc/" en GitHub Pages)
const base = process.env.BASE || '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Biblia Nácar-Colunga',
        short_name: 'Biblia NC',
        description: 'Sagrada Biblia Nácar-Colunga con Vulgata y comentarios de los Padres',
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
