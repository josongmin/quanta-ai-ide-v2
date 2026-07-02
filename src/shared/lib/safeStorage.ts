// Resilient Web Storage access. localStorage/sessionStorage can throw (quota
// exceeded, private-mode, disabled storage), so every call is wrapped: writes
// are best-effort and reads fall back to null. Failures are swallowed for the
// user but surfaced in dev so they aren't silently lost — replacing the ~8
// hand-rolled `try { ... } catch { /* ignore */ }` blocks scattered across the
// app with one audited helper.

function warn(scope: string, e: unknown): void {
  if (import.meta.env.DEV) {
    console.warn(`[safeStorage] ${scope} failed`, e);
  }
}

export function safeLocalSet(key: string, value: string): void {
  try { window.localStorage.setItem(key, value); } catch (e) { warn('localStorage.setItem', e); }
}

export function safeLocalGet(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch (e) { warn('localStorage.getItem', e); return null; }
}

export function safeSessionSet(key: string, value: string): void {
  try { window.sessionStorage.setItem(key, value); } catch (e) { warn('sessionStorage.setItem', e); }
}

export function safeSessionGet(key: string): string | null {
  try { return window.sessionStorage.getItem(key); } catch (e) { warn('sessionStorage.getItem', e); return null; }
}

export function safeLocalRemove(key: string): void {
  try { window.localStorage.removeItem(key); } catch (e) { warn('localStorage.removeItem', e); }
}

export function safeSessionRemove(key: string): void {
  try { window.sessionStorage.removeItem(key); } catch (e) { warn('sessionStorage.removeItem', e); }
}
