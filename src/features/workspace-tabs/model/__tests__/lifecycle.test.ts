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
});
