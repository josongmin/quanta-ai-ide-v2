import { describe, it, expect } from 'vitest';
import { ContextStore } from '../ContextStore';
import { WorkspaceSession } from '../WorkspaceSession';
import type { ContextEnvelope } from '../../contract';

function envelope(over: Partial<ContextEnvelope> = {}): ContextEnvelope {
  return { kind: 'selection', sensitivity: 'internal', durability: 'session', ref: 'ref:1', bytes: 10, metadata: {}, ...over };
}

describe('ContextStore admission', () => {
  it('rejects a durable secret and a byte-budget overflow', () => {
    const store = new ContextStore(50);
    const ws = new WorkspaceSession('ws', 'rev').captureHandle();
    const secret = store.put(envelope({ sensitivity: 'secret', durability: 'durable' }), ws, { ttlMs: 1000, schema: 's1' }, 0);
    expect(secret.ok).toBe(false);
    if (!secret.ok) expect(secret.errors[0]?.reason).toBe('durable-secret');

    const big = store.put(envelope({ bytes: 60 }), ws, { ttlMs: 1000, schema: 's1' }, 0);
    expect(big.ok).toBe(false);
    if (!big.ok) expect(big.errors[0]?.reason).toBe('byte-budget');
  });
});

describe('ContextStore leases', () => {
  const ws = new WorkspaceSession('ws', 'rev').captureHandle();

  it('distinguishes wrong-workspace, stale, expired, and schema-skew', () => {
    const store = new ContextStore(1000);
    const put = store.put(envelope(), ws, { ttlMs: 100, schema: 's1' }, 0);
    if (!put.ok) throw new Error('put failed');
    const handle = put.value.handle;

    const wrong = store.acquire(handle, { workspaceId: 'other', searchGeneration: 0, factsGeneration: 0 }, 0);
    expect(!wrong.ok && wrong.errors[0]?.reason).toBe('wrong-workspace');

    const stale = store.acquire(handle, { workspaceId: 'ws', searchGeneration: 1, factsGeneration: 0 }, 0);
    expect(!stale.ok && stale.errors[0]?.reason).toBe('stale-handle');

    const skew = store.acquire(handle, ws, 0, 's2');
    expect(!skew.ok && skew.errors[0]?.reason).toBe('schema-skew');

    const expired = store.acquire(handle, ws, 200); // past ttl 100
    expect(!expired.ok && expired.errors[0]?.reason).toBe('lease-expired');
  });

  it('keeps the entry while any lease is held and reclaims at the last close', () => {
    const store = new ContextStore(1000);
    const put = store.put(envelope(), ws, { ttlMs: 1000, schema: 's1' }, 0);
    if (!put.ok) throw new Error('put failed');
    const target = store.acquire(put.value.handle, ws, 0);
    if (!target.ok) throw new Error('acquire failed');
    expect(store.activeEntryCount()).toBe(1);

    put.value.lease.release(); // source close
    expect(store.activeEntryCount()).toBe(1); // target lease keeps it alive

    target.value.release(); // last close
    expect(store.activeEntryCount()).toBe(0);
    expect(store.totalBytes()).toBe(0);
  });

  it('rejects a duplicate ref put without leaking bytes', () => {
    const store = new ContextStore(1000);
    const first = store.put(envelope({ ref: 'dup', bytes: 30 }), ws, { ttlMs: 1000, schema: 's1' }, 0);
    expect(first.ok).toBe(true);
    const second = store.put(envelope({ ref: 'dup', bytes: 40 }), ws, { ttlMs: 1000, schema: 's1' }, 0);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.errors[0]?.reason).toBe('duplicate-registration');
    expect(store.totalBytes()).toBe(30); // no ghost bytes from the rejected put
    if (first.ok) first.value.lease.release();
    expect(store.totalBytes()).toBe(0);
  });

  it('allows re-putting a ref after it has been evicted', () => {
    const store = new ContextStore(1000);
    const first = store.put(envelope({ ref: 'reuse', bytes: 20 }), ws, { ttlMs: 1000, schema: 's1' }, 0);
    if (!first.ok) throw new Error('put failed');
    first.value.lease.release(); // evicted
    expect(store.activeEntryCount()).toBe(0);
    const again = store.put(envelope({ ref: 'reuse', bytes: 20 }), ws, { ttlMs: 1000, schema: 's1' }, 0);
    expect(again.ok).toBe(true); // ref is free after eviction
    expect(store.totalBytes()).toBe(20);
  });

  it('release is idempotent', () => {
    const store = new ContextStore(1000);
    const put = store.put(envelope(), ws, { ttlMs: 1000, schema: 's1' }, 0);
    if (!put.ok) throw new Error('put failed');
    put.value.lease.release();
    put.value.lease.release(); // no-op
    expect(store.activeEntryCount()).toBe(0);
  });
});
