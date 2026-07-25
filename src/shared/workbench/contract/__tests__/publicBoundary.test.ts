// WB-104: a public consumer reaches the contract only through the package barrel
// (`@shared/workbench`), never an internal module. The fail-new `deepImport`
// audit rule (WBT-00) red-flags deep imports; this proves the public path works
// and is type-safe.
import { describe, it, expect } from 'vitest';
import {
  parseFeatureManifest,
  checkContextCompatibility,
  resolveConfiguration,
  ok,
  err,
  type FeatureManifest,
  type WorkbenchError,
} from '@shared/workbench';

describe('public boundary', () => {
  it('re-exports the contract API through the package barrel', () => {
    expect(typeof parseFeatureManifest).toBe('function');
    expect(typeof checkContextCompatibility).toBe('function');
    expect(typeof resolveConfiguration).toBe('function');
  });

  it('exposes typed result helpers', () => {
    const good = ok<number>(1);
    expect(good.ok).toBe(true);
    const bad = err({ reason: 'schema-invalid', message: 'x' } satisfies WorkbenchError);
    expect(bad.ok).toBe(false);
  });

  it('type-only consumers can annotate with the public DTO type', () => {
    const parsed = parseFeatureManifest({
      id: 'acme.f',
      schemaVersion: 1,
      ownerVersion: '1.0.0',
      engine: { min: '1.0.0' },
      trust: 'trusted',
      contributions: {},
    });
    if (parsed.ok) {
      const manifest: FeatureManifest = parsed.value;
      expect(manifest.id).toBe('acme.f');
    }
  });
});
