import { describe, it, expect } from 'vitest';
import { decodeFrame, encodeConnectFrame } from '../protocol';

// decodeFrame is the trust boundary for a semi-trusted daemon — it must NEVER
// throw and must reject malformed/hostile frames.

const event = (over: Record<string, unknown> = {}) =>
  JSON.stringify({ kind: 'event', payload: { type: 'turn.output.delta', seq: 1, eventId: 'e1', delta: 'hi', ...over } });

describe('decodeFrame', () => {
  it('decodes a well-formed event frame', () => {
    const f = decodeFrame(event());
    expect(f?.kind).toBe('event');
    if (f?.kind === 'event') expect(f.event.delta).toBe('hi');
  });

  it('never throws on malformed input — returns null', () => {
    expect(decodeFrame('{not json')).toBeNull();
    expect(decodeFrame('42')).toBeNull();
    expect(decodeFrame('[1,2,3]')).toBeNull();
    expect(decodeFrame(null)).toBeNull();
    expect(decodeFrame('"a string"')).toBeNull();
  });

  it('rejects an event with a non-whitelisted type as "other" (dropped)', () => {
    const f = decodeFrame(JSON.stringify({ kind: 'event', payload: { type: '__proto__', seq: 1, eventId: 'e1' } }));
    expect(f).toEqual({ kind: 'other', tag: 'event' });
  });

  it('rejects an event missing seq / eventId', () => {
    expect(decodeFrame(JSON.stringify({ kind: 'event', payload: { type: 'turn.completed', eventId: 'e1' } }))).toBeNull();
    expect(decodeFrame(JSON.stringify({ kind: 'event', payload: { type: 'turn.completed', seq: 1 } }))).toBeNull();
    expect(decodeFrame(event({ seq: 'NaN' }))).toBeNull();
  });

  it('decodes snapshot and rejected(connect) control frames', () => {
    const snap = decodeFrame(JSON.stringify({ kind: 'snapshot', payload: { sessionId: 's1', seq: 0 } }));
    expect(snap).toEqual({ kind: 'snapshot', sessionId: 's1', seq: 0 });
    const rej = decodeFrame(JSON.stringify({ kind: 'rejected', target: 'connect', sessionId: 's2' }));
    expect(rej).toEqual({ kind: 'rejected', target: 'connect', sessionId: 's2' });
  });

  it('encodeConnectFrame round-trips a flat control envelope', () => {
    const parsed = JSON.parse(encodeConnectFrame('sid')) as Record<string, unknown>;
    expect(parsed['kind']).toBe('connect');
    expect(parsed['sessionId']).toBe('sid');
  });
});
