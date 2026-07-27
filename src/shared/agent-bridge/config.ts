// Quanta agent bridge — connection bootstrap.
//
// Resolves where the quanta-codeagent web-daemon lives so the demo chat can
// drive the REAL agent over the session.v1 WebSocket protocol. Resolution
// order (first hit wins) mirrors quanta's own web-frontend bootstrap:
//   1. window.__QUANTA_CONFIG__            — injected by the Tauri shell sidecar
//   2. ?ws=…&token=…                       — query string (share / deeplink)
//   3. VITE_QUANTA_WS_URL / _AUTH_TOKEN    — build-time env
//   4. (dev only) ws://127.0.0.1:4096/     — `bun run src/apps/web-daemon` default
//
// Returns null when nothing resolves — the chat then falls back to its local
// synthReply (offline demo mode). Resolved lazily (a function, not a const) so
// a late Tauri `quanta:config-ready` injection is picked up when chat opens.

export type QuantaConfig = {
  readonly wsUrl: string;
  readonly token: string | null;
};

/* eslint-disable @typescript-eslint/consistent-type-definitions --
 * Augmenting the ambient `Window` requires `interface` declaration-merging;
 * a `type` alias cannot merge into the global declaration. */
declare global {
  interface Window {
    __QUANTA_CONFIG__?: {
      wsUrl?: string;
      authToken?: string;
      token?: string;
    };
  }
}
/* eslint-enable @typescript-eslint/consistent-type-definitions */

const DEV_DEFAULT_WS_URL = 'ws://127.0.0.1:4096/';

function fromInjectedConfig(): QuantaConfig | null {
  if (typeof window === 'undefined') return null;
  const c = window.__QUANTA_CONFIG__;
  if (c === undefined || typeof c.wsUrl !== 'string' || c.wsUrl.length === 0) return null;
  return { wsUrl: c.wsUrl, token: c.authToken ?? c.token ?? null };
}

// Gate for the UNTRUSTED deeplink source (`?ws=…&token=…`) only — env/injected
// config is trusted and bypasses this. A deeplink may target ONLY a local
// loopback ws:// daemon; it may NOT set a remote host (ws OR wss). Allowing a
// remote wss here was an exfil hole: a crafted link could point the socket +
// token at `wss://attacker` (which the packaged CSP also permitted). A remote
// prod daemon must arrive via the trusted env/injected path with its host pinned
// in the CSP (see docs/security/ui-runtime-threat-model.md), never via a deeplink.
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]']);
function isAllowedWsUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'ws:' && LOOPBACK_HOSTS.has(u.hostname);
  } catch {
    return false;
  }
}

function fromQueryString(): QuantaConfig | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const ws = params.get('ws');
  if (ws === null || ws.length === 0) return null;
  const token = params.get('token');
  // Scrub the credential-bearing params from the address bar so the token
  // doesn't linger in history / the Referer header / a copy-pasted URL.
  if (params.has('ws') || params.has('token')) {
    params.delete('ws');
    params.delete('token');
    const qs = params.toString();
    window.history.replaceState(
      null, '',
      `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`,
    );
  }
  if (!isAllowedWsUrl(ws)) return null;
  return { wsUrl: ws, token };
}

function fromEnv(): QuantaConfig | null {
  const ws = import.meta.env.VITE_QUANTA_WS_URL;
  if (typeof ws !== 'string' || ws.length === 0) return null;
  const token = import.meta.env.VITE_QUANTA_AUTH_TOKEN;
  return { wsUrl: ws, token: typeof token === 'string' && token.length > 0 ? token : null };
}

function devDefault(): QuantaConfig | null {
  return import.meta.env.DEV ? { wsUrl: DEV_DEFAULT_WS_URL, token: null } : null;
}

/** Resolve the live daemon connection, or null when the chat should stay in
 *  offline (synthReply) mode. Re-reads sources on every call. */
export function resolveQuantaConfig(): QuantaConfig | null {
  return fromInjectedConfig() ?? fromQueryString() ?? fromEnv() ?? devDefault();
}
