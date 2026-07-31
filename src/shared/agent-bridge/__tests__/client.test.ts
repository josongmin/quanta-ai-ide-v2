import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { QuantaSessionClient } from '../client';

// Controllable WebSocket mock so we can drive the handshake + close lifecycle.
class MockWS {
  static instances: MockWS[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public url: string) { MockWS.instances.push(this); }
  send(): void { /* noop */ }
  close(): void { this.onclose?.(); }
}

const snapshot = (sessionId: string) =>
  JSON.stringify({ kind: 'snapshot', payload: { sessionId, seq: 0 } });

beforeEach(() => {
  MockWS.instances = [];
  // Inject a resolvable daemon so config resolution is independent of DEV mode.
  window.__QUANTA_CONFIG__ = { wsUrl: 'wss://daemon.test/' };
  vi.stubGlobal('WebSocket', MockWS);
  vi.useFakeTimers();
});
afterEach(() => {
  delete window.__QUANTA_CONFIG__;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function connectAndHandshake(): { c: QuantaSessionClient; ws: MockWS } {
  const c = new QuantaSessionClient();
  c.connect();
  const ws = MockWS.instances[0];
  ws.onopen?.();
  ws.onmessage?.({ data: snapshot('s1') });
  return { c, ws };
}

describe('QuantaSessionClient — reconnect (H5)', () => {
  it('reconnects with backoff after an unexpected close', () => {
    const { c, ws } = connectAndHandshake();
    expect(c.phase).toBe('connected');

    ws.onclose?.(); // unexpected drop
    expect(c.phase).toBe('connecting'); // recoverable, not a hard 'closed'
    expect(MockWS.instances).toHaveLength(1);

    vi.advanceTimersByTime(600); // first backoff ~500ms
    expect(MockWS.instances).toHaveLength(2); // reconnected
  });

  it('does NOT reconnect after an explicit close()', () => {
    const { c } = connectAndHandshake();
    c.close();
    expect(c.phase).toBe('closed');

    vi.advanceTimersByTime(30_000);
    expect(MockWS.instances).toHaveLength(1); // stayed closed
  });

  it('gives up after the max reconnect budget', () => {
    const { c, ws } = connectAndHandshake();
    let live = ws;
    // Fail every attempt: each new socket immediately closes.
    for (let i = 0; i < 8; i++) {
      live.onclose?.();
      vi.advanceTimersByTime(20_000);
      live = MockWS.instances[MockWS.instances.length - 1];
    }
    expect(c.phase).toBe('closed'); // budget exhausted → hard closed
  });
});

describe('QuantaSessionClient — subscriber isolation', () => {
  const eventFrame = () =>
    JSON.stringify({ kind: 'event', payload: { type: 'session.created', seq: 1, eventId: 'e1' } });

  it('a throwing subscriber does not skip siblings or wedge delivery', () => {
    const { c, ws } = connectAndHandshake();
    const calls: string[] = [];
    c.onAny(() => { calls.push('a'); throw new Error('boom'); });
    c.onAny(() => { calls.push('b'); });
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => { /* swallow */ });

    // First handler throws; the second must still run, and onmessage must not throw.
    expect(() => { ws.onmessage?.({ data: eventFrame() }); }).not.toThrow();
    expect(calls).toEqual(['a', 'b']);
    expect(errSpy).toHaveBeenCalled();

    // A subsequent event is still delivered (delivery not wedged by the throw).
    calls.length = 0;
    ws.onmessage?.({ data: eventFrame() });
    expect(calls).toEqual(['a', 'b']);

    errSpy.mockRestore();
  });
});
