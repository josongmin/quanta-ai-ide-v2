import type {
  OwnershipZone,
  Person,
  PersonId,
  ReviewerRationale,
} from '@entities/ownership';
import {
  aggregateLayeredScores,
  identifyInactiveOwners,
  scoreOwnershipZone,
} from '@entities/ownership';

export function selectPrimaryOwner(
  zone: OwnershipZone,
  people: Person[],
): PersonId {
  const { ranked } = scoreOwnershipZone(zone, people);
  const inactive = new Set(identifyInactiveOwners(people));
  const active = ranked.find((r) => !inactive.has(r.personId));
  if (active) return active.personId;
  return ranked[0]?.personId ?? zone.primary;
}

export function selectRecommendedReviewer(
  zone: OwnershipZone,
  people: Person[],
): PersonId {
  const aggregated = aggregateLayeredScores(zone.scores);
  const rationale = zone.reviewerRationale;
  const rationaleSum =
    rationale.touchedAreaFamiliarity +
    rationale.recentReviewer +
    rationale.incidentResolver +
    rationale.codeOwner;
  const rationaleWeight = rationaleSum > 0 ? rationaleSum : 1;
  const primary = selectPrimaryOwner(zone, people);
  const inactive = new Set(identifyInactiveOwners(people));

  const candidates = Object.entries(aggregated)
    .filter(([id]) => id !== primary && !inactive.has(id))
    .map(([personId, total]) => ({
      personId,
      score: total * (rationaleWeight / 4),
    }))
    .sort((a, b) => b.score - a.score);

  if (candidates[0]) return candidates[0].personId;
  return zone.recommendedReviewer;
}

export function calculateRoutingConfidence(
  rationale: ReviewerRationale,
): number {
  const values = [
    rationale.touchedAreaFamiliarity,
    rationale.recentReviewer,
    rationale.incidentResolver,
    rationale.codeOwner,
  ];
  const sum = values.reduce((s, v) => s + v, 0);
  if (sum <= 0) return 0;
  const max = Math.max(...values);
  const concentration = max / sum;
  return Math.min(1, Math.max(0, concentration));
}

export type RoutingFallback = {
  reason: string;
  fallbackPersonId: PersonId | null;
}

export function routingFallback(
  zone: OwnershipZone,
  people: Person[],
): RoutingFallback {
  const inactive = new Set(identifyInactiveOwners(people));
  const { ranked } = scoreOwnershipZone(zone, people);

  if (zone.state === 'orphan') {
    const candidate = ranked.find((r) => !inactive.has(r.personId));
    return {
      reason:
        'Zone is orphaned — declared owner left active rotation. Routing to highest-active contributor.',
      fallbackPersonId: candidate?.personId ?? zone.escalation ?? null,
    };
  }

  if (inactive.has(zone.primary)) {
    const candidate = ranked.find((r) => !inactive.has(r.personId));
    return {
      reason:
        'Primary owner is inactive. Falling back to next-ranked active contributor.',
      fallbackPersonId: candidate?.personId ?? zone.backup ?? null,
    };
  }

  return { reason: 'No fallback required.', fallbackPersonId: null };
}
