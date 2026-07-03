import type { CSSProperties } from 'react';
import type { EvidenceItem, Hypothesis } from '@entities/investigation';
import { EvidenceKindIcon } from './EvidenceKindIcon';

type Props = {
  hypothesis: Hypothesis;
  evidenceById: Record<string, EvidenceItem>;
};

function Row({ ev }: { ev: EvidenceItem }) {
  return (
    <li className="flex items-center gap-1.5 py-0.5">
      <EvidenceKindIcon kind={ev.kind} size={11} />
      <span
        className="truncate"
        style={{ color: 'var(--fg-default)', fontSize: '11px' }}
        title={ev.summary}
      >
        {ev.summary}
      </span>
    </li>
  );
}

function Column({
  title,
  ids,
  evidenceById,
}: {
  title: string;
  ids: string[];
  evidenceById: Record<string, EvidenceItem>;
}) {
  const resolved = ids
    .map((id) => evidenceById[id] ?? null)
    .filter((x): x is EvidenceItem => x !== null);
  const headerStyle: CSSProperties = {
    color: 'var(--fg-subtle)',
    fontSize: '10px',
  };
  return (
    <div className="flex-1 min-w-0">
      <div
        className="font-mono uppercase tracking-wider mb-1"
        style={headerStyle}
      >
        {title}
      </div>
      {resolved.length === 0 ? (
        <div style={{ color: 'var(--fg-subtle)', fontSize: '11px' }}>(none)</div>
      ) : (
        <ul className="m-0 p-0 list-none">
          {resolved.map((ev) => (
            <Row key={ev.id} ev={ev} />
          ))}
        </ul>
      )}
    </div>
  );
}

function colorForConfidence(score: number): string {
  if (score >= 0.8) return 'var(--intent-success-vivid)';
  if (score >= 0.5) return 'var(--intent-warn-vivid)';
  return 'var(--intent-danger-vivid)';
}

function ConfidenceGauge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const fillColor = colorForConfidence(score);
  const trackStyle: CSSProperties = {
    width: 50,
    height: 4,
    background: 'var(--bg-active)',
    borderRadius: 999,
    overflow: 'hidden',
    flexShrink: 0,
  };
  const fillStyle: CSSProperties = {
    width: `${pct}%`,
    height: '100%',
    background: fillColor,
    borderRadius: 999,
    transition: 'width 200ms linear',
  };
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="font-mono"
        style={{ color: 'var(--fg-subtle)', fontSize: 9 }}
      >
        Hypothesis confidence
      </span>
      <span style={trackStyle}>
        <span style={fillStyle} />
      </span>
      <span
        className="font-mono"
        style={{ color: 'var(--fg-default)', fontSize: 10 }}
      >
        {pct}%
      </span>
    </div>
  );
}

export function HypothesisBlock({ hypothesis, evidenceById }: Props) {
  return (
    <div className="flex flex-col gap-2">
      {typeof hypothesis.confidence === 'number' ? (
        <ConfidenceGauge score={hypothesis.confidence} />
      ) : null}
      <div
        className="font-medium"
        style={{ color: 'var(--fg-default)', fontSize: '12px', lineHeight: 1.4 }}
      >
        {hypothesis.statement}
      </div>
      <div className="flex gap-4">
        <Column
          title="supporting"
          ids={hypothesis.supporting}
          evidenceById={evidenceById}
        />
        <Column
          title="refuting"
          ids={hypothesis.refuting}
          evidenceById={evidenceById}
        />
      </div>
    </div>
  );
}
