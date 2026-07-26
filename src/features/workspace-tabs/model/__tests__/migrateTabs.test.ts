import { describe, it, expect } from 'vitest';
import { migrateTabs, TAB_STATE_VERSION, type CanonicalTab } from '../migrateTabs';

const known = new Set(['core.intelligence', 'core.coding', 'core.agents']);

describe('migrateTabs', () => {
  it('restores every legacy kind to its expected surfaceId, preserving order and pinned/label', () => {
    const legacy = {
      tabs: [
        { id: 'a', kind: 'coding', pinned: true, label: 'Work' },
        { id: 'b', kind: 'intelligence', lastFocusedAt: 5 },
      ],
      activeId: 'b',
    };
    const r = migrateTabs(legacy, known);
    expect(r.tabs.map((t) => t.surfaceId)).toEqual(['core.coding', 'core.intelligence']); // order kept
    expect(r.tabs[0]).toMatchObject({ id: 'a', surfaceId: 'core.coding', pinned: true, label: 'Work', stateVersion: TAB_STATE_VERSION });
    expect(r.tabs[1].lastFocusedAt).toBe(5);
    expect(r.activeId).toBe('b');
    expect(r.quarantined).toHaveLength(0);
  });

  it('quarantines unknown/corrupt records while keeping the valid tabs', () => {
    const raw = {
      tabs: [
        { id: 'a', kind: 'coding' },
        { id: 'b', kind: 'nonexistent-kind' }, // unknown surface
        { kind: 'agents' }, // corrupt: no id
        'garbage', // corrupt
      ],
    };
    const r = migrateTabs(raw, known);
    expect(r.tabs.map((t) => t.id)).toEqual(['a']); // only the valid one survives
    expect(r.quarantined).toHaveLength(3);
    expect(r.quarantined.some((q) => q.reason.includes('unknown surface core.nonexistent-kind'))).toBe(true);
    expect(r.quarantined.some((q) => q.reason.includes('missing id'))).toBe(true);
  });

  it('is idempotent — re-running on canonical records is a no-op', () => {
    const canonical: CanonicalTab[] = [
      { id: 'a', surfaceId: 'core.coding', stateVersion: TAB_STATE_VERSION, pinned: true },
    ];
    const first = migrateTabs({ tabs: canonical, activeId: 'a' }, known);
    const second = migrateTabs({ tabs: first.tabs, activeId: first.activeId }, known);
    expect(second.tabs).toEqual(first.tabs);
    expect(second.quarantined).toHaveLength(0);
  });

  it('falls active to the first surviving tab when the persisted active was quarantined', () => {
    const raw = { tabs: [{ id: 'a', kind: 'coding' }, { id: 'b', kind: 'ghost' }], activeId: 'b' };
    const r = migrateTabs(raw, known);
    expect(r.activeId).toBe('a'); // 'b' was quarantined
  });

  it('accepts a bare tab array as well as the persisted envelope', () => {
    const r = migrateTabs([{ id: 'a', kind: 'agents' }], known);
    expect(r.tabs[0]?.surfaceId).toBe('core.agents');
  });
});
