import { test, expect } from '@playwright/test';
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Runtime proof for P0-2: the packaged Tauri CSP must actually let the
// agent-bridge WebSocket open. The unit test (agent-bridge/__tests__/csp.test.ts)
// only string-matches the config; this drives a REAL browser enforcing that exact
// CSP as a response header (how Tauri applies it) and observes whether a
// `new WebSocket('ws://127.0.0.1:4096')` is refused by connect-src.
//
// A CSP block fires a `securitypolicyviolation` event BEFORE any connection —
// so this needs no live daemon and no free port, which keeps it non-flaky. The
// control policy (connect-src without the ws allowances = the pre-P0-2 policy)
// must block the same socket, proving both that the test discriminates and that
// the ws allowance is load-bearing.

const CONF = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src-tauri/tauri.conf.json');
const REAL_CSP = (JSON.parse(readFileSync(CONF, 'utf8')) as { app: { security: { csp: string } } }).app.security.csp;
const CONTROL_CSP = REAL_CSP.replace(/connect-src[^;]*/, "connect-src 'self' ipc: http://ipc.localhost");

const HARNESS = `
  window.__violations = [];
  document.addEventListener('securitypolicyviolation', (e) => {
    if (e.violatedDirective && e.violatedDirective.startsWith('connect-src')) window.__violations.push(e.blockedURI);
  });
  window.tryWs = (url) => new Promise((resolve) => {
    let ws; try { ws = new WebSocket(url); } catch { return resolve(); }
    ws.onopen = () => { try { ws.close(); } catch {} resolve(); };
    ws.onerror = () => resolve();
    setTimeout(resolve, 1000);
  });
`;

async function serveWithCsp(csp: string): Promise<{ url: string; close: () => void }> {
  const srv = http.createServer((req, res) => {
    const isJs = req.url === '/harness.js';
    res.writeHead(200, {
      'Content-Type': isJs ? 'text/javascript' : 'text/html',
      'Content-Security-Policy': csp,
    });
    // script-src 'self' blocks inline scripts, so the harness is external same-origin.
    res.end(isJs ? HARNESS : '<!doctype html><html><body><script src="/harness.js"></script></body></html>');
  });
  await new Promise<void>((r) => srv.listen(0, '127.0.0.1', r));
  const { port } = srv.address() as { port: number };
  return { url: `http://127.0.0.1:${port}/`, close: () => srv.close() };
}

async function connectViolations(page: import('@playwright/test').Page, csp: string): Promise<string[]> {
  const server = await serveWithCsp(csp);
  try {
    await page.goto(server.url, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => (window as unknown as { tryWs: (u: string) => Promise<void> }).tryWs('ws://127.0.0.1:4096'));
    return await page.evaluate(() => (window as unknown as { __violations: string[] }).__violations);
  } finally {
    server.close();
  }
}

test.describe('P0-2 CSP permits the agent-bridge WebSocket at runtime', () => {
  test('the packaged CSP does NOT block ws://127.0.0.1:4096', async ({ page }) => {
    const violations = await connectViolations(page, REAL_CSP);
    expect(violations, `connect-src blocked the socket under the real CSP: ${violations.join(', ')}`).toHaveLength(0);
  });

  test('the pre-P0-2 CSP (no ws allowance) DOES block it — the allowance is load-bearing', async ({ page }) => {
    const violations = await connectViolations(page, CONTROL_CSP);
    expect(violations).toContain('ws://127.0.0.1:4096/');
  });
});
