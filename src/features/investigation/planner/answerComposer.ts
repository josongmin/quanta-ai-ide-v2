import {
  FIXTURE_ACTIONS,
  FIXTURE_CONCLUSIONS,
  FIXTURE_HYPOTHESES,
  FIXTURE_UNKNOWNS,
  assertAnswerSlots,
  computeBundleCoverage,
  computeHypothesisConfidence,
  type ActionRecommendation,
  type Confidence,
  type ContextBundle,
  type EvidenceItem,
  type Hypothesis,
  type InvestigationAnswer,
  type UnknownTag,
} from '@entities/investigation';

const CONFIDENCE_RANK: Record<Confidence, number> = {
  high: 0,
  medium: 1,
  low: 2,
  unknown: 3,
};

function pickTopEvidence(evidence: EvidenceItem[], count: number): string[] {
  const sorted = [...evidence].sort((a, b) => {
    const conf = CONFIDENCE_RANK[a.confidence] - CONFIDENCE_RANK[b.confidence];
    if (conf !== 0) return conf;
    const aFresh = a.staleness === 'fresh' ? 0 : 1;
    const bFresh = b.staleness === 'fresh' ? 0 : 1;
    return aFresh - bFresh;
  });
  return sorted.slice(0, count).map((item) => item.id);
}

function defaultConclusion(label: string): string {
  return `Investigation surfaced multiple signals on ${label}; review the cited evidence to confirm next steps.`;
}

function defaultUnknowns(targetId: string): UnknownTag[] {
  return [
    {
      id: `unk-${targetId}-default`,
      kind: 'no_recent_data',
      label: 'No recent unknowns recorded',
      reason: 'Engine produced a complete bundle with no flagged gaps; treat absence of data as informational.',
    },
  ];
}

function defaultActions(targetId: string): ActionRecommendation[] {
  return [
    {
      id: `act-${targetId}-open-default`,
      kind: 'open_focus',
      label: 'Open in Focus',
      description: 'Pin this target in the Focus stack for inspection',
      enabled: true,
    },
  ];
}

export function composeAnswer(bundle: ContextBundle): InvestigationAnswer {
  const evidenceIds = pickTopEvidence(bundle.evidence, 3);
  const targetId = bundle.target.id;

  const conclusion = FIXTURE_CONCLUSIONS[targetId] ?? defaultConclusion(bundle.target.label);

  const fixtureUnknowns = FIXTURE_UNKNOWNS[targetId] ?? [];
  const unknowns = fixtureUnknowns.length > 0 ? fixtureUnknowns : defaultUnknowns(targetId);

  const fixtureActions = FIXTURE_ACTIONS[targetId] ?? [];
  const actions = fixtureActions.length > 0 ? fixtureActions : defaultActions(targetId);

  const fixtureHypothesis: Hypothesis | undefined = FIXTURE_HYPOTHESES[targetId];

  let hypothesis: Hypothesis | undefined;
  if (fixtureHypothesis) {
    const evidenceById: Record<string, EvidenceItem> = {};
    for (const ev of bundle.evidence) {
      evidenceById[ev.id] = ev;
    }
    hypothesis = {
      ...fixtureHypothesis,
      confidence: computeHypothesisConfidence(fixtureHypothesis, evidenceById),
    };
  }

  const answer: InvestigationAnswer = {
    conclusion,
    evidenceIds: evidenceIds.length > 0 ? evidenceIds : bundle.evidence.slice(0, 1).map((e) => e.id),
    unknowns,
    actions,
    hypothesis,
  };

  if (answer.evidenceIds.length === 0) {
    answer.evidenceIds = [`ev-${targetId}-placeholder`];
  }

  assertAnswerSlots(answer);
  return answer;
}

// TODO: real backend should populate `coverage` from analysis tool reports;
// this fixture-time helper just derives it from per-evidence flags.
export function enrichBundle(bundle: ContextBundle): ContextBundle {
  return { ...bundle, coverage: computeBundleCoverage(bundle.evidence) };
}
