import { isMacOS } from './platform';
import { isTauri } from './runtime';

export type NativeWindowTheme = 'dark' | 'light';

export async function syncNativeWindowTheme(theme: NativeWindowTheme): Promise<void> {
  if (!isTauri() || !isMacOS()) return;
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().setTheme(theme);
  } catch {
    // Best-effort native chrome sync only.
  }
}
