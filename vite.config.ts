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
      '@tauri-apps/plugin-dialog',
      '@tauri-apps/plugin-os',
      '@tauri-apps/plugin-shell',
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
        deps.filter((d) => !/vendor-three|viz-modes|chat-agent/.test(d)),
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
          return undefined;
        },
      },
    },
  },
});
