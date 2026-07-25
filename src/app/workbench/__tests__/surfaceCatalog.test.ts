import { describe, it, expect, vi } from 'vitest';
import { buildSurfaceCatalog, type SurfaceManifest, type SurfaceActivator } from '../surfaceCatalog';

const manifest = (id: string, over: Partial<SurfaceManifest> = {}): SurfaceManifest => ({
  id,
  title: id,
  group: 'core.main',
  icon: 'Box',
  instancing: 'singleton',
  contextKinds: [],
  ...over,
});
const activator = (): SurfaceActivator => () => Promise.resolve({ default: () => null });

describe('buildSurfaceCatalog', () => {
  it('materialises a valid catalog and does not call activators at discovery', () => {
    const spy = vi.fn(activator());
    const r = buildSurfaceCatalog([manifest('core.a'), manifest('core.b')], { 'core.a': spy, 'core.b': activator() });
    expect(r.ok).toBe(true);
    expect(spy).not.toHaveBeenCalled(); // lazy — no chunk import during discovery
    if (r.ok) expect(r.value.entries.map((e) => e.manifest.id)).toEqual(['core.a', 'core.b']);
  });

  it('is deterministic regardless of input order', () => {
    const a = buildSurfaceCatalog([manifest('core.a'), manifest('core.b'), manifest('core.c')], {
      'core.a': activator(), 'core.b': activator(), 'core.c': activator(),
    });
    const b = buildSurfaceCatalog([manifest('core.c'), manifest('core.a'), manifest('core.b')], {
      'core.a': activator(), 'core.b': activator(), 'core.c': activator(),
    });
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) expect(a.value.hash).toBe(b.value.hash);
  });

  it('rejects a duplicate id', () => {
    const r = buildSurfaceCatalog([manifest('core.a'), manifest('core.a')], { 'core.a': activator() });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.reason === 'duplicate-id')).toBe(true);
  });

  it('rejects a manifest with no activator and an orphan activator', () => {
    const noActivator = buildSurfaceCatalog([manifest('core.a')], {});
    expect(!noActivator.ok && noActivator.errors[0]?.reason).toBe('missing-reference');
    const orphan = buildSurfaceCatalog([manifest('core.a')], { 'core.a': activator(), 'core.ghost': activator() });
    expect(orphan.ok).toBe(false);
    if (!orphan.ok) expect(orphan.errors.some((e) => e.reason === 'missing-reference')).toBe(true);
  });

  it('does not expose a partial catalog when one owner is invalid', () => {
    const r = buildSurfaceCatalog([manifest('core.a'), manifest('core.b')], { 'core.a': activator() }); // b has no activator
    expect(r.ok).toBe(false); // whole catalog rejected, not just b
  });

  it('resolves a surface entry by id', () => {
    const r = buildSurfaceCatalog([manifest('core.a')], { 'core.a': activator() });
    if (r.ok) {
      expect(r.value.resolve('core.a')?.manifest.title).toBe('core.a');
      expect(r.value.resolve('core.missing')).toBeUndefined();
    }
  });
});
