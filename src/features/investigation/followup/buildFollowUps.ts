import type {
  ContextBundle,
  EvidenceItem,
  InvestigationAnswer,
  QuestionType,
} from '@entities/investigation';

export type FollowUp = {
  id: string;
  question: string;
  reason: string;
  questionType: QuestionType;
};

const HOP_TARGET: Record<QuestionType, { type: QuestionType; question: string }> = {
  why_risky: {
    type: 'blast_of_change',
    question: 'Now check the blast of changing this target.',
  },
  blast_of_change: {
    type: 'why_risky',
    question: 'Step back: why is this target risky to begin with?',
  },
  incident_suspect: {
    type: 'why_risky',
    question: 'Why is the suspected change risky in production?',
  },
};

function partialEvidence(bundle: ContextBundle): EvidenceItem | null {
  for (const ev of bundle.evidence) {
    if (ev.whyPartial !== null) return ev;
  }
  return null;
}

function readEntrypoint(payload: Record<string, unknown> | undefined): string | null {
  if (!payload) return null;
  const v = payload['entrypoint'];
  return typeof v === 'string' ? v : null;
}

function evidenceQuestion(ev: EvidenceItem): string {
  if (ev.kind === 'taint_path') {
    const ep = readEntrypoint(ev.payload);
    return ep
      ? `Trace the full taint path through ${ep}`
      : 'Trace the full taint path through the suspect entrypoint';
  }
  if (ev.kind === 'caller') return 'Map the full caller fan-in for this target';
  if (ev.kind === 'callee') return 'Map the full callee fan-out for this target';
  if (ev.kind === 'recent_change') return 'Inspect the recent change for regressions';
  if (ev.kind === 'similar_incident') return 'Compare against the prior incident timeline';
  if (ev.kind === 'similar_code') return 'Audit sibling code paths sharing this pattern';
  if (ev.kind === 'docs_mismatch') return 'Reconcile docs vs. actual behaviour';
  if (ev.kind === 'test_coverage') return 'Identify uncovered branches near this site';
  return `Dig deeper into the ${ev.kind.replace(/_/g, ' ')} signal`;
}

export function buildFollowUps(
  bundle: ContextBundle | null,
  answer: InvestigationAnswer | null,
): FollowUp[] {
  if (!bundle || !answer) return [];

  const out: FollowUp[] = [];
  const currentType = bundle.questionType;

  const topUnknown = answer.unknowns[0];
  if (topUnknown) {
    out.push({
      id: `fu-${bundle.id}-unknown`,
      question: `How can we resolve unknown: ${topUnknown.label}?`,
      reason: `from unknown: ${topUnknown.kind}`,
      questionType: currentType,
    });
  }

  const partial = partialEvidence(bundle);
  if (partial) {
    out.push({
      id: `fu-${bundle.id}-evidence`,
      question: evidenceQuestion(partial),
      reason: `from partial evidence: ${partial.kind.replace(/_/g, ' ')}`,
      questionType: currentType,
    });
  } else if (bundle.evidence.length > 0) {
    const first = bundle.evidence[0];
    out.push({
      id: `fu-${bundle.id}-evidence`,
      question: evidenceQuestion(first),
      reason: `from top evidence: ${first.kind.replace(/_/g, ' ')}`,
      questionType: currentType,
    });
  }

  const hop = HOP_TARGET[currentType];
  out.push({
    id: `fu-${bundle.id}-hop`,
    question: hop.question,
    reason: `hop from ${currentType.replace(/_/g, ' ')}`,
    questionType: hop.type,
  });

  return out;
}
