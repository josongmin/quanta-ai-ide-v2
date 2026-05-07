import { describe, it, expect } from 'vitest';
import { buildRepo } from '@entities/repo';

describe('buildRepo', () => {
  it('produces deterministic output for same seed', () => {
    const a = buildRepo(42);
    const b = buildRepo(42);

    expect(a.files.length).toBe(b.files.length);
    expect(a.folders.length).toBe(b.folders.length);

    // Spot-check first 20 files for full structural equality
    for (let i = 0; i < Math.min(20, a.files.length); i++) {
      expect(a.files[i].name).toBe(b.files[i].name);
      expect(a.files[i].folderPath).toBe(b.files[i].folderPath);
      expect(a.files[i].metrics.complexity).toBe(b.files[i].metrics.complexity);
      expect(a.files[i].metrics.loc).toBe(b.files[i].metrics.loc);
      expect(a.files[i].deps).toEqual(b.files[i].deps);
    }
  });

  it('produces different output for different seeds', () => {
    const a = buildRepo(1);
    const b = buildRepo(2);
    // Names or metrics should differ somewhere
    let differs = false;
    for (let i = 0; i < Math.min(50, a.files.length, b.files.length); i++) {
      if (
        a.files[i].metrics.complexity !== b.files[i].metrics.complexity ||
        a.files[i].metrics.loc !== b.files[i].metrics.loc
      ) {
        differs = true;
        break;
      }
    }
    expect(differs).toBe(true);
  });

  it('produces a non-trivial number of files and folders', () => {
    const repo = buildRepo();
    expect(repo.files.length).toBeGreaterThan(100);
    expect(repo.folders.length).toBeGreaterThan(3);
  });

  it('every file references an existing folder path', () => {
    const repo = buildRepo();
    for (const f of repo.files) {
      expect(repo.foldersByPath.has(f.folderPath)).toBe(true);
    }
  });

  it('all metric ranges are valid: min <= max and finite', () => {
    const repo = buildRepo();
    for (const [key, range] of Object.entries(repo.ranges)) {
      const [min, max] = range;
      expect(Number.isFinite(min), `${key} min not finite`).toBe(true);
      expect(Number.isFinite(max), `${key} max not finite`).toBe(true);
      expect(min, `${key} min should be <= max`).toBeLessThanOrEqual(max);
    }
  });

  it('file deps reference valid file ids and never self-reference', () => {
    const repo = buildRepo();
    for (const f of repo.files) {
      for (const dep of f.deps) {
        expect(dep).toBeGreaterThanOrEqual(0);
        expect(dep).toBeLessThan(repo.files.length);
        expect(dep).not.toBe(f.id);
      }
    }
  });

  it('owners list is sorted unique strings', () => {
    const repo = buildRepo();
    const sorted = [...repo.owners].sort();
    expect(repo.owners).toEqual(sorted);
    expect(new Set(repo.owners).size).toBe(repo.owners.length);
  });

  it('editSafety is always within [0, 100]', () => {
    const repo = buildRepo();
    for (const f of repo.files) {
      expect(f.metrics.editSafety).toBeGreaterThanOrEqual(0);
      expect(f.metrics.editSafety).toBeLessThanOrEqual(100);
    }
  });
});
