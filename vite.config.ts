import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Tauri injects TAURI_ENV_* at dev/build time. We use them to flip a few
// targets so the same vite.config works for browser and desktop.
const host = process.env.TAURI_DEV_HOST;
const isTauri = process.env.TAURI_ENV_PLATFORM !== undefined;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@app':      path.resolve(__dirname, 'src/app'),
      '@widgets':  path.resolve(__dirname, 'src/widgets'),
      '@features': path.resolve(__dirname, 'src/features'),
      '@entities': path.resolve(__dirname, 'src/entities'),
      '@shared':   path.resolve(__dirname, 'src/shared'),
    },
  },
  // Don't obscure Rust errors during `tauri dev`.
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    host: host ?? false,
    hmr: host ? { protocol: 'ws', host, port: 5174 } : undefined,
    watch: {
      // Avoid HMR loops from Rust artifacts.
      ignored: ['**/src-tauri/**'],
    },
  },
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
  // Pre-bundle the heavy/widely-imported deps so dev cold start doesn't
  // pay a per-module crawl cost on first request. Tauri-only modules are
  // excluded — they're not used in the browser dev server.
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'three',
      '@tanstack/react-router',
      'zustand',
      'zustand/middleware',
      'lucide-react',
      'i18next',
      'react-i18next',
    ],
    exclude: [
      '@tauri-apps/api',
    ],
  },
  build: {
    // Match webview targets when bundling for Tauri; keep modern defaults
    // otherwise.
    target: isTauri
      ? process.env.TAURI_ENV_PLATFORM === 'windows'
        ? 'chrome105'
        : 'safari13'
      : 'esnext',
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
    // Vite's default is to emit `<link rel="modulepreload">` for every chunk
    // reachable from the entry — including dynamic-import targets. That
    // would defeat the whole point of code-splitting three.js / chat-agent
    // off the critical path. We filter the preload list down to chunks that
    // belong to the *static* dependency graph of the entry (vendor-react,
    // vendor-icons) and drop the lazy ones (`vendor-three`, `viz-modes`,
    // any chat-agent chunk). The polyfill stays on for older Tauri webviews.
    modulePreload: {
      polyfill: true,
      resolveDependencies: (_filename, deps) =>
        deps.filter((d) => !/vendor-three|viz-modes|chat-agent|admission-|coding-|review-/.test(d)),
    },
    rollupOptions: {
      output: {
        // Hand-tuned chunking. Heavy / lazy areas get their own chunks so the
        // initial app shell stays small; vendor libs split out so they can
        // cache independently from app code.
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('three')) return 'vendor-three';
            if (id.includes('lucide-react')) return 'vendor-icons';
            // TanStack Router + its store dep — separate so a router upgrade
            // doesn't bust the React vendor cache and vice versa.
            if (id.includes('@tanstack')) return 'vendor-router';
            // i18n split: react-i18next + i18next + detector + resources-to-backend.
            // Kept separate from vendor-react so a React update doesn't bust the
            // i18n cache and vice versa. Both are initial (we await
            // loadNamespaces before first render), so this is purely a caching
            // win, not a critical-path size win.
            if (
              id.includes('react-i18next') ||
              id.includes('/i18next/') ||
              id.includes('i18next-browser-languagedetector') ||
              id.includes('i18next-resources-to-backend')
            ) {
              return 'vendor-i18n';
            }
            // better-auth (+ its deps) BEFORE the vendor-react rule: its client
            // entry lives at `.../client/react/...`, whose `/react/` substring
            // would otherwise false-match into vendor-react and drag the whole
            // auth SDK into the initial chunk. It's only ever dynamically
            // imported (real-auth mode), so its own chunk stays async — the
            // standalone demo (mock) ships none of it.
            if (
              id.includes('better-auth') ||
              id.includes('@better-fetch') ||
              id.includes('nanostores') ||
              id.includes('@noble')
            ) {
              return 'vendor-auth';
            }
            if (id.includes('react-dom') || id.includes('/react/') || id.endsWith('/react') || id.includes('scheduler')) {
              return 'vendor-react';
            }
            return undefined;
          }
          // Mode files are heavy 3D scene factories — group them so the
          // initial shell can avoid loading whichever modes the user never
          // visits (and so the dynamic-import boundary in registry.ts
          // resolves to a single shared chunk rather than four tiny ones).
          if (/src\/features\/switch-mode\/lib\/.*Mode\.ts$/.test(id)) {
            return 'viz-modes';
          }
          // The admission-rules v2 god-pages (HealthPage 1355 lines, RulesPage 815,
          // GatePage) were rolled into a single ~62 KB-gz admission chunk that
          // tripped the per-chunk budget. Splitting them keeps the slice itself
          // lazy at the route boundary, and each sub-page only ships when the
          // user clicks its sidebar entry.
          if (/src\/features\/admission-rules\/ui\/v2\/parts\/HealthPage/.test(id)) {
            return 'admission-health';
          }
          if (/src\/features\/admission-rules\/ui\/v2\/parts\/RulesPage/.test(id)) {
            return 'admission-rules-page';
          }
          if (/src\/features\/admission-rules\/ui\/v2\/parts\/GatePage/.test(id)) {
            return 'admission-gate';
          }
          // Coding stage's heavy turn-renderer parts (Blocks/Composer + their
          // turn subcomponents) push the coding-stage chunk above the 50 KB-gz
          // per-chunk budget. Pull the Composer (1k+ lines) and the
          // turn/blocks tree into their own chunks; ThreadPane resolves them
          // through the same boundary so the runtime cost is one extra fetch
          // on first /coding visit and free thereafter.
          if (/src\/widgets\/coding-stage\/parts\/Composer/.test(id)) {
            return 'coding-composer';
          }
          if (/src\/widgets\/coding-stage\/parts\/turn\//.test(id)) {
            return 'coding-turn';
          }
          // Review stage's god-files (LeftQueue 1364 lines, ReviewCoreScenes
          // 835, ReviewDecisionChrome 604) collapse into one ~64 KB-gz chunk.
          // Each is reachable from the lazy /reviews route, so splitting them
          // costs one extra round-trip on first review but keeps any single
          // chunk under the per-chunk budget.
          if (/src\/widgets\/review-stage\/ui\/LeftQueue/.test(id)) {
            return 'review-queue';
          }
          if (/src\/widgets\/review-stage\/ui\/ReviewCoreScenes/.test(id)) {
            return 'review-scenes';
          }
          if (/src\/widgets\/review-stage\/ui\/ReviewDecisionChrome/.test(id)) {
            return 'review-decision';
          }
          return undefined;
        },
      },
    },
  },
});
