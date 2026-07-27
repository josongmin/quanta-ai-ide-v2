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

  it('rejects an event whose typed hot fields have the wrong type', () => {
    // A hostile/buggy daemon could ship a whitelisted type + valid seq/eventId
    // but lie about the payload the consumer reads as `string` / structured.
    expect(decodeFrame(event({ delta: 42 }))).toBeNull();
    expect(decodeFrame(event({ turnId: 7 }))).toBeNull();
    expect(decodeFrame(event({ toolCallId: {} }))).toBeNull();
    expect(decodeFrame(event({ toolName: false }))).toBeNull();
    expect(decodeFrame(event({ status: 1 }))).toBeNull();
    // approval must be an object carrying a string approvalId.
    expect(decodeFrame(event({ approval: 'nope' }))).toBeNull();
    expect(decodeFrame(event({ approval: {} }))).toBeNull();
    expect(decodeFrame(event({ approval: { approvalId: 1 } }))).toBeNull();
    expect(decodeFrame(event({ approval: { approvalId: 'a', reason: 2 } }))).toBeNull();
  });

  it('still admits an event with a well-typed approval / no optional fields', () => {
    const ok = decodeFrame(JSON.stringify({
      kind: 'event',
      payload: { type: 'approval.requested', seq: 3, eventId: 'e9', approval: { approvalId: 'ap1', reason: 'why' } },
    }));
    expect(ok?.kind).toBe('event');
    if (ok?.kind === 'event') expect(ok.event.approval?.approvalId).toBe('ap1');
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
