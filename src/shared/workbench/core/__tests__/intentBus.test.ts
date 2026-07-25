import { describe, it, expect } from 'vitest';
import { IntentBus, type BusLimits, type Intent } from '../IntentBus';
import { ScopeNode } from '../ScopeNode';
import type { ScopeIdentity } from '../../contract';

const identity = (name: string): ScopeIdentity => ({ id: `core.${name}`, kind: 'surface', owner: { owner: 'core', trust: 'core' } });
const limits: BusLimits = { maxCount: 3, maxBytes: 100, ttlMs: 1000 };
const intent = (over: Partial<Intent> = {}): Intent => ({ type: 'ping', owner: 'acme', payload: null, ...over });

function tree(): { root: ScopeNode; child: ScopeNode } {
  const root = new ScopeNode(identity('root'));
  const c = root.createChild(identity('child'));
  if (!c.ok) throw new Error('unreachable');
  return { root, child: c.value };
}

describe('IntentBus delivery and bounds', () => {
  it('delivers addressed to the target and bubbles to ancestors', () => {
    const bus = new IntentBus(limits);
    const { root, child } = tree();
    const hits: string[] = [];
    bus.subscribe(root, 'ping', () => hits.push('root'));
    bus.subscribe(child, 'ping', () => hits.push('child'));

    bus.enqueue(child, intent(), 'addressed', 0);
    bus.flush(1);
    expect(hits).toEqual(['child']);

    hits.length = 0;
    bus.enqueue(child, intent(), 'bubble', 0);
    bus.flush(1);
    expect(hits.sort()).toEqual(['child', 'root']);
  });

  it('rejects delivery to a disposed scope', () => {
    const bus = new IntentBus(limits);
    const { child } = tree();
    child.dispose();
    const r = bus.enqueue(child, intent(), 'addressed', 0);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]?.reason).toBe('scope-disposed');
  });

  it('reason-codes count and byte overflow', () => {
    const bus = new IntentBus(limits);
    const { root } = tree();
    bus.enqueue(root, intent({ coalesceKey: undefined }), 'addressed', 0);
    bus.enqueue(root, intent(), 'addressed', 0);
    bus.enqueue(root, intent(), 'addressed', 0);
    const overflow = bus.enqueue(root, intent(), 'addressed', 0); // 4th > maxCount 3
    expect(overflow.ok).toBe(false);
    if (!overflow.ok) expect(overflow.errors[0]?.reason).toBe('queue-overflow');

    const big = new IntentBus({ maxCount: 10, maxBytes: 50, ttlMs: 1000 });
    const r = big.enqueue(root, intent({ bytes: 60 }), 'addressed', 0);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]?.detail?.['kind']).toBe('bytes');
  });

  it('expires TTL-exceeded intents with a reason instead of silent drop', () => {
    const bus = new IntentBus(limits);
    const { root } = tree();
    bus.subscribe(root, 'ping', () => undefined);
    bus.enqueue(root, intent(), 'addressed', 0);
    const result = bus.flush(5000); // beyond ttlMs 1000
    expect(result.delivered).toBe(0);
    expect(result.expired[0]?.reason).toBe('ttl-expired');
  });

  it('rejects a coalesce replacement that grows past the byte budget', () => {
    const bus = new IntentBus({ maxCount: 10, maxBytes: 50, ttlMs: 1000 });
    const { root } = tree();
    bus.enqueue(root, intent({ owner: 'a', coalesceKey: 'k1', bytes: 10 }), 'addressed', 0);
    bus.enqueue(root, intent({ owner: 'b', coalesceKey: 'k2', bytes: 20 }), 'addressed', 0);
    // replace the 10-byte entry with a 40-byte one -> 20+40 = 60 > 50
    const r = bus.enqueue(root, intent({ owner: 'a', coalesceKey: 'k1', bytes: 40 }), 'addressed', 0);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]?.detail?.['kind']).toBe('bytes');
    expect(bus.pendingCount()).toBe(2); // original entry untouched
  });

  it('treats age == ttlMs as still deliverable (closed interval)', () => {
    const bus = new IntentBus({ maxCount: 3, maxBytes: 100, ttlMs: 1000 });
    const { root } = tree();
    bus.subscribe(root, 'ping', () => undefined);
    bus.enqueue(root, intent(), 'addressed', 0);
    const atEdge = bus.flush(1000); // age exactly ttlMs
    expect(atEdge.delivered).toBe(1);
    expect(atEdge.expired).toHaveLength(0);
  });

  it('coalesces within an owner but never across owners', () => {
    const bus = new IntentBus(limits);
    const { root } = tree();
    bus.enqueue(root, intent({ owner: 'acme', coalesceKey: 'k' }), 'addressed', 0);
    bus.enqueue(root, intent({ owner: 'acme', coalesceKey: 'k' }), 'addressed', 0); // coalesced
    expect(bus.pendingCount()).toBe(1);
    bus.enqueue(root, intent({ owner: 'other', coalesceKey: 'k' }), 'addressed', 0); // different owner
    expect(bus.pendingCount()).toBe(2);
  });

  it('clears the pending queue on owner cancellation', () => {
    const bus = new IntentBus(limits);
    const { root } = tree();
    bus.enqueue(root, intent({ owner: 'acme' }), 'addressed', 0);
    bus.enqueue(root, intent({ owner: 'acme', coalesceKey: 'z' }), 'addressed', 0);
    expect(bus.cancelOwner('acme')).toBe(2);
    expect(bus.pendingCount()).toBe(0);
  });
});
