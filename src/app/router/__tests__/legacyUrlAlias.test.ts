import { describe, it, expect } from 'vitest';
import { aliasLegacyUrl, canonicalSurfacePath, legacyPathForSurface } from '../legacyUrlAlias';

describe('legacyUrlAlias', () => {
  it('aliases a legacy tab URL to its canonical surface id', () => {
    expect(aliasLegacyUrl('/intelligence')).toEqual({ surfaceId: 'core.intelligence' });
    expect(aliasLegacyUrl('/coding')).toEqual({ surfaceId: 'core.coding' });
  });

  it('never re-aliases a canonical /w/ path (loop-free, one-way)', () => {
    expect(aliasLegacyUrl('/w/ws-1/core.coding')).toBeNull();
  });

  it('returns null for a non-tab path', () => {
    expect(aliasLegacyUrl('/me/profile')).toBeNull();
  });

  it('legacy and canonical converge on the same surface identity', () => {
    const alias = aliasLegacyUrl('/reviews');
    expect(alias).not.toBeNull();
    if (alias) {
      const canonical = canonicalSurfacePath('ws-1', alias.surfaceId);
      expect(canonical).toBe('/w/ws-1/core.reviews');
      // and the canonical path does not alias back to a different identity
      expect(aliasLegacyUrl(canonical)).toBeNull();
    }
  });

  it('round-trips a surface id to its legacy path', () => {
    expect(legacyPathForSurface('core.intelligence')).toBe('/intelligence');
    expect(legacyPathForSurface('core.fix-pipeline')).toBe('/fix-pipeline');
  });
});
