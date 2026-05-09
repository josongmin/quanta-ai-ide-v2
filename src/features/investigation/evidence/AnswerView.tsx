import { useMemo, type CSSProperties, type ReactNode } from 'react';
import type {
  ActionRecommendation,
  ContextBundle,
  EvidenceItem,
  InvestigationAnswer,
} from '@entities/investigation';
import { EvidenceStrip } from './EvidenceStrip';
import { UnknownTag } from './UnknownTag';
import { ActionButton } from './ActionButton';
import { HypothesisBlock } from './HypothesisBlock';

type Props = {
  answer: InvestigationAnswer;
  bundle: ContextBundle;
  onAction?: (action: ActionRecommendation) => void;
  onPickEvidence?: (id: string) => void;
  pickedEvidenceId?: string | null;
};

function SectionHeader({ children }: { children: ReactNode }) {
  const style: CSSProperties = {
    color: 'var(--fg-subtle)',
    fontSize: '10px',
  };
  return (
    <div
      className="font-mono uppercase tracking-wider mb-1.5"
      style={style}
    >
      {children}
    </div>
  );
}

// 4-slot answer surface (plus an optional hypothesis block). Each slot is
// separated by a top border + py-3 so the structure reads as a checklist
// rather than a wall of prose.
export function AnswerView({
  answer,
  bundle,
  onAction,
  onPickEvidence,
  pickedEvidenceId,
}: Props) {
  const evidenceById = useMemo<Record<string, EvidenceItem>>(() => {
    const map: Record<string, EvidenceItem> = {};
    for (const ev of bundle.evidence) {
      map[ev.id] = ev;
    }
    return map;
  }, [bundle.evidence]);

  const pickedEvidence = useMemo<EvidenceItem[]>(() => {
    const out: EvidenceItem[] = [];
    for (const id of answer.evidenceIds) {
      const ev = evidenceById[id] ?? null;
      if (ev) out.push(ev);
    }
    return out;
  }, [answer.evidenceIds, evidenceById]);

  const sectionDivider: CSSProperties = {
    borderTop: '1px solid var(--border-default)',
  };

  return (
    <div className="flex flex-col">
      {/* 1. Strip */}
      <div className="py-3">
        <EvidenceStrip
          evidence={pickedEvidence}
          pickedId={pickedEvidenceId ?? null}
          onPick={onPickEvidence}
        />
      </div>

      {/* 2. Conclusion */}
      <div className="py-3" style={sectionDivider}>
        <SectionHeader>Conclusion</SectionHeader>
        <div
          style={{
            color: 'var(--fg-default)',
            fontSize: '13px',
            lineHeight: 1.6,
          }}
        >
          {answer.conclusion}
        </div>
      </div>

      {/* 2b. Hypothesis (optional) */}
      {answer.hypothesis ? (
        <div className="py-3" style={sectionDivider}>
          <SectionHeader>Hypothesis</SectionHeader>
          <HypothesisBlock
            hypothesis={answer.hypothesis}
            evidenceById={evidenceById}
          />
        </div>
      ) : null}

      {/* 3. Unknowns */}
      <div className="py-3" style={sectionDivider}>
        <SectionHeader>Unknowns</SectionHeader>
        {answer.unknowns.length === 0 ? (
          <div style={{ color: 'var(--fg-subtle)', fontSize: '11px' }}>
            (none reported)
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {answer.unknowns.map((u) => (
              <UnknownTag key={u.id} tag={u} />
            ))}
          </div>
        )}
      </div>

      {/* 4. Actions */}
      <div className="py-3" style={sectionDivider}>
        <SectionHeader>Actions</SectionHeader>
        <div className="flex flex-wrap gap-1.5">
          {answer.actions.map((a) => (
            <ActionButton key={a.id} action={a} onRun={onAction} />
          ))}
        </div>
      </div>
    </div>
  );
}
