// Detects whether the app is running inside the Tauri webview.
// Use this guard before reaching for native APIs so the same build can ship
// to web and desktop without runtime errors.

type TauriWindow = Window & { __TAURI_INTERNALS__?: unknown };

export const isTauri = (): boolean =>
  typeof window !== 'undefined' &&
  (window as TauriWindow).__TAURI_INTERNALS__ !== undefined;
