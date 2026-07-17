/// <reference types="vite/client" />

/* eslint-disable @typescript-eslint/consistent-type-definitions --
 * Augmenting Vite's ImportMeta / ImportMetaEnv requires `interface`
 * declaration-merging; `type` cannot merge into the ambient declarations. */
interface ImportMetaEnv {
  /** REST base URL for the backend, e.g. https://api.example.com. Empty → mock. */
  readonly VITE_API_BASE_URL?: string;
  /** 'mock' (default) uses in-app generators; 'real' hits VITE_API_BASE_URL. */
  readonly VITE_API_MODE?: 'mock' | 'real';
  /** 'mock' (default) uses demo auth stubs; 'real' wires better-auth (accounts). */
  readonly VITE_AUTH_MODE?: 'mock' | 'real';
  /** accounts (better-auth) origin, e.g. http://localhost:4000. Empty → mock auth. */
  readonly VITE_ACCOUNTS_URL?: string;
  /** quanta-codeagent web-daemon WebSocket URL, e.g. ws://127.0.0.1:4096/. */
  readonly VITE_QUANTA_WS_URL?: string;
  /** Bearer token for the quanta web-daemon (QUANTA_WEB_AUTH_TOKEN). */
  readonly VITE_QUANTA_AUTH_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
