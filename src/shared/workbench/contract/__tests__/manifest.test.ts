import { describe, it, expect } from 'vitest';
import { parseFeatureManifest, validateManifestSet, type FeatureManifest } from '../featureManifest';

function baseManifest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'acme.feature',
    schemaVersion: 1,
    ownerVersion: '1.0.0',
    engine: { min: '1.0.0' },
    trust: 'trusted',
    contributions: {
      groups: [{ id: 'acme.group', title: 'Group' }],
      surfaces: [{ id: 'acme.surface', title: 'Surface', group: 'acme.group', owner: 'acme', trust: 'trusted', icon: 'Box', contextKinds: [] }],
    },
    ...overrides,
  };
}

describe('parseFeatureManifest', () => {
  it('accepts a valid manifest and fills defaults', () => {
    const r = parseFeatureManifest(baseManifest());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.contributions.commands).toEqual([]);
      expect(r.value.contributions.settings).toEqual([]);
    }
  });

  it('rejects excess keys with a distinct excess-payload reason', () => {
    const r = parseFeatureManifest(baseManifest({ rogue: true }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.map((e) => e.reason)).toContain('excess-payload');
  });

  it('rejects a malformed manifest with schema-invalid', () => {
    const r = parseFeatureManifest({ id: 'no-namespace', schemaVersion: 1, ownerVersion: 'x', engine: {}, trust: 'trusted' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.reason === 'schema-invalid')).toBe(true);
  });

  it('rejects a surface whose owner does not match its id namespace (privilege escalation)', () => {
    const r = parseFeatureManifest(baseManifest({
      contributions: { surfaces: [{ id: 'acme.evil', owner: 'core', trust: 'trusted', title: 'X', group: 'acme.g', icon: 'Box', contextKinds: [] }] },
    }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.reason === 'schema-invalid')).toBe(true);
  });

  it('rejects a future schemaVersion instead of permissive-parsing it', () => {
    const r = parseFeatureManifest(baseManifest({ schemaVersion: 99 }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]?.reason).toBe('unknown-schema-version');
  });

  it('does not mutate the input object', () => {
    const input = baseManifest();
    const snapshot = JSON.stringify(input);
    parseFeatureManifest(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });
});

describe('validateManifestSet', () => {
  const parse = (o: Record<string, unknown>): FeatureManifest => {
    const r = parseFeatureManifest(o);
    if (!r.ok) throw new Error(`fixture invalid: ${JSON.stringify(r.errors)}`);
    return r.value;
  };

  it('accepts a coherent set', () => {
    const r = validateManifestSet([parse(baseManifest())]);
    expect(r.ok).toBe(true);
  });

  it('rejects a dangling group reference (missing-reference)', () => {
    const m = parse(baseManifest({ contributions: { surfaces: [{ id: 'acme.s', title: 'S', group: 'acme.ghost', owner: 'acme', trust: 'trusted', icon: 'Box', contextKinds: [] }] } }));
    const r = validateManifestSet([m]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.reason === 'missing-reference')).toBe(true);
  });

  it('rejects duplicate ids across manifests', () => {
    const a = parse(baseManifest({ id: 'acme.dup', contributions: {} }));
    const b = parse(baseManifest({ id: 'acme.dup', contributions: {} }));
    const r = validateManifestSet([a, b]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.reason === 'duplicate-id')).toBe(true);
  });

  it('rejects the reserved core namespace from a non-core owner', () => {
    const m = parse(baseManifest({ id: 'core.stealer', trust: 'trusted', contributions: {} }));
    const r = validateManifestSet([m]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.reason === 'reserved-namespace')).toBe(true);
  });

  it('allows the core namespace for a core owner', () => {
    const m = parse(baseManifest({ id: 'core.explorer', trust: 'core', contributions: {} }));
    expect(validateManifestSet([m]).ok).toBe(true);
  });

  it('rejects a contributed surface claiming more trust than its manifest', () => {
    const m = parse(baseManifest({
      trust: 'untrusted',
      contributions: {
        groups: [{ id: 'acme.g', title: 'G' }],
        surfaces: [{ id: 'acme.priv', owner: 'acme', trust: 'core', title: 'P', group: 'acme.g', icon: 'Box', contextKinds: [] }],
      },
    }));
    const r = validateManifestSet([m]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.reason === 'capability-escalation')).toBe(true);
  });

  it('is order-independent (same verdict regardless of manifest order)', () => {
    const a = parse(baseManifest({ id: 'acme.a', contributions: { surfaces: [{ id: 'acme.sa', title: 'A', group: 'zzz.g', owner: 'acme', trust: 'trusted', icon: 'Box', contextKinds: [] }] } }));
    const b = parse(baseManifest({ id: 'zzz.b', contributions: { groups: [{ id: 'zzz.g', title: 'G' }] } }));
    const forward = validateManifestSet([a, b]);
    const backward = validateManifestSet([b, a]);
    expect(forward.ok).toBe(backward.ok);
  });
});
