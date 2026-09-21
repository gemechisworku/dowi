import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      // injectManifest (not the default generateSW) — M7 needs
      // `notificationclick` and `periodicsync` handlers of its own
      // (src/sw.ts), which generateSW's black-box service worker has no
      // hook for.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      includeAssets: ['favicon.svg'],
      manifest: {
        id: '/',
        name: 'Dowi',
        short_name: 'Dowi',
        description: 'Dowi — a local-first personal assistant for money, notes and tasks.',
        theme_color: '#2563eb',
        background_color: '#f1f3f7',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Add expense',
            short_name: 'Expense',
            url: '/money/new?type=expense',
          },
          {
            name: 'New task',
            short_name: 'Task',
            url: '/tasks/new',
          },
          {
            name: 'New note',
            short_name: 'Note',
            url: '/notes/new',
          },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // vite-plugin-pwa v1.3's production register script always passes
        // `type: 'classic'` (a known gap — it only reads devOptions.type),
        // regardless of the service worker's own build format. Building
        // the SW as a classic IIFE instead of the 'es'-format default
        // keeps the two in sync without needing a hand-rolled registration.
        rollupFormat: 'iife',
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
  server: {
    host: true,
  },
})
