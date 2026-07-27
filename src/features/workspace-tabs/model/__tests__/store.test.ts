import { beforeEach, describe, it, expect } from 'vitest';
import { useWorkspaceTabsStore, type WorkspaceTab } from '../store';
import { FIRST_LAUNCH_SURFACE_IDS } from '@shared/config/surfaces';

// The workspace-tabs store is the browser-style tab strip: open/close/focus/
// pin/reorder with a last-tab guard and a persist layer whose `merge` fn
// sanitises out-of-date persisted shapes. Runtime-generated ids/timestamps are
// intentionally opaque, so we assert on structure/relationships and tab.kind,
// never on exact id or lastFocusedAt values.

const s = () => useWorkspaceTabsStore.getState();

// Build a deterministic, known-good tab list to seed state for the
// close/focus/pin cases (avoids depending on Date.now() collisions between
// two defaultTab() calls in the same tick).
// Accepts legacy kind shorthands and seeds canonical surfaceIds (`core.<kind>`).
function seedTabs(kinds: string[]): void {
  const tabs: WorkspaceTab[] = kinds.map((kind, i) => ({
    id: `seed-${i}`,
    surfaceId: `core.${kind}`,
    dirty: false,
    pinned: false,
    lastFocusedAt: undefined,
  }));
  useWorkspaceTabsStore.setState({ tabs, activeId: tabs[0].id });
}

beforeEach(() => {
  // Restore a clean default-tab slice. setAll enforces the same invariants
  // the store guarantees at runtime (non-empty, valid surface ids).
  seedTabs(FIRST_LAUNCH_SURFACE_IDS.map((id) => id.replace('core.', '')));
});

describe('workspace-tabs store — close', () => {
  it('closing the last remaining tab spawns a fresh default (never zero tabs)', () => {
    seedTabs(['coding']);
    const onlyId = s().tabs[0].id;

    s().close(onlyId);

    expect(s().tabs).toHaveLength(1);
    // A brand-new tab, not the one we closed.
    expect(s().tabs[0].id).not.toBe(onlyId);
    expect(s().tabs[0].surfaceId).toBe('core.intelligence');
    expect(s().activeId).toBe(s().tabs[0].id);
  });

  it('closing the active tab focuses its right neighbour', () => {
    seedTabs(['intelligence', 'coding', 'agents']);
    // Activate the middle tab.
    s().setActive('seed-1');
    expect(s().activeId).toBe('seed-1');

    s().close('seed-1');

    // Right neighbour ('agents' / seed-2) inherits focus.
    expect(s().tabs.map((t) => t.id)).toEqual(['seed-0', 'seed-2']);
    expect(s().activeId).toBe('seed-2');
  });

  it('closing the rightmost active tab focuses the new last tab', () => {
    seedTabs(['intelligence', 'coding', 'agents']);
    s().setActive('seed-2'); // rightmost
    expect(s().activeId).toBe('seed-2');

    s().close('seed-2');

    expect(s().tabs.map((t) => t.id)).toEqual(['seed-0', 'seed-1']);
    // No right neighbour → falls back to the new last tab.
    expect(s().activeId).toBe('seed-1');
  });

  it('closing a non-active tab leaves the active tab focused', () => {
    seedTabs(['intelligence', 'coding', 'agents']);
    s().setActive('seed-0');

    s().close('seed-2');

    expect(s().activeId).toBe('seed-0');
    expect(s().tabs.map((t) => t.id)).toEqual(['seed-0', 'seed-1']);
  });

  it('closing an unknown id is a no-op', () => {
    seedTabs(['intelligence', 'coding']);
    const before = s().tabs.map((t) => t.id);
    s().close('does-not-exist');
    expect(s().tabs.map((t) => t.id)).toEqual(before);
  });
});

describe('workspace-tabs store — focusRelative', () => {
  it('advances one tab to the right', () => {
    seedTabs(['intelligence', 'coding', 'agents']);
    s().setActive('seed-0');
    s().focusRelative(1);
    expect(s().activeId).toBe('seed-1');
  });

  it('wraps modulo length going right past the end', () => {
    seedTabs(['intelligence', 'coding', 'agents']);
    s().setActive('seed-2'); // last
    s().focusRelative(1);
    expect(s().activeId).toBe('seed-0'); // wrapped to first
  });

  it('wraps modulo length going left past the start', () => {
    seedTabs(['intelligence', 'coding', 'agents']);
    s().setActive('seed-0'); // first
    s().focusRelative(-1);
    expect(s().activeId).toBe('seed-2'); // wrapped to last
  });

  it('is a no-op at a single tab', () => {
    seedTabs(['coding']);
    const before = s().activeId;
    s().focusRelative(1);
    expect(s().activeId).toBe(before);
  });

  it('is a no-op for delta 0', () => {
    seedTabs(['intelligence', 'coding', 'agents']);
    s().setActive('seed-1');
    s().focusRelative(0);
    expect(s().activeId).toBe('seed-1');
  });
});

describe('workspace-tabs store — setPinned / moveIntoSection', () => {
  it('pinning lands the tab at the tail of the pinned run', () => {
    seedTabs(['intelligence', 'coding', 'agents', 'reviews']);
    // Pin the first two so a pinned run exists at the head.
    s().setPinned('seed-0', true);
    s().setPinned('seed-1', true);
    // Pinning a later tab should slot it right after the existing pinned run.
    s().setPinned('seed-3', true);

    const ids = s().tabs.map((t) => t.id);
    // seed-0, seed-1 already pinned; seed-3 lands at tail of the pinned run
    // (before the first unpinned tab, seed-2).
    expect(ids).toEqual(['seed-0', 'seed-1', 'seed-3', 'seed-2']);
    expect(s().tabs.find((t) => t.id === 'seed-3')!.pinned).toBe(true);
  });

  it('unpinning lands the tab at the head of the unpinned run', () => {
    seedTabs(['intelligence', 'coding', 'agents']);
    s().setPinned('seed-0', true);
    s().setPinned('seed-1', true);
    // tabs: [seed-0(p), seed-1(p), seed-2]
    s().setPinned('seed-0', false);

    const ids = s().tabs.map((t) => t.id);
    // seed-0 unpinned → head of the unpinned run = right after the remaining
    // pinned tab seed-1.
    expect(ids).toEqual(['seed-1', 'seed-0', 'seed-2']);
    expect(s().tabs.find((t) => t.id === 'seed-0')!.pinned).toBe(false);
  });

  it('setPinned to the same value is a no-op', () => {
    seedTabs(['intelligence', 'coding']);
    const before = s().tabs.map((t) => t.id);
    s().setPinned('seed-0', false); // already unpinned
    expect(s().tabs.map((t) => t.id)).toEqual(before);
  });
});

describe('workspace-tabs store — openSurface honours descriptor instancing', () => {
  it('a singleton surface focuses its existing tab instead of duplicating', () => {
    // All built-ins are singleton. Seed a single coding tab, then open it again.
    seedTabs(['intelligence', 'coding']);
    const codingId = s().tabs.find((t) => t.surfaceId === 'core.coding')!.id;
    const countBefore = s().tabs.length;

    const returned = s().openSurface('core.coding');

    // No duplicate instance was created and the returned id is the existing one.
    expect(s().tabs.length).toBe(countBefore);
    expect(returned).toBe(codingId);
    expect(s().tabs.filter((t) => t.surfaceId === 'core.coding')).toHaveLength(1);
    // It was focused.
    expect(s().activeId).toBe(codingId);
  });

  it('opening a singleton surface that is not open yet creates exactly one tab', () => {
    seedTabs(['intelligence']);
    const returned = s().openSurface('core.reviews');
    const reviews = s().tabs.filter((t) => t.surfaceId === 'core.reviews');
    expect(reviews).toHaveLength(1);
    expect(returned).toBe(reviews[0].id);
    expect(s().activeId).toBe(returned);
  });

  it('activate:false focuses an existing singleton without stealing focus', () => {
    seedTabs(['intelligence', 'coding']);
    const intelligenceId = s().activeId;
    const returned = s().openSurface('core.coding', { activate: false });
    // Returns the existing coding tab id, but focus stays on intelligence.
    expect(s().tabs.filter((t) => t.surfaceId === 'core.coding')).toHaveLength(1);
    expect(returned).toBe(s().tabs.find((t) => t.surfaceId === 'core.coding')!.id);
    expect(s().activeId).toBe(intelligenceId);
  });
});
