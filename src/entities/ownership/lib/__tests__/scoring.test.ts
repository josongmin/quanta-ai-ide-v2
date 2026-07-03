import { describe, it, expect } from 'vitest';
import {
  applyFreshnessDecay,
  identifyInactiveOwners,
  aggregateLayeredScores,
  scoreOwnershipZone,
} from '../scoring';
import { MOCK_ZONES, MOCK_PEOPLE } from '../../mock';
import type { OwnershipScore, Person } from '../../model';

const person = (o: Partial<Person> & { id: string }): Person => ({
  name: 'X', team: 'core', initials: 'X', avatarHue: 0, active: true, lastActiveDays: 0, ...o,
});
const score = (o: Partial<OwnershipScore> & { personId: string }): OwnershipScore => ({
  layer: 'historical', weight: 1, reason: '', ...o,
});

describe('applyFreshnessDecay', () => {
  const opts = { halfLifeDays: 30, nowDays: 30, lastActiveByPerson: { p1: 0 } };

  it('leaves declared-layer scores undecayed', () => {
    const [out] = applyFreshnessDecay([score({ personId: 'p1', layer: 'declared', weight: 1 })], opts);
    expect(out.weight).toBe(1);
  });

  it('halves a historical score at exactly one half-life of age', () => {
    const [out] = applyFreshnessDecay([score({ personId: 'p1', layer: 'historical', weight: 1 })], opts);
    expect(out.weight).toBeCloseTo(0.5, 6);
  });

  it('leaves a score unchanged when the person has no last-active record', () => {
    const [out] = applyFreshnessDecay([score({ personId: 'ghost', weight: 0.8 })], opts);
    expect(out.weight).toBe(0.8);
  });

  it('guards halfLifeDays <= 0 against division blow-ups', () => {
    const [out] = applyFreshnessDecay(
      [score({ personId: 'p1', weight: 1 })],
      { halfLifeDays: 0, nowDays: 10, lastActiveByPerson: { p1: 0 } },
    );
    expect(Number.isFinite(out.weight)).toBe(true);
  });
});

describe('identifyInactiveOwners', () => {
  it('flags inactive people and those past the activity cutoff', () => {
    const ids = identifyInactiveOwners([
      person({ id: 'a', active: true, lastActiveDays: 0 }),
      person({ id: 'b', active: false, lastActiveDays: 0 }),
      person({ id: 'c', active: true, lastActiveDays: 90 }),
    ]);
    expect(ids).toEqual(['b', 'c']);
  });
});

describe('aggregateLayeredScores', () => {
  it('sums weights per person across layers', () => {
    const agg = aggregateLayeredScores([
      score({ personId: 'p1', weight: 0.6 }),
      score({ personId: 'p1', weight: 0.4 }),
      score({ personId: 'p2', weight: 1 }),
    ]);
    expect(agg['p1']).toBeCloseTo(1, 6);
    expect(agg['p2']).toBe(1);
  });
});

describe('scoreOwnershipZone', () => {
  it('ranks active owners ahead of higher-scoring inactive ones', () => {
    const people = [
      person({ id: 'active-low', active: true, lastActiveDays: 0 }),
      person({ id: 'inactive-high', active: false, lastActiveDays: 0 }),
    ];
    const zone = {
      ...MOCK_ZONES[0],
      scores: [
        score({ personId: 'inactive-high', weight: 5 }),
        score({ personId: 'active-low', weight: 1 }),
      ],
    };
    const res = scoreOwnershipZone(zone, people);
    expect(res.ranked[0].personId).toBe('active-low');
    expect(res.primaryCandidate).toBe('active-low');
  });

  it('falls back to the zone primary and null backup when there are no scores', () => {
    const zone = { ...MOCK_ZONES[0], scores: [] };
    const res = scoreOwnershipZone(zone, MOCK_PEOPLE);
    expect(res.primaryCandidate).toBe(zone.primary);
    expect(res.backupCandidate).toBeNull();
  });
});
