import { useState, type CSSProperties } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { EvidenceItem, WhyPartial } from '@entities/investigation';
import { ConfidenceDot } from './ConfidenceDot';
import { StalenessPill } from './StalenessPill';
import { SourceToolBadge } from './SourceToolBadge';
import { EvidenceKindIcon } from './EvidenceKindIcon';

type Props = {
  evidence: EvidenceItem;
  expanded?: boolean;
  onToggle?: () => void;
};

function partialLabel(why: WhyPartial): string {
  switch (why) {
    case 'dispatch_overapprox':
      return 'partial: dispatch over-approx';
    case 'runtime_missing':
      return 'partial: runtime missing';
    case 'index_stale':
      return 'partial: index stale';
    case 'analysis_truncated':
      return 'partial: analysis truncated';
    case null:
    default:
      return '';
  }
}

// Single evidence card. Lives inside an already-glassy panel, so we use
// a plain <div> with a flat surface — wrapping in another GlassCard
// stacks blur and looks muddy. NO LEFT STRIPE: confidence is the dot to
// the right of the kind label (memory rule).
export function EvidenceCard({ evidence, expanded, onToggle }: Props) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isControlled = expanded !== undefined;
  const open = isControlled ? expanded : internalExpanded;

  function handleToggle() {
    if (onToggle) onToggle();
    if (!isControlled) setInternalExpanded((v) => !v);
  }

  const containerStyle: CSSProperties = {
    background: 'var(--bg-surface)',
    borderColor: 'var(--border-default)',
  };
  const partial = partialLabel(evidence.whyPartial);
  const hasDetail = Boolean(evidence.detail);

  return (
    <div className="border rounded-md p-2.5 flex flex-col gap-1.5" style={containerStyle}>
      <div className="flex items-center gap-1.5">
        <EvidenceKindIcon kind={evidence.kind} size={12} />
        <span
          className="font-mono uppercase tracking-wider"
          style={{ color: 'var(--fg-subtle)', fontSize: '10px' }}
        >
          {evidence.kind.replace(/_/g, ' ')}
        </span>
        <span className="flex-1" />
        <ConfidenceDot confidence={evidence.confidence} />
        <StalenessPill staleness={evidence.staleness} />
        <SourceToolBadge tool={evidence.sourceTool} />
      </div>

      <div
        className="leading-snug"
        style={{ color: 'var(--fg-default)', fontSize: '12px' }}
      >
        {evidence.summary}
      </div>

      {hasDetail ? (
        <button
          type="button"
          onClick={handleToggle}
          className="self-start inline-flex items-center gap-1 mt-0.5"
          style={{
            color: 'var(--fg-subtle)',
            fontSize: '10px',
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
          }}
          aria-expanded={open}
        >
          {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          <span className="font-mono uppercase tracking-wider">
            {open ? 'hide detail' : 'detail'}
          </span>
        </button>
      ) : null}

      {hasDetail && open ? (
        <div
          className="leading-snug whitespace-pre-wrap"
          style={{
            color: 'var(--fg-muted)',
            fontSize: '11px',
            paddingLeft: 4,
            borderLeft: 'none',
          }}
        >
          {evidence.detail}
        </div>
      ) : null}

      {partial ? (
        <div className="flex justify-end">
          <span
            style={{
              background: 'var(--bg-surface-muted)',
              color: 'var(--intent-warn-vivid)',
              border: '1px solid var(--border-default)',
              fontSize: '9px',
              lineHeight: 1.1,
            }}
            className="inline-flex items-center px-1.5 py-0.5 rounded font-mono"
          >
            {partial}
          </span>
        </div>
      ) : null}
    </div>
  );
}
