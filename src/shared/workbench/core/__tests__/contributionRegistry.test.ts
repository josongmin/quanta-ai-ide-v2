import { describe, it, expect } from 'vitest';
import { ContributionRegistry, type RegistryEntry } from '../ContributionRegistry';

const entry = (id: string, owner = 'acme'): RegistryEntry => ({ id, kind: 'command', owner });

describe('ContributionRegistry atomicity', () => {
  it('commits nothing when any entry in the batch is invalid (no partial commit)', () => {
    const reg = new ContributionRegistry();
    const r = reg.register('acme', [entry('acme.a'), entry('acme.a')]); // duplicate in batch
    expect(r.ok).toBe(false);
    expect(reg.snapshot().entries).toHaveLength(0);
    expect(reg.ownerContributionCount('acme')).toBe(0);
  });

  it('reason-codes duplicate and foreign namespace', () => {
    const reg = new ContributionRegistry();
    reg.register('acme', [entry('acme.a')]);
    const dup = reg.register('acme', [entry('acme.a')]);
    expect(dup.ok).toBe(false);
    if (!dup.ok) expect(dup.errors.some((e) => e.reason === 'duplicate-registration')).toBe(true);
    const foreign = reg.register('acme', [entry('other.x', 'acme')]);
    expect(foreign.ok).toBe(false);
    if (!foreign.ok) expect(foreign.errors.some((e) => e.reason === 'reserved-namespace')).toBe(true);
  });

  it('produces the same snapshot hash regardless of input permutation', () => {
    const a = new ContributionRegistry();
    const b = new ContributionRegistry();
    const r1 = a.register('acme', [entry('acme.a'), entry('acme.b'), entry('acme.c')]);
    const r2 = b.register('acme', [entry('acme.c'), entry('acme.a'), entry('acme.b')]);
    expect(r1.ok && r2.ok).toBe(true);
    if (r1.ok && r2.ok) expect(r1.value.hash).toBe(r2.value.hash);
  });

  it('reclaims all owner contributions on unregister', () => {
    const reg = new ContributionRegistry();
    reg.register('acme', [entry('acme.a'), entry('acme.b')]);
    expect(reg.ownerContributionCount('acme')).toBe(2);
    reg.unregister('acme');
    expect(reg.ownerContributionCount('acme')).toBe(0);
    expect(reg.snapshot().entries).toHaveLength(0);
  });

  it('only notifies observers with committed snapshots', () => {
    const reg = new ContributionRegistry();
    const seen: number[] = [];
    reg.observe((snap) => seen.push(snap.entries.length));
    reg.register('acme', [entry('acme.a')]);
    reg.register('acme', [entry('acme.a')]); // rejected — no observer call
    expect(seen).toEqual([1]);
  });
});
