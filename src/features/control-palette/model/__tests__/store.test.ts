import { beforeEach, describe, it, expect } from 'vitest';
import { useControlPaletteStore } from '../store';

// The palette store's real logic is the recents MRU: dedup-to-head + cap, with
// an identity short-circuit to avoid pointless re-renders.

const s = () => useControlPaletteStore.getState();

beforeEach(() => {
  useControlPaletteStore.setState({ open: false, openedAt: 0, recents: [] });
});

describe('control-palette store — recents MRU', () => {
  it('moves a re-visited path to the head (dedup), newest first', () => {
    s().pushRecent('/a');
    s().pushRecent('/b');
    s().pushRecent('/a');
    expect(s().recents).toEqual(['/a', '/b']);
  });

  it('caps at 5, dropping the oldest', () => {
    for (const p of ['/1', '/2', '/3', '/4', '/5', '/6']) s().pushRecent(p);
    expect(s().recents).toEqual(['/6', '/5', '/4', '/3', '/2']);
  });

  it('short-circuits (same reference) when the head is unchanged', () => {
    s().pushRecent('/a');
    const before = s().recents;
    s().pushRecent('/a'); // already head → no-op
    expect(s().recents).toBe(before);
  });

  it('clearRecents empties the list', () => {
    s().pushRecent('/a');
    s().clearRecents();
    expect(s().recents).toEqual([]);
  });
});

describe('control-palette store — open state', () => {
  it('toggle flips open and bumps openedAt only when opening', () => {
    expect(s().open).toBe(false);
    s().toggle();
    expect(s().open).toBe(true);
    const openedAt = s().openedAt;
    expect(openedAt).toBeGreaterThan(0);
    s().toggle(); // close — openedAt frozen
    expect(s().open).toBe(false);
    expect(s().openedAt).toBe(openedAt);
  });

  it('setOpen is a no-op (same reference) when the value is unchanged', () => {
    const before = s();
    s().setOpen(false);
    expect(useControlPaletteStore.getState()).toBe(before);
  });
});
