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

// Phase 4: breadcrumb survives navigation (the consume slot above is one-shot).
export type FixHandoffBreadcrumb = {
  target: InvestigationTarget;
  conclusion: string;
  evidenceCount: number;
  hypothesisStatement?: string;
  triggeredAt: number;
};

let lastBreadcrumb: FixHandoffBreadcrumb | null = null;

export function recordHandoffBreadcrumb(payload: FixHandoffPayload): void {
  lastBreadcrumb = {
    target: payload.target,
    conclusion: payload.conclusion,
    evidenceCount: payload.evidence.length,
    ...(payload.hypothesis ? { hypothesisStatement: payload.hypothesis.statement } : {}),
    triggeredAt: payload.triggeredAt,
  };
}

export function readHandoffBreadcrumb(): FixHandoffBreadcrumb | null {
  return lastBreadcrumb;
}

export function clearHandoffBreadcrumb(): void {
  lastBreadcrumb = null;
}
