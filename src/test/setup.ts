import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Unmount React trees between tests so component tests don't leak DOM/state.
afterEach(() => {
  cleanup();
});

// ── jsdom gaps that block component tests ──────────────────────────────
// jsdom implements neither, and several UI components (SegmentedToggle's
// sliding thumb, glass surfaces, responsive hooks) construct them at mount.
// Stub once here so any component test can render without boilerplate.
if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = class {
    observe(): void {/* no layout in jsdom */}
    unobserve(): void {/* no-op */}
    disconnect(): void {/* no-op */}
  };
}

if (!('matchMedia' in globalThis)) {
  globalThis.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });
}
