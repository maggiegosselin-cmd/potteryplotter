import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';
import { existsSync, readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// The potter's own picture for the top of My pots. It is optional: until the file is
// put in public/, the header draws its SVG instead, and nothing about it is precached.
const ILLUSTRATION = 'pots-illustration.png';
const illustration = existsSync(new URL(`./public/${ILLUSTRATION}`, import.meta.url)) ? [ILLUSTRATION] : [];

// Workbox (through vite-plugin-pwa) builds the precache list and the service
// worker from the files Vite emits, so the app shell loads with no signal.
export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icons/apple-touch-icon.png', ...illustration],
      manifest: {
        name: 'Pot Log',
        short_name: 'Pot Log',
        description: 'Log your pots with a photo, even with no signal.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f4e9d6',
        theme_color: '#f4e9d6',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
