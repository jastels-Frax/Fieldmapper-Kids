import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8')) as { version: string };

export default defineConfig({
  // Relative asset URLs, so the build works on any subpath (GitHub Pages included).
  base: './',
  // MapLibre alone is ~800 kB; one chunk, precached, is the simplest offline story.
  build: { chunkSizeWarningLimit: 1600 },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    VitePWA({
      // 'prompt': a new deploy downloads in the background and WAITS. main.ts
      // activates it only at a cold launch, never in the middle of a find.
      registerType: 'prompt',
      // main.ts registers ./sw.js itself.
      injectRegister: false,
      manifest: {
        name: 'Field Mapper Kids',
        short_name: 'Explorer',
        description: 'Explore and collect the world around you.',
        theme_color: '#2f9e44',
        background_color: '#fff9db',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            // OpenFreeMap tiles, glyphs and sprites never change under one URL (the
            // tile path carries the data release), so CacheFirst: a place already
            // explored still draws with no signal.
            urlPattern: /^https:\/\/tiles\.openfreemap\.org\/.*\.(pbf|png|json)$|^https:\/\/tiles\.openfreemap\.org\/(fonts|sprites)\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: { maxEntries: 4000, maxAgeSeconds: 60 * 60 * 24 * 30, purgeOnQuotaError: true },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // The style and the TileJSON name the CURRENT data release, so they are
            // asked for fresh and fall back to the cached copy offline.
            urlPattern: /^https:\/\/tiles\.openfreemap\.org\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'map-style',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 20, purgeOnQuotaError: true },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
