/// <reference types="vite/client" />

/* eslint-disable @typescript-eslint/consistent-type-definitions --
 * Augmenting Vite's ImportMeta / ImportMetaEnv requires `interface`
 * declaration-merging; `type` cannot merge into the ambient declarations. */
interface ImportMetaEnv {
  /** REST base URL for the backend, e.g. https://api.example.com. Empty → mock. */
  readonly VITE_API_BASE_URL?: string;
  /** 'mock' (default) uses in-app generators; 'real' hits VITE_API_BASE_URL. */
  readonly VITE_API_MODE?: 'mock' | 'real';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
