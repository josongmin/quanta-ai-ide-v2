import { describe, it, expect } from 'vitest';
import {
  isKnownSurface,
  getSurfaceMeta,
  instancingFor,
  surfaceIdFromPath,
  legacyPathForSurface,
  SURFACE_IDS_ORDERED,
  DEFAULT_SURFACE_IDS,
} from '../surfaces';

describe('surface identity is fail-closed (prototype pollution)', () => {
  // SURFACE_METAS is a null-prototype record, so inherited Object.prototype
  // members must never be mistaken for a known surface. Surface ids flow from
  // persisted tabs and deep links, so a false positive here is a real crash
  // vector (getSurfaceMeta would otherwise return a function for `toString`).
  const poison = ['toString', 'constructor', 'hasOwnProperty', '__proto__', 'valueOf'];

  it.each(poison)('isKnownSurface(%s) is false', (key) => {
    expect(isKnownSurface(key)).toBe(false);
  });

  it.each(poison)('getSurfaceMeta(%s) is undefined', (key) => {
    expect(getSurfaceMeta(key)).toBeUndefined();
  });

  it('instancingFor falls closed to singleton for unknown/poison ids', () => {
    expect(instancingFor('toString')).toBe('singleton');
    expect(instancingFor('core.does-not-exist')).toBe('singleton');
  });

  it('a poison id never resolves to a surface path', () => {
    expect(surfaceIdFromPath('/w/default/toString')).toBeNull();
    expect(surfaceIdFromPath('/w/default/constructor')).toBeNull();
  });
});

describe('instancing is sourced from the metadata SoT', () => {
  it('every built-in surface has an explicit instancing policy', () => {
    for (const id of SURFACE_IDS_ORDERED) {
      const meta = getSurfaceMeta(id);
      expect(meta).toBeDefined();
      expect(['singleton', 'multi']).toContain(meta!.instancing);
    }
  });

  it('all current built-ins are singleton (descriptor authority)', () => {
    for (const id of SURFACE_IDS_ORDERED) {
      expect(instancingFor(id)).toBe('singleton');
    }
  });
});

describe('path <-> surfaceId mapping', () => {
  it('resolves a canonical path to its surfaceId', () => {
    expect(surfaceIdFromPath('/w/default/core.coding')).toBe('core.coding');
  });

  it('resolves a legacy alias path to its surfaceId', () => {
    expect(surfaceIdFromPath('/coding')).toBe('core.coding');
    expect(surfaceIdFromPath('/intelligence')).toBe('core.intelligence');
  });

  it('returns null for a non-surface path', () => {
    expect(surfaceIdFromPath('/me/profile')).toBeNull();
    expect(surfaceIdFromPath('/w/default/core.ghost')).toBeNull();
  });

  it('legacyPathForSurface round-trips', () => {
    for (const id of SURFACE_IDS_ORDERED) {
      const path = legacyPathForSurface(id);
      expect(path).not.toBeNull();
      expect(surfaceIdFromPath(path!)).toBe(id);
    }
  });

  it('the default surface set is non-empty and known', () => {
    expect(DEFAULT_SURFACE_IDS.length).toBeGreaterThan(0);
    for (const id of DEFAULT_SURFACE_IDS) expect(isKnownSurface(id)).toBe(true);
  });
});
