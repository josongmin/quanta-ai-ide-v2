import { afterEach, describe, it, expect } from 'vitest';
import { resolveQuantaConfig } from '../config';

// C1 guard: a crafted `?ws=…&token=…` deeplink must not retarget the socket at
// an attacker host over plaintext, and the token must be scrubbed from the URL.

afterEach(() => { window.history.replaceState(null, '', '/'); });

describe('resolveQuantaConfig — deeplink security', () => {
  it('REJECTS a remote wss:// deeplink (exfil guard) but still scrubs ws/token from the URL', () => {
    // A deeplink is untrusted: it may not point the socket + token at a remote
    // host, even over TLS — that is a token/chat exfil channel. Only the trusted
    // env/injected path may set a remote (pinned) host. The credential params are
    // still scrubbed from the address bar regardless.
    window.history.replaceState(null, '', '/?ws=wss%3A%2F%2Fapi.example.com%2F&token=secret&keep=1');
    const cfg = resolveQuantaConfig();
    expect(cfg?.wsUrl).not.toBe('wss://api.example.com/'); // must NOT connect to the remote host
    expect(window.location.search).toBe('?keep=1'); // credentials scrubbed, rest kept
  });

  it('rejects a plaintext ws:// deeplink to a non-local host (token-exfil guard)', () => {
    window.history.replaceState(null, '', '/?ws=ws%3A%2F%2Fevil.com&token=secret');
    const cfg = resolveQuantaConfig();
    expect(cfg?.wsUrl).not.toBe('ws://evil.com'); // must not connect to the attacker host
    expect(window.location.search).toBe(''); // still scrubbed
  });

  it('accepts a local ws:// dev-daemon deeplink', () => {
    window.history.replaceState(null, '', '/?ws=ws%3A%2F%2F127.0.0.1%3A4096%2F');
    expect(resolveQuantaConfig()?.wsUrl).toBe('ws://127.0.0.1:4096/');
  });
});
