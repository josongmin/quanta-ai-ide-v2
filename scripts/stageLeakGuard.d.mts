import type { Plugin } from 'vite';

export declare const HEAVY_ROOT_RES: RegExp[];
export declare const EAGER_ALLOW_RES: RegExp[];

/** Heavy-root module ids reachable from the entry chunk via STATIC imports ([] = clean). */
export declare function findStageLeaks(bundle: Record<string, unknown>): string[];

/** Vite plugin that fails the build if a heavy lazy-only area leaks onto the critical path. */
export declare function stageLeakGuardPlugin(): Plugin;
