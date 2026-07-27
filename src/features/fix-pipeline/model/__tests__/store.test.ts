import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { useFixPipelineStore } from '../store';

// The fix-pipeline store is the core "seed → candidate → proof → deliver"
// state machine. Its async transitions are mocked with setTimeout and guarded
// by monotonic run tokens against stale-response races. We drive them with fake
// timers and `runAllTimersAsync` (flushes both the timer and the awaited
// promise chain).

const s = () => useFixPipelineStore.getState();

// Await an async action that resolves behind a mocked setTimeout delay.
async function flush(): Promise<void> {
  await vi.runAllTimersAsync();
}

beforeEach(() => {
  vi.useFakeTimers();
  s().reset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('fix-pipeline store — seed selection', () => {
  it('generates candidates and selects the recommended one', async () => {
    const seedId = s().seeds[0].id;
    const p = s().selectSeed(seedId);
    expect(s().generationStatus).toBe('generating');

    await flush();
    await p;

    expect(s().generationStatus).toBe('ready');
    expect(s().selectedSeedId).toBe(seedId);

    const cands = s().candidatesBySeed[seedId] ?? [];
    expect(cands.length).toBeGreaterThan(0);

    const recommended = cands.find((c) => c.isRecommended) ?? cands[0];
    expect(s().selectedCandidateId).toBe(recommended.id);

    // One generation cycle is billed per candidate produced.
    expect(s().cost.cycles).toBe(cands.length);

    // Derived records exist for the selected candidate.
    const cid = s().selectedCandidateId!;
    expect(s().validationByCandidate[cid]).toBeTruthy();
    expect(s().decisionByCandidate[cid]).toBeTruthy();
    expect(s().confidenceByCandidate[cid]).toBeTruthy();
  });

  it('reuses cached candidates on re-select (no extra generation cost)', async () => {
    const seedId = s().seeds[0].id;
    const p1 = s().selectSeed(seedId);
    await flush();
    await p1;
    const cyclesAfterFirst = s().cost.cycles;

    const p2 = s().selectSeed(seedId);
    await flush();
    await p2;

    expect(s().generationStatus).toBe('ready');
    expect(s().cost.cycles).toBe(cyclesAfterFirst); // cache hit — no regeneration
  });

  it('ignores an unknown seed id', async () => {
    await s().selectSeed('does-not-exist');
    expect(s().selectedSeedId).toBeNull();
    expect(s().generationStatus).toBe('idle');
  });

  it('drops a stale generation when the seed changes mid-flight (race guard)', async () => {
    const a = s().seeds[0].id;
    const b = s().seeds[1].id;

    const pA = s().selectSeed(a); // myGen = 1, generating A
    const pB = s().selectSeed(b); // bumps run token → 2, generating B
    await flush();
    await pA;
    await pB;

    // B wins; A's delayed result was discarded by the run-token guard.
    expect(s().selectedSeedId).toBe(b);
    expect(s().candidatesBySeed[b]).toBeTruthy();
    expect(s().candidatesBySeed[a]).toBeUndefined();
    expect(s().generationStatus).toBe('ready');
  });
});

describe('fix-pipeline store — validation loop', () => {
  it('runs validation, marks it done and advances the loop + cost', async () => {
    const seedId = s().seeds[0].id;
    const p = s().selectSeed(seedId);
    await flush();
    await p;

    const cid = s().selectedCandidateId!;
    const cyclesBefore = s().cost.cycles;

    s().runValidation(cid);
    expect(s().validationStatus).toBe('running');

    await flush();

    expect(s().validationStatus).toBe('done');
    expect(s().loop.iteration).toBeGreaterThanOrEqual(1);
    expect(s().cost.cycles).toBeGreaterThan(cyclesBefore);
  });

  it('selectCandidate invalidates an in-flight validation (race guard)', async () => {
    const seedId = s().seeds[0].id;
    const p = s().selectSeed(seedId);
    await flush();
    await p;

    const cands = s().candidatesBySeed[seedId];
    s().runValidation(s().selectedCandidateId!);
    expect(s().validationStatus).toBe('running');

    // Switching candidate mid-run resets status and bumps the val token.
    s().selectCandidate(cands[0].id);
    expect(s().validationStatus).toBe('idle');
    expect(s().selectedCandidateId).toBe(cands[0].id);

    // The stale validation fires but bails — status stays idle, not 'done'.
    await flush();
    expect(s().validationStatus).toBe('idle');
  });
});

describe('fix-pipeline store — submission', () => {
  it('either blocks per delivery tier or resolves submitting → submitted', async () => {
    const seedId = s().seeds[0].id;
    const p = s().selectSeed(seedId);
    await flush();
    await p;

    const cid = s().selectedCandidateId!;
    s().submitCandidate(cid);

    const rec = s().submissions[cid];
    if (rec.status === 'submission-blocked') {
      expect(rec.blockerReason).toBeTruthy();
    } else {
      expect(rec.status).toBe('submitting');
      await flush();
      const after = s().submissions[cid];
      expect(['auto-submitted', 'manually-submitted']).toContain(after.status);
      expect(after.prNumber).toBeTruthy();
    }
  });
});

describe('fix-pipeline store — dismissal & reset', () => {
  it('dismissCandidate records the dismissal and moves selection off it', async () => {
    const seedId = s().seeds[0].id;
    const p = s().selectSeed(seedId);
    await flush();
    await p;

    const cid = s().selectedCandidateId!;
    s().dismissCandidate(cid, 'wrong-root-cause', 'note');
    await flush(); // flush the mocked regeneration

    expect(s().dismissals.some((d) => d.candidateId === cid)).toBe(true);
    expect(s().validationStatus).toBe('idle');
    expect(s().selectedCandidateId).not.toBe(cid);
  });

  it('reset clears all pipeline state', async () => {
    const seedId = s().seeds[0].id;
    const p = s().selectSeed(seedId);
    await flush();
    await p;
    expect(s().selectedSeedId).toBe(seedId);

    s().reset();

    expect(s().selectedSeedId).toBeNull();
    expect(s().candidatesBySeed).toEqual({});
    expect(s().selectedCandidateId).toBeNull();
    expect(s().cost.cycles).toBe(0);
    expect(s().generationStatus).toBe('idle');
    expect(s().dismissals).toEqual([]);
  });

  it('drops the dismiss regeneration if the store resets before it resolves (race guard)', async () => {
    const seedId = s().seeds[0].id;
    const p = s().selectSeed(seedId);
    await flush();
    await p;
    const cid = s().selectedCandidateId!;

    s().dismissCandidate(cid, 'wrong-root-cause'); // schedules async regen
    s().reset(); // supersede before it resolves
    await flush();

    // The stale regenerated list must NOT resurrect into the reset store.
    expect(s().candidatesBySeed).toEqual({});
    expect(s().selectedSeedId).toBeNull();
  });
});
