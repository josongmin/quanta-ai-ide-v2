import { useMemo, type CSSProperties } from 'react';
import {
  FIXTURE_EVIDENCE,
  type ContextBundle,
  type EvidenceItem,
  type NotebookQuestion,
} from '@entities/investigation';
import { EvidenceStrip } from '../evidence';
import { HypothesisBlock } from '../evidence';

type Props = {
  question: NotebookQuestion;
  bundle: ContextBundle | null;
};

export function FindingsBlock({ question, bundle }: Props) {
  const answer = question.answer;

  // Resolve evidence by id: prefer the live bundle, fall back to fixture data
  // since notebook entries reference snapshotted answers.
  const evidenceById = useMemo<Record<string, EvidenceItem>>(() => {
    const map: Record<string, EvidenceItem> = {};
    if (bundle) {
      for (const ev of bundle.evidence) map[ev.id] = ev;
    }
    if (answer) {
      for (const id of answer.evidenceIds) {
        if (map[id]) continue;
        // Search across fixtures for a matching evidence id.
        for (const list of Object.values(FIXTURE_EVIDENCE)) {
          const hit = list.find((e) => e.id === id);
          if (hit) {
            map[id] = hit;
            break;
          }
        }
      }
    }
    return map;
  }, [bundle, answer]);

  const pickedEvidence = useMemo<EvidenceItem[]>(() => {
    if (!answer) return [];
    const out: EvidenceItem[] = [];
    for (const id of answer.evidenceIds) {
      const ev = evidenceById[id];
      if (ev) out.push(ev);
    }
    return out;
  }, [answer, evidenceById]);

  const headerStyle: CSSProperties = {
    color: 'var(--fg-strong)',
    fontSize: '12px',
    lineHeight: 1.4,
  };

  if (!answer) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="font-medium" style={headerStyle}>
        {question.text}
      </div>
      <EvidenceStrip evidence={pickedEvidence} />
      <div
        style={{
          color: 'var(--fg-default)',
          fontSize: '12px',
          lineHeight: 1.55,
        }}
      >
        {answer.conclusion}
      </div>
      {answer.hypothesis ? (
        <div className="mt-1">
          <HypothesisBlock
            hypothesis={answer.hypothesis}
            evidenceById={evidenceById}
          />
        </div>
      ) : null}
    </div>
  );
}

export default FindingsBlock;
