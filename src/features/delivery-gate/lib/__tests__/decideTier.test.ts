import { describe, it, expect } from 'vitest';
import { decideTier, TIER_THRESHOLDS } from '../decideTier';
import {
  buildCandidate,
  buildObligation,
  buildValidation,
  buildPermissions,
} from '@entities/fix-pipeline/__tests__/_fixtures';

// decideTier is the core delivery gate: it decides whether an agent patch can
// auto-ship (safe-mechanical), needs a click (guarded), or a human
// (human-required). Hard blockers collapse to human-required regardless of
// diff size; promotion to safe-mechanical requires ALL sub-conditions.

describe('decideTier', () => {
  it('promotes a clean, small, mechanical-titled patch to safe-mechanical', () => {
    const d = decideTier(buildCandidate(), buildValidation(), buildPermissions());
    expect(d.tier).toBe('safe-mechanical');
    expect(d.blockers).toEqual([]);
  });

  it('forces human-required when a security path is touched', () => {
    const d = decideTier(
      buildCandidate({ metrics: { securityPathTouched: true } }),
      buildValidation(),
      buildPermissions(),
    );
    expect(d.tier).toBe('human-required');
    expect(d.blockers.length).toBeGreaterThan(0);
  });

  it('forces human-required on a failing policy obligation even with clean metrics', () => {
    const validation = buildValidation({
      obligations: [buildObligation({ category: 'policy', status: 'fail' })],
    });
    const d = decideTier(buildCandidate(), validation, buildPermissions());
    expect(d.tier).toBe('human-required');
    expect(d.blockers.some((b) => b.includes('policy'))).toBe(true);
  });

  it('forces human-required when modules affected exceed the guarded max', () => {
    const d = decideTier(
      buildCandidate({ metrics: { modulesAffected: TIER_THRESHOLDS.guarded.maxModules + 1 } }),
      buildValidation(),
      buildPermissions(),
    );
    expect(d.tier).toBe('human-required');
  });

  it('lands on guarded for a clean small patch whose title is not mechanical', () => {
    const d = decideTier(
      buildCandidate({ title: 'refactor auth core' }),
      buildValidation(),
      buildPermissions(),
    );
    expect(d.tier).toBe('guarded');
    expect(d.blockers.some((b) => b.includes('mechanical-kind'))).toBe(true);
  });

  it('holds a would-be safe-mechanical patch at human-required before graduation', () => {
    const d = decideTier(
      buildCandidate(),
      buildValidation(),
      buildPermissions({ graduated: false, successfulRuns: 1, graduationThreshold: 3 }),
    );
    expect(d.tier).toBe('human-required');
    expect(d.blockers.some((b) => b.includes('점진적'))).toBe(true);
  });

  it('drops to guarded when the line count exceeds the safe-mechanical max', () => {
    const d = decideTier(
      buildCandidate({
        title: 'rename foo', // mechanical, so only the size gate blocks promotion
        metrics: { linesChanged: TIER_THRESHOLDS.safeMechanical.maxLines + 1 },
      }),
      buildValidation(),
      buildPermissions(),
    );
    expect(d.tier).toBe('guarded');
  });
});
