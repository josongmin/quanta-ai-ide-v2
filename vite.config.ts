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
    // Emit dist/.vite/manifest.json so bundle-budget can compute the entry's
    // real transitive STATIC-import closure (the bytes the browser must load
    // before interactivity) instead of guessing from filename globs. Dynamic
    // imports are recorded separately, which is exactly the split we budget on.
    manifest: true,
    // Vite's default is to emit `<link rel="modulepreload">` for every chunk
    // reachable from the entry — including dynamic-import targets. That would
    // defeat code-splitting three.js / auth off the critical path. We drop the
    // heavy vendor chunks from the preload list; app lazy chunks are hash-named
    // (manualChunks returns undefined for app code) and aren't static deps of
    // the entry, so they never reach this filter — the bundle-budget leak guard
    // is the real enforcement (by source membership, not by name). The polyfill
    // stays on for older Tauri webviews.
    modulePreload: {
      polyfill: true,
      resolveDependencies: (_filename, deps) =>
        deps.filter((d) => !/vendor-three|vendor-auth/.test(d)),
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
          // App-code chunking is left to Vite's natural dynamic-import
          // boundaries. Hand-naming surface-part chunks (viz-modes, coding-turn,
          // admission-*, review-*) previously entangled shared modules into those
          // named chunks, which made the ENTRY statically import them — dragging
          // three.js (118KB gz) and every stage onto the critical path (measured:
          // 419KB initial closure). Letting each dynamic import() define its own
          // chunk keeps heavy areas genuinely lazy; per-chunk size is bounded by
          // bundle-budget's largest-non-vendor check instead of manual grouping.
          return undefined;
        },
      },
    },
  },
});
