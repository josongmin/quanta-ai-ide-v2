import { describe, it, expect } from 'vitest';
import { computeConfidence } from '../computeConfidence';
import {
  buildCandidate,
  buildObligation,
  buildValidation,
} from '@entities/fix-pipeline/__tests__/_fixtures';

// computeConfidence maps a candidate + validation to exact / overapprox /
// unknown, plus a numeric capped by the level. It must stay in lock-step with
// the blast-radius bucketing (the drift the docs warn about).

describe('computeConfidence', () => {
  it('is unknown when any obligation failed, numeric capped at 0.4', () => {
    const validation = buildValidation({
      obligations: [
        buildObligation({ id: 'a', status: 'pass' }),
        buildObligation({ id: 'b', status: 'fail' }),
      ],
    });
    const c = computeConfidence(buildCandidate(), validation);
    expect(c.level).toBe('unknown');
    expect(c.numeric).toBeLessThanOrEqual(0.4);
  });

  it('is unknown when dynamic validation is unreachable', () => {
    const c = computeConfidence(
      buildCandidate(),
      buildValidation({ dynamicUnreachable: true }),
    );
    expect(c.level).toBe('unknown');
  });

  it('is exact when all dynamic+human obligations pass and no public-API churn', () => {
    const validation = buildValidation({
      obligations: [
        buildObligation({ id: 'd', category: 'dynamic', status: 'pass' }),
        buildObligation({ id: 'h', category: 'human', status: 'pass' }),
      ],
    });
    const c = computeConfidence(buildCandidate({ metrics: { publicApiChanged: false } }), validation);
    expect(c.level).toBe('exact');
    expect(c.numeric).toBe(validation.passed / validation.obligations.length);
  });

  it('downgrades exact to overapprox when the patch changes the public API', () => {
    const validation = buildValidation({
      obligations: [buildObligation({ category: 'dynamic', status: 'pass' })],
    });
    const c = computeConfidence(buildCandidate({ metrics: { publicApiChanged: true } }), validation);
    expect(c.level).toBe('overapprox');
    expect(c.numeric).toBeLessThanOrEqual(0.75);
  });

  it('is overapprox when a dynamic obligation is still pending', () => {
    const validation = buildValidation({
      obligations: [buildObligation({ category: 'dynamic', status: 'pending' })],
    });
    const c = computeConfidence(buildCandidate(), validation);
    expect(c.level).toBe('overapprox');
  });

  it('scores 0 with no obligations and picks the failing obligation as weakest', () => {
    expect(computeConfidence(buildCandidate(), buildValidation({ obligations: [] })).numeric).toBe(0);
    const weakest = computeConfidence(
      buildCandidate(),
      buildValidation({
        obligations: [
          buildObligation({ label: 'ok', status: 'pass' }),
          buildObligation({ label: 'boom', status: 'fail' }),
        ],
      }),
    ).weakestObligation;
    expect(weakest).toBe('boom');
  });

  it('is unknown (not vacuously exact) when there are no obligations', () => {
    const c = computeConfidence(buildCandidate(), buildValidation({ obligations: [] }));
    expect(c.level).toBe('unknown');
    expect(c.numeric).toBe(0);
  });
});
