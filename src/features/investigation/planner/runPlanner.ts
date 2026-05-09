import type {
  ContextBundle,
  EvidenceItem,
  EvidenceKind,
  InvestigationTarget,
  QuestionType,
} from '@entities/investigation';

// TODO(backend): replace deterministic chain with real LLM reflection loop

export type PlannerStep = {
  id: string;
  question: string;
  gatheredEvidenceIds: string[];
  conclusion: string;
  nextQuestion: string | null;
};

export type PlannerTrace = {
  target: InvestigationTarget;
  rootQuestion: string;
  steps: PlannerStep[];
  finalConclusion: string;
};

export type RunPlannerOptions = {
  target: InvestigationTarget;
  questionType: QuestionType;
  bundle: ContextBundle;
  signal?: AbortSignal;
  onStep?: (step: PlannerStep, allSoFar: PlannerStep[]) => void;
};

const ROOT_QUESTION_BY_TYPE: Record<QuestionType, string> = {
  why_risky: 'Why is this risky?',
  blast_of_change: "What's the blast of changing this?",
  incident_suspect: 'What is the suspected cause of this incident?',
};

const CONFIDENCE_RANK: Record<EvidenceItem['confidence'], number> = {
  high: 0,
  medium: 1,
  low: 2,
  unknown: 3,
};

function rankByConfidence(items: EvidenceItem[]): EvidenceItem[] {
  return [...items].sort((a, b) => {
    const conf = CONFIDENCE_RANK[a.confidence] - CONFIDENCE_RANK[b.confidence];
    if (conf !== 0) return conf;
    const aFresh = a.staleness === 'fresh' ? 0 : 1;
    const bFresh = b.staleness === 'fresh' ? 0 : 1;
    if (aFresh !== bFresh) return aFresh - bFresh;
    return a.id.localeCompare(b.id);
  });
}

function dominantKind(items: EvidenceItem[]): EvidenceKind | null {
  if (items.length === 0) return null;
  const counts = new Map<EvidenceKind, number>();
  for (const it of items) {
    counts.set(it.kind, (counts.get(it.kind) ?? 0) + 1);
  }
  let best: EvidenceKind = items[0]!.kind;
  let bestCount = -1;
  for (const [kind, count] of counts) {
    if (count > bestCount) {
      best = kind;
      bestCount = count;
    }
  }
  return best;
}

function followUpForKind(kind: EvidenceKind | null): string | null {
  if (!kind) return null;
  switch (kind) {
    case 'taint_path':
      return 'Where does the tainted input originate?';
    case 'caller':
      return 'Which callers are most exposed?';
    case 'callee':
      return 'Which callees compound the blast radius?';
    case 'recent_change':
      return 'Which recent change most likely introduced this?';
    case 'owner':
      return 'Who is best positioned to review this?';
    case 'test_coverage':
      return 'Where are coverage gaps that could mask regressions?';
    case 'incident':
      return 'Does the incident timeline corroborate this signal?';
    case 'similar_incident':
      return 'Does a prior incident apply the same fix pattern?';
    case 'similar_code':
      return 'Are sibling sites affected by the same pattern?';
    case 'docs_mismatch':
      return 'Where do docs and behaviour diverge?';
    case 'symbol':
      return 'How is this symbol referenced across the surface?';
    default:
      return null;
  }
}

function summarize(items: EvidenceItem[], joiner: string): string {
  if (items.length === 0) return 'No supporting evidence surfaced for this hop.';
  const fragments = items.map((it) => it.summary.replace(/\.$/, ''));
  return fragments.join(joiner) + '.';
}

function step1Conclusion(items: EvidenceItem[], targetLabel: string): string {
  if (items.length === 0) {
    return `No high-confidence evidence anchored to ${targetLabel} on the first hop.`;
  }
  return `Top signals on ${targetLabel}: ${summarize(items, '; ')}`;
}

function step2Conclusion(items: EvidenceItem[], focusKind: EvidenceKind | null): string {
  if (items.length === 0) {
    return focusKind
      ? `No further ${focusKind.replace(/_/g, ' ')} evidence to chase on this hop.`
      : 'No follow-up evidence available.';
  }
  const kindLabel = focusKind ? focusKind.replace(/_/g, ' ') : 'related';
  return `Following the ${kindLabel} thread: ${summarize(items, '; ')}`;
}

function step3Conclusion(items: EvidenceItem[]): string {
  if (items.length === 0) {
    return 'Combined: no remaining evidence — chain saturated on prior hops.';
  }
  return `Combined: ${summarize(items, ' and ')}`;
}

function makeFinal(steps: PlannerStep[], targetLabel: string): string {
  const concs = steps.map((s) => s.conclusion).filter(Boolean);
  if (concs.length === 0) return `No reflection produced for ${targetLabel}.`;
  const head = concs[0] ?? '';
  const tail = concs[concs.length - 1] ?? '';
  if (concs.length === 1) return head;
  return `${head} ${tail}`;
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('aborted', 'AbortError'));
      return;
    }
    let timer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
    const onAbort = () => {
      cleanup();
      reject(new DOMException('aborted', 'AbortError'));
    };
    const cleanup = () => {
      if (timer != null) {
        clearTimeout(timer);
        timer = null;
      }
      if (signal) signal.removeEventListener('abort', onAbort);
    };
    if (signal) signal.addEventListener('abort', onAbort, { once: true });
  });
}

export async function runPlanner(opts: RunPlannerOptions): Promise<PlannerTrace> {
  const { target, questionType, bundle, signal, onStep } = opts;

  if (signal?.aborted) {
    throw new DOMException('aborted', 'AbortError');
  }

  const rootQuestion = ROOT_QUESTION_BY_TYPE[questionType];
  const ranked = rankByConfidence(bundle.evidence);

  const step1Items = ranked.slice(0, 2);
  const step1Kind = dominantKind(step1Items);
  const step1Next = followUpForKind(step1Kind);

  const step1: PlannerStep = {
    id: `step-${bundle.id}-1`,
    question: rootQuestion,
    gatheredEvidenceIds: step1Items.map((i) => i.id),
    conclusion: step1Conclusion(step1Items, target.label),
    nextQuestion: step1Next,
  };

  const usedIds = new Set(step1.gatheredEvidenceIds);
  const remaining = ranked.filter((e) => !usedIds.has(e.id));

  const step2Pool = step1Kind
    ? remaining.filter((e) => e.kind === step1Kind)
    : [];
  const step2Items = (step2Pool.length > 0 ? step2Pool : remaining).slice(0, 2);
  const step2Kind = dominantKind(step2Items);
  const step2Next = followUpForKind(step2Kind);

  const step2: PlannerStep = {
    id: `step-${bundle.id}-2`,
    question: step1Next ?? 'What does the next hop tell us?',
    gatheredEvidenceIds: step2Items.map((i) => i.id),
    conclusion: step2Conclusion(step2Items, step1Kind),
    nextQuestion: step2Next,
  };

  for (const id of step2.gatheredEvidenceIds) usedIds.add(id);
  const step3Items = ranked.filter((e) => !usedIds.has(e.id));

  const step3: PlannerStep = {
    id: `step-${bundle.id}-3`,
    question: step2Next ?? 'What does the combined picture say?',
    gatheredEvidenceIds: step3Items.map((i) => i.id),
    conclusion: step3Conclusion(step3Items),
    nextQuestion: null,
  };

  const allSteps: PlannerStep[] = [];
  const ordered = [step1, step2, step3];
  for (let i = 0; i < ordered.length; i++) {
    if (i > 0) {
      await delay(600, signal);
    } else {
      await delay(300, signal);
    }
    const s = ordered[i]!;
    allSteps.push(s);
    if (onStep) onStep(s, [...allSteps]);
  }

  const finalConclusion = makeFinal(allSteps, target.label);

  return {
    target,
    rootQuestion,
    steps: allSteps,
    finalConclusion,
  };
}
