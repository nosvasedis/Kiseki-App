import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: [
        'assets/kiseki/runtime/*',
        'assets/kiseki/icons/kiseki-icons.svg',
        'assets/kiseki/brand/kiseki-logo.svg',
      ],
      manifest: {
        name: 'Kiseki · Little miracles',
        short_name: 'Kiseki',
        description: 'A private space for your Kisekis — little miracles, kept.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#070f23',
        theme_color: '#070f23',
        icons: [
          { src: '/assets/kiseki/runtime/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/assets/kiseki/runtime/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/assets/kiseki/runtime/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: { manualChunks: { physics: ['matter-js'], storage: ['dexie', 'dexie-react-hooks'] } },
    },
  },
});
