// Regression lock for P0-2: the packaged Tauri shell must not silently re-block
// the agent-bridge WebSocket. In dev there is no CSP (the webview loads the vite
// devUrl), so a `connect-src` that omits ws/wss passes every dev smoke test and
// only fails once packaged — the socket handshake is refused and chat degrades
// to offline synthReply with no error the user can see. This test fails fast if
// the CSP stops permitting the WS transports the client actually dials
// (config.ts): the local dev daemon (ws://127.0.0.1:4096) and any wss:// daemon.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

const tauriConf = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../src-tauri/tauri.conf.json',
);

function connectSrc(): string {
  const conf = JSON.parse(readFileSync(tauriConf, 'utf8')) as {
    app: { security: { csp: string } };
  };
  const csp = conf.app.security.csp;
  const directive = csp.split(';').map((d) => d.trim()).find((d) => d.startsWith('connect-src'));
  if (directive === undefined) throw new Error('CSP has no connect-src directive');
  return directive;
}

describe('Tauri CSP connect-src permits the agent-bridge WebSocket', () => {
  it('allows the local dev daemon over ws://127.0.0.1:4096', () => {
    expect(connectSrc()).toContain('ws://127.0.0.1:4096');
  });

  it('allows every loopback host isAllowedWsUrl accepts (127.0.0.1, localhost, [::1])', () => {
    // Lockstep with config.ts isAllowedWsUrl: it accepts ws:// on 127.0.0.1,
    // localhost, and the IPv6 loopback [::1]. If CSP omits one, a daemon on that
    // host passes the app allowlist but the socket is refused by the webview —
    // the exact silent-degrade P0-2 fixed. Keep the two in sync.
    const directive = connectSrc();
    expect(directive).toContain('ws://127.0.0.1:4096');
    expect(directive).toContain('ws://localhost:4096');
    expect(directive).toContain('ws://[::1]:4096');
  });

  it('does NOT open a bare wss: scheme-source (fail-closed until a prod host is pinned)', () => {
    // A bare `wss:` authorizes WebSocket egress to ANY host — an exfil channel
    // for a compromised dep / XSS. No prod daemon host is configured in this
    // repo, so connect-src stays loopback-ws only; a real remote daemon must pin
    // its exact origin here (see docs/security/ui-runtime-threat-model.md).
    expect(connectSrc()).not.toMatch(/(^|\s)wss:(\s|$)/);
  });

  it("keeps 'self' and the Tauri IPC origin (does not regress the base policy)", () => {
    const directive = connectSrc();
    expect(directive).toContain("'self'");
    expect(directive).toContain('ipc:');
  });
});
