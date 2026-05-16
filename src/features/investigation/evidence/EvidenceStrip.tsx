import type { CSSProperties } from 'react';
import type { EvidenceItem } from '@entities/investigation';
import { ConfidenceDot } from './ConfidenceDot';
import { EvidenceKindIcon } from './EvidenceKindIcon';

type Props = {
  evidence: EvidenceItem[];
  pickedId?: string | null;
  onPick?: (id: string) => void;
};

// Compact "evidence at a glance" row. Sits above the conclusion so a
// reader can see what the answer is grounded in before reading prose.
export function EvidenceStrip({ evidence, pickedId, onPick }: Props) {
  return (
    <div className="flex gap-1.5 overflow-x-auto">
      {evidence.map((ev) => {
        const isPicked = pickedId === ev.id;
        const style: CSSProperties = {
          background: isPicked ? 'var(--bg-active)' : 'var(--bg-surface)',
          borderColor: 'var(--border-default)',
          color: 'var(--fg-default)',
          fontSize: '10px',
          maxWidth: '220px',
          cursor: onPick ? 'pointer' : 'default',
        };
        return (
          <button
            key={ev.id}
            type="button"
            onClick={onPick ? () => { onPick(ev.id); } : undefined}
            disabled={!onPick}
            style={style}
            className="border rounded px-2 py-1 inline-flex items-center gap-1.5 flex-shrink-0"
            title={ev.summary}
          >
            <EvidenceKindIcon kind={ev.kind} size={11} />
            <span className="truncate" style={{ maxWidth: 160 }}>
              {ev.summary}
            </span>
            <ConfidenceDot confidence={ev.confidence} size={5} />
          </button>
        );
      })}
    </div>
  );
}
