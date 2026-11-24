import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves the site from /<repo>/. Override with BASE_PATH for other hosts.
const base = process.env.BASE_PATH ?? '/motivator/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Motivator: your offline coach',
        short_name: 'Motivator',
        description:
          'A private, on-device motivational coach. Your conversations never leave your device.',
        theme_color: '#2f4f4f',
        background_color: '#f6f1ea',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,wasm}'],
        // Model weights are cached by the LLM runtimes themselves (Cache API), not precached.
        maximumFileSizeToCacheInBytes: 30 * 1024 * 1024,
        navigateFallback: 'index.html',
      },
    }),
  ],
  worker: { format: 'es' },
  // The LLM runtimes are large but load lazily, only after onboarding.
  build: { chunkSizeWarningLimit: 7000 },
});
