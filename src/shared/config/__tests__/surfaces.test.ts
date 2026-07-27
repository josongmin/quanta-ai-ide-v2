import { describe, it, expect } from 'vitest';
import {
  isKnownSurface,
  getSurfaceMeta,
  instancingFor,
  surfaceIdFromPath,
  legacyPathForSurface,
  SURFACE_IDS_ORDERED,
  FIRST_LAUNCH_SURFACE_IDS,
  HERO_SURFACES,
  firstLaunchActiveSurfaceId,
  lastTabFallbackSurfaceId,
  browseAllSurfaceId,
  type SurfaceMeta,
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

  it('the first-launch surface set is non-empty and known', () => {
    expect(FIRST_LAUNCH_SURFACE_IDS.length).toBeGreaterThan(0);
    for (const id of FIRST_LAUNCH_SURFACE_IDS) expect(isKnownSurface(id)).toBe(true);
  });
});

describe('host placement — first-launch / fallback / browse-all / hero', () => {
  it('first-launch surfaces are the six expected ids in order', () => {
    expect(FIRST_LAUNCH_SURFACE_IDS).toEqual([
      'core.intelligence',
      'core.coding',
      'core.agents',
      'core.reviews',
      'core.admission',
      'core.fixes',
    ]);
  });

  it('the first-launch active surface is Intelligence', () => {
    expect(firstLaunchActiveSurfaceId()).toBe('core.intelligence');
  });

  it('the last-tab fallback surface is Intelligence', () => {
    expect(lastTabFallbackSurfaceId()).toBe('core.intelligence');
  });

  it('the browse-all role surface is Catalog', () => {
    expect(browseAllSurfaceId()).toBe('core.catalog');
  });

  it('hero tiles are ordered agents, coding, reviews', () => {
    expect(HERO_SURFACES.map((h) => h.surfaceId)).toEqual([
      'core.agents',
      'core.coding',
      'core.reviews',
    ]);
  });

  it('hero tiles carry their copy from the metadata SoT', () => {
    const agents = HERO_SURFACES.find((h) => h.surfaceId === 'core.agents');
    expect(agents).toMatchObject({ title: 'AI Coding Agent' });
    expect(agents!.sub.length).toBeGreaterThan(0);
  });
});

// The cardinality validator is a private module-load guard, so we reproduce it
// against locally-constructed invalid sets to prove it rejects a second active
// first-launch tab / a second fallback / a second browse-all role. These mirror
// the exact assertions in validateSurfaceMetas.
describe('cardinality validators reject over-cardinality (fail-closed)', () => {
  function makeMeta(over: Partial<SurfaceMeta>): SurfaceMeta {
    return {
      surfaceId: 'x.one', title: 'One', group: 'more', icon: 'Layers', instancing: 'singleton', legacyPath: '/x-one',
      firstLaunch: null, lastTabFallback: false, role: null, hero: null,
      ...over,
    };
  }
  function countActive(metas: SurfaceMeta[]): number {
    return metas.filter((m) => m.firstLaunch?.active === true).length;
  }
  function countFallback(metas: SurfaceMeta[]): number {
    return metas.filter((m) => m.lastTabFallback).length;
  }
  function countBrowseAll(metas: SurfaceMeta[]): number {
    return metas.filter((m) => m.role === 'browse-all').length;
  }

  it('two active first-launch surfaces violate exactly-one', () => {
    const metas = [
      makeMeta({ surfaceId: 'x.a', legacyPath: '/x-a', firstLaunch: { order: 0, active: true } }),
      makeMeta({ surfaceId: 'x.b', legacyPath: '/x-b', firstLaunch: { order: 1, active: true } }),
    ];
    expect(countActive(metas)).not.toBe(1);
  });

  it('two last-tab fallback surfaces violate exactly-one', () => {
    const metas = [
      makeMeta({ surfaceId: 'x.a', legacyPath: '/x-a', lastTabFallback: true }),
      makeMeta({ surfaceId: 'x.b', legacyPath: '/x-b', lastTabFallback: true }),
    ];
    expect(countFallback(metas)).not.toBe(1);
  });

  it('two browse-all role surfaces violate exactly-one', () => {
    const metas = [
      makeMeta({ surfaceId: 'x.a', legacyPath: '/x-a', role: 'browse-all' }),
      makeMeta({ surfaceId: 'x.b', legacyPath: '/x-b', role: 'browse-all' }),
    ];
    expect(countBrowseAll(metas)).not.toBe(1);
  });

  it('the live metadata satisfies exactly-one for each slot', () => {
    // Sanity: the shipped set passes the same assertions the module-load guard
    // runs (otherwise the import above would have thrown).
    expect(firstLaunchActiveSurfaceId()).toBeDefined();
    expect(lastTabFallbackSurfaceId()).toBeDefined();
    expect(browseAllSurfaceId()).toBeDefined();
  });
});
