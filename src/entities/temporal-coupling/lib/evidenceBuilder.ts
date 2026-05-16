import type { CouplingEdge, CouplingNarrative } from '../model';

type GetFileTeam = (fileId: number) => string | null | undefined;

function severityFromRatio(ratio: number): CouplingNarrative['severity'] {
  if (ratio >= 0.75) return 'high';
  if (ratio >= 0.5) return 'medium';
  return 'low';
}

export function buildCouplingNarrative(
  edge: CouplingEdge,
  getFileTeam: GetFileTeam,
): CouplingNarrative {
  const teamA = getFileTeam(edge.fromFileId) ?? null;
  const teamB = getFileTeam(edge.toFileId) ?? null;
  const crossesTeamBoundary = Boolean(teamA && teamB && teamA !== teamB);

  const denom = Math.max(
    1,
    Math.round(edge.coChangeCount / Math.max(edge.coChangeRatio, 1e-6)),
  );
  const reason = `co-changed ${edge.coChangeCount}/${denom} commits`;

  return {
    reason,
    severity: severityFromRatio(edge.coChangeRatio),
    crossesTeamBoundary,
  };
}
