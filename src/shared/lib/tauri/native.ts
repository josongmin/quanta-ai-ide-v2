// Native helpers that wrap Tauri plugin APIs behind the same `isTauri()`
// guard as `invoke`. In the browser these fall back to web equivalents
// (`window.open`) so feature code never has to branch.

import { open as shellOpen } from '@tauri-apps/plugin-shell';

import { isTauri } from './runtime';

// Allow-list of URL protocols permitted by `openExternal`. Anything else
// (e.g. `file:`, `javascript:`, custom schemes) is rejected before reaching
// the OS shell — `shellOpen` is essentially `xdg-open` / `NSWorkspace`,
// which would happily resolve attacker-controlled schemes.
const ALLOWED_PROTOCOLS = new Set(['https:', 'http:', 'mailto:']);

// Open an external URL in the user's default browser. On macOS this routes
// through `NSWorkspace`, which respects the system default — `window.open`
// inside the webview would just navigate the app away.
export const openExternal = async (url: string): Promise<void> => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`openExternal: invalid URL: ${url}`);
  }
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    throw new Error(`openExternal: protocol not allowed: ${parsed.protocol}`);
  }
  if (isTauri()) {
    await shellOpen(parsed.toString());
    return;
  }
  window.open(parsed.toString(), '_blank', 'noopener,noreferrer');
};
