import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { useVerifiedFixStore } from '../store';
import { FIX_CASES, SEEDS } from '../mockData';

// The verified-fix store is an async retry machine (attempt 1 → critique →
// attempt 2 → block) guarded by a per-case run-token Map against stale
// validation results. Validation is a mocked setTimeout (1500ms). Stock mock
// candidates pass attempt 1, so this covers the happy path + the race guard.

const VALIDATE_MS = 1500;
const st = () => useVerifiedFixStore.getState();
let caseId: string;

beforeEach(() => {
  vi.useFakeTimers();
  st().reset();
  caseId = st().seed(SEEDS[0], FIX_CASES[0].candidates);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('verified-fix store', () => {
  it('seeds a case in the pre-validate stage with a selected candidate', () => {
    const c = st().cases[caseId];
    expect(c.loop.currentStage).toBe('patch');
    expect(c.selectedCandidateId).toBe(FIX_CASES[0].candidates[0].id);
    expect(c.validations).toEqual([]);
    expect(c.draft).toBeNull();
  });

  it('runs validation and packages a draft on a passing attempt', () => {
    st().startValidation(caseId);
    expect(st().cases[caseId].loop.currentStage).toBe('validate');

    vi.advanceTimersByTime(VALIDATE_MS + 10);

    const c = st().cases[caseId];
    expect(c.loop.currentStage).toBe('done');
    expect(c.validations.length).toBeGreaterThanOrEqual(1);
    expect(c.draft).not.toBeNull();
  });

  it('drops a stale validation when the candidate is re-selected mid-flight (race guard)', () => {
    st().startValidation(caseId);
    expect(st().cases[caseId].loop.currentStage).toBe('validate');

    // Re-select mid-flight → bumps the run token, resets to pre-validate.
    st().selectCandidate(caseId, st().cases[caseId].selectedCandidateId!);
    expect(st().cases[caseId].loop.currentStage).toBe('patch');

    // The in-flight timer fires but bails on the superseded token.
    vi.advanceTimersByTime(VALIDATE_MS + 10);
    const c = st().cases[caseId];
    expect(c.loop.currentStage).toBe('patch'); // not 'done'
    expect(c.validations).toEqual([]);
  });

  it('reset clears all cases', () => {
    st().reset();
    expect(st().cases).toEqual({});
    expect(st().activeCaseId).toBeNull();
  });
});
