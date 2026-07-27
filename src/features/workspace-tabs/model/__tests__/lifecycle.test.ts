import { describe, expect, it } from 'vitest';
import { reconcileMountedTabs } from '../lifecycle';

describe('reconcileMountedTabs', () => {
  it('promotes the active tab, prunes closed tabs, and evicts the oldest inactive tab', () => {
    expect(reconcileMountedTabs(
      ['closed', 'a', 'b'],
      'c',
      new Set(['a', 'b', 'c']),
      2,
    )).toEqual(['b', 'c']);
  });

  it('always admits the active tab even from an empty snapshot', () => {
    expect(reconcileMountedTabs([], 'active', new Set(['active']), 3)).toEqual(['active']);
  });

  // LRU correctness is load-bearing: each mounted surface can hold a WebGL
  // context, so wrong eviction order churns GPU resources on the tabs a user
  // actually bounces between.
  it('keeps the active tab last (most-recent) so it is never the eviction victim', () => {
    // 'a' is oldest, active is 'a' → active moves to the tail, 'b'/'c' precede.
    expect(reconcileMountedTabs(['a', 'b', 'c'], 'a', new Set(['a', 'b', 'c']), 3))
      .toEqual(['b', 'c', 'a']);
  });

  it('evicts strictly oldest-first when over the limit', () => {
    // order preserved, active 'd' appended, oldest 'a' shifted out at limit 3.
    expect(reconcileMountedTabs(['a', 'b', 'c'], 'd', new Set(['a', 'b', 'c', 'd']), 3))
      .toEqual(['b', 'c', 'd']);
  });

  it('limit=1 mounts only the active tab', () => {
    expect(reconcileMountedTabs(['a', 'b'], 'b', new Set(['a', 'b']), 1)).toEqual(['b']);
  });

  it('de-duplicates a corrupted snapshot with repeated ids', () => {
    expect(reconcileMountedTabs(['a', 'a', 'b'], 'b', new Set(['a', 'b']), 5))
      .toEqual(['a', 'b']);
  });

  it('drops the active tab entirely if it is no longer alive', () => {
    expect(reconcileMountedTabs(['a', 'b'], 'gone', new Set(['a', 'b']), 5))
      .toEqual(['a', 'b']);
  });

  it('rejects a nonsensical limit', () => {
    expect(() => reconcileMountedTabs(['a'], 'a', new Set(['a']), 0)).toThrow(RangeError);
  });
});
