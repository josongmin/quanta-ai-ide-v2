import {
  FIXTURE_EVIDENCE,
  type ContextBundle,
  type EvidenceItem,
  type EvidenceKind,
  type InvestigationTarget,
  type QuestionType,
} from '@entities/investigation';

// TODO(backend): replace with real engine call to lexical/semantic/hybrid search + taint_flow + change_impact

const PRIORITY_BY_QUESTION: Record<QuestionType, EvidenceKind[]> = {
  why_risky: ['taint_path', 'owner', 'recent_change', 'docs_mismatch', 'similar_incident'],
  blast_of_change: ['caller', 'callee', 'recent_change', 'test_coverage', 'similar_code'],
  incident_suspect: ['recent_change', 'similar_incident', 'taint_path', 'incident', 'caller'],
};

function rankEvidence(evidence: EvidenceItem[], questionType: QuestionType): EvidenceItem[] {
  const priority = PRIORITY_BY_QUESTION[questionType];
  const score = (item: EvidenceItem): number => {
    const idx = priority.indexOf(item.kind);
    return idx === -1 ? priority.length : idx;
  };
  return [...evidence].sort((a, b) => score(a) - score(b));
}

function makeBundleId(target: InvestigationTarget, questionType: QuestionType): string {
  return `bundle-${target.id}-${questionType}-${Date.now()}`;
}

export async function gatherContext(
  target: InvestigationTarget,
  questionType: QuestionType,
  onPartial: (bundle: ContextBundle) => void,
  signal?: AbortSignal,
): Promise<ContextBundle> {
  if (signal?.aborted) {
    throw new DOMException('aborted', 'AbortError');
  }

  const all = FIXTURE_EVIDENCE[target.id] ?? [];
  const ranked = rankEvidence(all, questionType);
  const bundleId = makeBundleId(target, questionType);
  const startedAt = Date.now();

  return new Promise<ContextBundle>((resolve, reject) => {
    const accumulated: EvidenceItem[] = [];
    const chunkSize = 2;
    const tickMs = 250;
    let cursor = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (timer != null) {
        clearTimeout(timer);
        timer = null;
      }
      if (signal) signal.removeEventListener('abort', onAbort);
    };

    const onAbort = () => {
      cleanup();
      reject(new DOMException('aborted', 'AbortError'));
    };

    if (signal) signal.addEventListener('abort', onAbort, { once: true });

    const tick = () => {
      if (signal?.aborted) {
        onAbort();
        return;
      }

      const next = ranked.slice(cursor, cursor + chunkSize);
      cursor += chunkSize;
      accumulated.push(...next);

      if (cursor < ranked.length) {
        onPartial({
          id: bundleId,
          target,
          questionType,
          evidence: [...accumulated],
          gatheredAt: startedAt,
          status: 'partial',
        });
        timer = setTimeout(tick, tickMs);
        return;
      }

      const final: ContextBundle = {
        id: bundleId,
        target,
        questionType,
        evidence: [...accumulated],
        gatheredAt: Date.now(),
        status: 'complete',
      };
      cleanup();
      resolve(final);
    };

    if (ranked.length === 0) {
      const final: ContextBundle = {
        id: bundleId,
        target,
        questionType,
        evidence: [],
        gatheredAt: Date.now(),
        status: 'complete',
      };
      cleanup();
      resolve(final);
      return;
    }

    timer = setTimeout(tick, tickMs);
  });
}
