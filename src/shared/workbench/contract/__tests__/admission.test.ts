import { describe, it, expect } from 'vitest';
import { admitExtension, admitExtensionResult, DEFAULT_BUDGETS, type AdmissionRequest, type ResourceBudget } from '../admission';
import { schemaArtifact, GOLDEN_CORPUS } from '../schemaArtifact';
import { parseFeatureManifest } from '../featureManifest';

const budget: ResourceBudget = DEFAULT_BUDGETS.trusted;
const base = (over: Partial<AdmissionRequest> = {}): AdmissionRequest => ({
  ownerId: 'acme',
  trust: 'trusted',
  requestedCapabilities: [],
  grantedCapabilities: [],
  resources: { contributions: 1, contextBytes: 1, commandRatePerSec: 1, activationMs: 1 },
  requestsPrivilegedSurface: false,
  ...over,
});

describe('admitExtension', () => {
  it('admits a within-budget trusted owner', () => {
    expect(admitExtension(base(), budget).admitted).toBe(true);
  });

  it('rejects an untrusted owner taking a privileged surface (before activation)', () => {
    const v = admitExtension(base({ trust: 'untrusted', requestsPrivilegedSurface: true }), DEFAULT_BUDGETS.untrusted);
    expect(v.admitted).toBe(false);
    if (!v.admitted) expect(v.denials.some((d) => d.reason === 'untrusted-contribution')).toBe(true);
  });

  it('rejects capability escalation (requested but not granted)', () => {
    const v = admitExtension(base({ requestedCapabilities: ['fs.write'], grantedCapabilities: [] }), budget);
    expect(v.admitted).toBe(false);
    if (!v.admitted) expect(v.denials.some((d) => d.reason === 'capability-denied')).toBe(true);
  });

  it('rejects each resource overflow dimension with a typed, auditable denial', () => {
    const v = admitExtension(
      base({ resources: { contributions: 1e6, contextBytes: 1e12, commandRatePerSec: 1e6, activationMs: 1e9 } }),
      budget,
    );
    expect(v.admitted).toBe(false);
    if (!v.admitted) {
      const reasons = new Set(v.denials.map((d) => d.reason));
      expect(reasons.has('resource-overflow')).toBe(true);
      expect(reasons.has('byte-budget')).toBe(true);
      expect(v.denials.length).toBeGreaterThanOrEqual(4); // validate-all: all dimensions reported
    }
  });

  it('exposes a Result wrapper for composition', () => {
    expect(admitExtensionResult(base(), budget).ok).toBe(true);
  });

  it('fails closed on non-finite / negative resource amounts (no NaN>max bypass)', () => {
    for (const bad of [Number.NaN, -1, Number.POSITIVE_INFINITY]) {
      const v = admitExtension(base({ resources: { contributions: bad, contextBytes: 1, commandRatePerSec: 1, activationMs: 1 } }), budget);
      expect(v.admitted, `contributions=${String(bad)}`).toBe(false);
      if (!v.admitted) expect(v.denials.some((d) => d.reason === 'resource-overflow')).toBe(true);
    }
  });

  it('treats max as an inclusive ceiling (a request equal to max is admitted)', () => {
    const atMax = base({
      resources: {
        contributions: budget.maxContributions,
        contextBytes: budget.maxContextBytes,
        commandRatePerSec: budget.maxCommandRatePerSec,
        activationMs: budget.maxActivationMs,
      },
    });
    expect(admitExtension(atMax, budget).admitted).toBe(true);
  });
});

describe('schema artifact (WB-701)', () => {
  it('exports a versioned JSON Schema with a deterministic digest', () => {
    const a = schemaArtifact();
    const b = schemaArtifact();
    expect(a.digest).toBe(b.digest); // deterministic
    expect(a.version).toMatch(/^manifest-v\d+$/);
    expect(a.jsonSchema).toHaveProperty('properties');
  });

  it('golden corpus verdicts match the runtime validator (same source schema)', () => {
    for (const gold of GOLDEN_CORPUS) {
      const result = parseFeatureManifest(gold.input);
      if (gold.expect.length === 0) {
        expect(result.ok, gold.name).toBe(true);
      } else {
        expect(result.ok, gold.name).toBe(false);
        if (!result.ok) {
          const reasons = new Set(result.errors.map((e) => e.reason));
          expect(reasons, gold.name).toEqual(new Set(gold.expect)); // exact match — catches divergence
        }
      }
    }
  });
});
