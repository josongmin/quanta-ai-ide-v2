import { test, expect } from '@playwright/test';
import http from 'node:http';
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Runtime receipt for P0-2 / CSP-1: the packaged Tauri CSP must PERMIT the local
// agent-bridge WebSocket and BLOCK everything else. This drives a real browser
// (Chromium + WebKit — WKWebView is WebKit, the shipped macOS engine) enforcing
// the exact packaged CSP as a response header, and observes connect-src.
//
// What is proven, precisely:
//   1. connect-src does NOT fire a securitypolicyviolation for ws://127.0.0.1:4096
//      (permitted) — and, when a throwaway daemon is bindable on that port, the
//      socket actually OPENS end-to-end (not merely "not blocked").
//   2. connect-src DOES block a remote wss:// host — i.e. the bare `wss:`
//      over-permission (CSP-1) is gone; a compromised dep / deeplink cannot open
//      an exfil channel to an arbitrary host.
//   3. the pre-P0-2 control policy (ws stripped) blocks the loopback socket,
//      proving the ws allowance is load-bearing.
// A CSP block fires BEFORE any connection, so 1(block)/2/3 need no live daemon
// and no free port — non-flaky. The open-assertion in 1 is best-effort.

const CONF = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src-tauri/tauri.conf.json');
const REAL_CSP = (JSON.parse(readFileSync(CONF, 'utf8')) as { app: { security: { csp: string } } }).app.security.csp;
const CONTROL_CSP = REAL_CSP.replace(/connect-src[^;]*/, "connect-src 'self' ipc: http://ipc.localhost");

const HARNESS = `
  window.__violations = [];
  document.addEventListener('securitypolicyviolation', (e) => {
    if (e.violatedDirective && e.violatedDirective.startsWith('connect-src')) window.__violations.push(e.blockedURI);
  });
  window.tryWs = (url) => new Promise((resolve) => {
    let ws; try { ws = new WebSocket(url); } catch { return resolve('threw'); }
    ws.onopen = () => { try { ws.close(); } catch {} resolve('open'); };
    ws.onerror = () => resolve('errored');
    setTimeout(() => resolve('timeout'), 1000);
  });
`;

async function serveWithCsp(csp: string): Promise<{ url: string; close: () => void }> {
  const srv = http.createServer((req, res) => {
    const isJs = req.url === '/harness.js';
    res.writeHead(200, { 'Content-Type': isJs ? 'text/javascript' : 'text/html', 'Content-Security-Policy': csp });
    // script-src 'self' blocks inline scripts, so the harness is external same-origin.
    res.end(isJs ? HARNESS : '<!doctype html><html><body><script src="/harness.js"></script></body></html>');
  });
  await new Promise<void>((r) => srv.listen(0, '127.0.0.1', r));
  const { port } = srv.address() as { port: number };
  return { url: `http://127.0.0.1:${port}/`, close: () => srv.close() };
}

// Minimal RFC6455 ws server so an ALLOWED socket can actually open. Best-effort:
// if 127.0.0.1:4096 is already taken, returns null and the open-assertion is skipped.
async function tryDaemon(port: number): Promise<http.Server | null> {
  const srv = http.createServer();
  srv.on('upgrade', (req, socket) => {
    const accept = crypto
      .createHash('sha1')
      .update((req.headers['sec-websocket-key'] ?? '') + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
      .digest('base64');
    socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
  });
  return await new Promise((resolve) => {
    srv.once('error', () => resolve(null));
    srv.listen(port, '127.0.0.1', () => resolve(srv));
  });
}

async function probe(page: import('@playwright/test').Page, csp: string, url: string): Promise<{ outcome: string; violations: string[] }> {
  const server = await serveWithCsp(csp);
  try {
    await page.goto(server.url, { waitUntil: 'domcontentloaded' });
    const outcome = await page.evaluate((u) => (window as unknown as { tryWs: (u: string) => Promise<string> }).tryWs(u), url);
    const violations = await page.evaluate(() => (window as unknown as { __violations: string[] }).__violations);
    return { outcome, violations };
  } finally {
    server.close();
  }
}

test.describe('P0-2/CSP-1 the packaged CSP permits the agent-bridge WS and blocks the rest', () => {
  test('permits ws://127.0.0.1:4096 (no connect-src violation), and it OPENS when a daemon is up', async ({ page }) => {
    const daemon = await tryDaemon(4096);
    try {
      const { outcome, violations } = await probe(page, REAL_CSP, 'ws://127.0.0.1:4096');
      expect(violations, `connect-src blocked the loopback socket: ${violations.join(', ')}`).toHaveLength(0);
      if (daemon) expect(outcome, 'socket should open end-to-end against the throwaway daemon').toBe('open');
    } finally {
      daemon?.close();
    }
  });

  test('BLOCKS a remote wss:// host — the bare wss over-permission is gone (CSP-1)', async ({ page }) => {
    const { violations } = await probe(page, REAL_CSP, 'wss://exfil.attacker.example/x');
    expect(violations).toContain('wss://exfil.attacker.example/x');
  });

  test('the pre-P0-2 CSP (no ws allowance) blocks the loopback socket — the allowance is load-bearing', async ({ page }) => {
    const { violations } = await probe(page, CONTROL_CSP, 'ws://127.0.0.1:4096');
    expect(violations).toContain('ws://127.0.0.1:4096/');
  });
});
