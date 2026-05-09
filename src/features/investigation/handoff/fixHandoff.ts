import type {
  EvidenceItem,
  Hypothesis,
  InvestigationTarget,
} from '@entities/investigation';

export type FixHandoffPayload = {
  target: InvestigationTarget;
  evidence: EvidenceItem[];
  hypothesis?: Hypothesis;
  conclusion: string;
  triggeredAt: number;
};

// Module-scoped slot — Phase 3 stub. Backend later replaces with a real handoff.
let pendingHandoff: FixHandoffPayload | null = null;

export function setPendingHandoff(p: FixHandoffPayload): void {
  pendingHandoff = p;
}

export function consumePendingHandoff(): FixHandoffPayload | null {
  const p = pendingHandoff;
  pendingHandoff = null;
  return p;
}

export function peekPendingHandoff(): FixHandoffPayload | null {
  return pendingHandoff;
}
