import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// FR-111 (masterdoc.md): "The app is an installable PWA with cached
// static assets." This is that - a manifest (so "Add to Home Screen" on
// Android gives it a real icon, a name, and standalone display instead of
// just bookmarking the URL in a browser tab) plus a generated service
// worker that precaches the built JS/CSS/images so the shell loads
// instantly on repeat opens. Deliberately NOT configuring any
// `runtimeCaching` for API calls - Supabase requests and the Cloudflare
// Worker's room WebSocket must always hit the network live (this is a
// real-time multiplayer app, not something that should ever serve stale
// cached game state), so the only thing precached is the static build
// output itself.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: "Dr. Chandra's Waiting Room",
        short_name: 'Waiting Room',
        description: 'A private two-player doctor-themed game night.',
        theme_color: '#14101F',
        background_color: '#14101F',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Just the app shell (JS/CSS/HTML) - public/ is ~51MB of
        // backgrounds, character sprites, and music (checked with `du -sh`
        // before writing this), and a naive `**/*.png` etc. glob would try
        // to precache all of it before the service worker even finishes
        // installing. That's the wrong trade for a phone on mobile data:
        // the shell is what needs to paint instantly on repeat opens, and
        // the browser's normal HTTP cache already handles the large art/
        // audio efficiently after a first load without needing it baked
        // into the SW's precache manifest too.
        globPatterns: ['**/*.{js,css,html}'],
      },
    }),
  ],
})
