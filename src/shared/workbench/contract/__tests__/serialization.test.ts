import { describe, it, expect } from 'vitest';
import { assertJsonSafe, manifestJsonSchema } from '../schemas';
import { parseFeatureManifest } from '../featureManifest';

describe('assertJsonSafe', () => {
  it('accepts JSON-safe values and round-trips them', () => {
    const value = { a: 1, b: 'x', c: [true, null, { d: 2 }] };
    const r = assertJsonSafe(value);
    expect(r.ok).toBe(true);
    if (r.ok) expect(JSON.parse(JSON.stringify(r.value))).toEqual(value);
  });

  it('rejects a function value', () => {
    const r = assertJsonSafe({ fn: () => 1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]?.reason).toBe('non-json-value');
  });

  it('rejects undefined and symbols', () => {
    expect(assertJsonSafe(undefined).ok).toBe(false);
    expect(assertJsonSafe({ s: Symbol('x') }).ok).toBe(false);
  });

  it('rejects a React-element-shaped value with a function type', () => {
    const reactish = { $$typeof: Symbol.for('react.element'), type: () => null, props: {} };
    expect(assertJsonSafe(reactish).ok).toBe(false);
  });
});

describe('manifest JSON round-trip', () => {
  it('parsed manifest survives JSON round-trip unchanged', () => {
    const input = {
      id: 'acme.feature',
      schemaVersion: 1,
      ownerVersion: '1.0.0',
      engine: { min: '1.0.0' },
      trust: 'trusted',
      contributions: { groups: [{ id: 'acme.g', title: 'G' }] },
    };
    const r = parseFeatureManifest(input);
    expect(r.ok).toBe(true);
    if (r.ok) {
      const round: unknown = JSON.parse(JSON.stringify(r.value));
      expect(round).toEqual(r.value);
    }
  });
});

describe('manifestJsonSchema', () => {
  it('exports a JSON Schema object derived from the same schema', () => {
    const schema = manifestJsonSchema() as Record<string, unknown>;
    expect(typeof schema).toBe('object');
    expect(schema).toHaveProperty('properties');
  });
});
