// Detects whether the app is running inside the Tauri webview.
// Use this guard before reaching for native APIs so the same build can ship
// to web and desktop without runtime errors.

type TauriWindow = Window & { __TAURI_INTERNALS__?: unknown };

export const isTauri = (): boolean =>
  typeof window !== 'undefined' &&
  (window as TauriWindow).__TAURI_INTERNALS__ !== undefined;

// Begins an OS-native window drag session. No-op outside Tauri; best-effort
// inside it (a failed drag is a non-event, never worth surfacing). Dynamic
// import keeps @tauri-apps/api off the web bundle's critical path.
export async function startWindowDrag(): Promise<void> {
  if (!isTauri()) return;
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().startDragging();
  } catch {
    // swallowed by design — see above
  }
}
