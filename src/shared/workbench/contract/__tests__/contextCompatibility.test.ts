import { describe, it, expect } from 'vitest';
import { checkContextCompatibility, type ContextEnvelope, type ContextReceiver } from '../context';
import { checkHostCompatibility, parseFeatureManifest, type FeatureManifest } from '../featureManifest';

function envelope(overrides: Partial<ContextEnvelope> = {}): ContextEnvelope {
  return { kind: 'selection', sensitivity: 'internal', durability: 'session', ref: 'ref:1', bytes: 10, metadata: {}, ...overrides };
}
function receiver(overrides: Partial<ContextReceiver> = {}): ContextReceiver {
  return { kind: 'selection', sensitivity: 'internal', durability: 'session', trust: 'trusted', ...overrides };
}

describe('checkContextCompatibility', () => {
  it('accepts a matching handoff', () => {
    expect(checkContextCompatibility(envelope(), receiver()).ok).toBe(true);
  });

  it('rejects a context kind mismatch', () => {
    const r = checkContextCompatibility(envelope({ kind: 'a' }), receiver({ kind: 'b' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.reason === 'context-kind-mismatch')).toBe(true);
  });

  it('rejects a sensitivity downgrade (receiver below producer)', () => {
    const r = checkContextCompatibility(envelope({ sensitivity: 'secret' }), receiver({ sensitivity: 'public', durability: 'ephemeral' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.reason === 'sensitivity-downgrade')).toBe(true);
  });

  it('rejects durable retention of a secret', () => {
    const r = checkContextCompatibility(envelope({ sensitivity: 'secret' }), receiver({ sensitivity: 'secret', durability: 'durable' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.reason === 'durable-secret')).toBe(true);
  });

  it('rejects internal/secret context to an untrusted receiver', () => {
    const r = checkContextCompatibility(envelope({ sensitivity: 'internal' }), receiver({ trust: 'untrusted' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.reason === 'capability-escalation')).toBe(true);
  });

  it('is deterministic for the same input', () => {
    const a = checkContextCompatibility(envelope({ sensitivity: 'secret' }), receiver({ sensitivity: 'public', durability: 'durable', trust: 'untrusted' }));
    const b = checkContextCompatibility(envelope({ sensitivity: 'secret' }), receiver({ sensitivity: 'public', durability: 'durable', trust: 'untrusted' }));
    expect(a).toEqual(b);
  });
});

describe('checkHostCompatibility', () => {
  const manifest = (o: Record<string, unknown> = {}): FeatureManifest => {
    const r = parseFeatureManifest({ id: 'acme.f', schemaVersion: 1, ownerVersion: '2.0.0', engine: { min: '1.0.0', max: '2.0.0' }, trust: 'trusted', contributions: {}, ...o });
    if (!r.ok) throw new Error('fixture invalid');
    return r.value;
  };

  it('accepts a compatible host', () => {
    expect(checkHostCompatibility({ engine: '1.5.0', supportedSchemaVersion: 1 }, manifest()).ok).toBe(true);
  });

  it('rejects an engine outside the manifest range', () => {
    const r = checkHostCompatibility({ engine: '3.0.0', supportedSchemaVersion: 1 }, manifest());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]?.reason).toBe('engine-range-mismatch');
  });

  it('rejects a schema version skew', () => {
    const r = checkHostCompatibility({ engine: '1.5.0', supportedSchemaVersion: 2 }, manifest());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.reason === 'schema-version-skew')).toBe(true);
  });

  it('rejects an owner downgrade against an installed version', () => {
    const r = checkHostCompatibility({ engine: '1.5.0', supportedSchemaVersion: 1 }, manifest({ ownerVersion: '1.0.0' }), { ownerVersion: '2.0.0' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.reason === 'owner-downgrade')).toBe(true);
  });
});
