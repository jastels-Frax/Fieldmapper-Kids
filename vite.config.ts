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
        name: 'Scout',
        short_name: 'Scout',
        description: 'Explore and collect the world around you.',
        theme_color: '#4a3826',
        background_color: '#ecdfbf',
        display: 'standalone',
        // Any way up: a tablet on a desk is often on its side, and a locked app cannot be turned for a better view.
        orientation: 'any',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        // species/*.json is the Nova Scotia species list (~140 kB gzipped): precached so naming works offline.
        // .mjs: MapLibre's worker (mapView.ts setWorkerUrl), without which no map draws offline.
        globPatterns: ['**/*.{js,mjs,css,html,svg,png,webp,woff2}', 'species/*.json'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        runtimeCaching: [
          {
            // Esri World Imagery for the satellite and hybrid maps. A tile under one URL never changes.
            urlPattern: /^https:\/\/server\.arcgisonline\.com\/ArcGIS\/rest\/services\/World_Imagery\/MapServer\/tile\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'imagery-tiles',
              expiration: { maxEntries: 3000, maxAgeSeconds: 60 * 60 * 24 * 30, purgeOnQuotaError: true },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
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
