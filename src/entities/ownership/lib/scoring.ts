import type {
  OwnershipScore,
  OwnershipZone,
  Person,
  PersonId,
} from '../model';

export type FreshnessDecayOptions = {
  halfLifeDays: number;
  nowDays: number;
  lastActiveByPerson: Record<PersonId, number>;
}

export function applyFreshnessDecay(
  scores: OwnershipScore[],
  options: FreshnessDecayOptions,
): OwnershipScore[] {
  const { halfLifeDays, nowDays, lastActiveByPerson } = options;
  const safeHalfLife = halfLifeDays > 0 ? halfLifeDays : 1;

  return scores.map((score) => {
    if (score.layer === 'declared') return score;
    if (score.layer !== 'historical' && score.layer !== 'expertise') return score;

    const lastActive = lastActiveByPerson[score.personId];
    if (lastActive === undefined) return score;

    const ageDays = Math.max(0, nowDays - lastActive);
    const decay = Math.pow(0.5, ageDays / safeHalfLife);
    return { ...score, weight: score.weight * decay };
  });
}

export function identifyInactiveOwners(
  people: Person[],
  cutoffDays = 60,
): PersonId[] {
  return people
    .filter((p) => !p.active || p.lastActiveDays >= cutoffDays)
    .map((p) => p.id);
}

export function aggregateLayeredScores(
  scores: OwnershipScore[],
): Record<PersonId, number> {
  const out: Record<PersonId, number> = {};
  for (const s of scores) {
    out[s.personId] = (out[s.personId] ?? 0) + s.weight;
  }
  return out;
}

export type ZoneScoringResult = {
  ranked: { personId: PersonId; total: number }[];
  primaryCandidate: PersonId;
  backupCandidate: PersonId | null;
}

export function scoreOwnershipZone(
  zone: OwnershipZone,
  people: Person[],
): ZoneScoringResult {
  const aggregated = aggregateLayeredScores(zone.scores);
  const inactive = new Set(identifyInactiveOwners(people));

  const ranked = Object.entries(aggregated)
    .map(([personId, total]) => ({ personId, total }))
    .sort((a, b) => {
      const aActive = inactive.has(a.personId) ? 0 : 1;
      const bActive = inactive.has(b.personId) ? 0 : 1;
      if (aActive !== bActive) return bActive - aActive;
      return b.total - a.total;
    });

  const primaryCandidate = ranked[0]?.personId ?? zone.primary;
  const backupCandidate = ranked[1]?.personId ?? null;

  return { ranked, primaryCandidate, backupCandidate };
}
