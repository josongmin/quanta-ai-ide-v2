// Detects whether the app is running inside the Tauri webview.
// Use this guard before reaching for native APIs so the same build can ship
// to web and desktop without runtime errors.

// Type-only import — erased at compile time, so the module still only loads
// via the dynamic import below.
import type * as WindowApiModule from '@tauri-apps/api/window';

type TauriWindow = Window & { __TAURI_INTERNALS__?: unknown };

export const isTauri = (): boolean =>
  typeof window !== 'undefined' &&
  (window as TauriWindow).__TAURI_INTERNALS__ !== undefined;

// Dynamic import keeps @tauri-apps/api off the web bundle's critical path, but
// the drag must fire within the mousedown gesture — so we cache the module
// promise and pre-warm it (see prewarmWindowDrag) rather than paying the import
// cost on the first grab, which is slow enough to miss the drag.
type WindowApi = typeof WindowApiModule;
let windowApi: Promise<WindowApi> | null = null;
function loadWindowApi(): Promise<WindowApi> {
  windowApi ??= import('@tauri-apps/api/window');
  return windowApi;
}

// Load the window API ahead of the first drag so startWindowDrag resolves
// synchronously-fast when the user actually grabs the titlebar. No-op on web.
export function prewarmWindowDrag(): void {
  if (isTauri()) void loadWindowApi();
}

// Begins an OS-native window drag session. No-op outside Tauri; best-effort
// inside it (a failed drag is a non-event, never worth surfacing).
export async function startWindowDrag(): Promise<void> {
  if (!isTauri()) return;
  try {
    const { getCurrentWindow } = await loadWindowApi();
    await getCurrentWindow().startDragging();
  } catch {
    // swallowed by design — see above
  }
}
