import { describe, it, expect } from 'vitest';
import { LayoutStore, type LayoutV3, type PersistencePort, type LayoutOp } from '../LayoutStore';

const safe: LayoutV3 = { version: 3, slots: { main: [] } };

function port(initial: unknown): { port: PersistencePort; saved: LayoutV3[]; quarantined: { raw: unknown; reason: string }[] } {
  const saved: LayoutV3[] = [];
  const quarantined: { raw: unknown; reason: string }[] = [];
  return {
    saved,
    quarantined,
    port: {
      load: () => initial,
      save: (layout) => saved.push(layout),
      quarantine: (raw, reason) => quarantined.push({ raw, reason }),
    },
  };
}

describe('LayoutStore transactions', () => {
  it('applies an operation batch atomically and round-trips deterministically', () => {
    const p = port({ version: 3, slots: { main: [] } });
    const store = new LayoutStore(p.port, safe);
    const ops: LayoutOp[] = [
      { op: 'add', slot: 'main', surfaceId: 'a' },
      { op: 'add', slot: 'side', surfaceId: 'b' },
      { op: 'move', from: 'main', to: 'side', surfaceId: 'a' },
    ];
    const r = store.apply(ops);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.slots).toEqual({ main: [], side: ['b', 'a'] });
  });

  it('does not persist an empty operation batch', () => {
    const p = port({ version: 3, slots: { main: [] } });
    const store = new LayoutStore(p.port, safe);
    const r = store.apply([]);
    expect(r.ok).toBe(true);
    expect(p.saved).toHaveLength(0); // no unnecessary write
  });

  it('does not partially commit an invalid batch', () => {
    const store = new LayoutStore(port({ version: 3, slots: { main: ['a'] } }).port, safe);
    store.apply([{ op: 'add', slot: 'main', surfaceId: 'x' }]); // main: [x]
    const before = store.snapshot();
    const r = store.apply([
      { op: 'add', slot: 'main', surfaceId: 'y' },
      { op: 'remove', slot: 'main', surfaceId: 'ghost' }, // invalid -> whole batch rejected
    ]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]?.reason).toBe('invalid-operation');
    expect(store.snapshot()).toEqual(before); // unchanged
  });
});

describe('LayoutStore load / migration', () => {
  it('quarantines a corrupt blob and falls back to the safe layout without rewriting it', () => {
    const p = port({ version: 3, slots: { main: 'not-an-array' } }); // corrupt
    const store = new LayoutStore(p.port, safe);
    const loaded = store.load();
    expect(loaded).toEqual(safe);
    expect(p.quarantined).toHaveLength(1);
    expect(p.saved).toHaveLength(0); // safe layout was NOT saved over the bad blob
  });

  it('migrates v2 -> v3 and is idempotent for a v3 blob', () => {
    const store = new LayoutStore(port(null).port, safe);
    const v2 = store.migrateFrom({ version: 2, panels: { left: ['a'], right: ['b'] } });
    expect(v2.ok).toBe(true);
    if (v2.ok) {
      expect(v2.value.layout).toEqual({ version: 3, slots: { left: ['a'], right: ['b'] } });
      expect(v2.value.receipt).toMatchObject({ sourceVersion: 2, targetVersion: 3, result: 'ok' });
      const again = store.migrateFrom(v2.value.layout); // re-running on v3 is idempotent
      expect(again.ok && again.value.layout).toEqual(v2.value.layout);
    }
  });

  it('fails (no best-effort) on an unknown version and preserves the legacy blob', () => {
    const p = port(null);
    const store = new LayoutStore(p.port, safe);
    const r = store.migrateFrom({ version: 99, whatever: true });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]?.reason).toBe('migration-failed');
    expect(p.saved).toHaveLength(0); // legacy preserved, nothing written
  });
});
