import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy } from 'lucide-react';
import type { EvidenceItem } from '@entities/investigation';
import { ConfidenceDot, SourceToolBadge } from '../evidence';

type Props = { evidence: EvidenceItem };

function readPath(payload: Record<string, unknown> | undefined): string | null {
  if (!payload) return null;
  const v = payload['path'];
  return typeof v === 'string' ? v : null;
}

export function SimilarCodeCard({ evidence }: Props) {
  const { t } = useTranslation('investigation');
  if (evidence.kind !== 'similar_code') return null;

  const cardStyle: CSSProperties = {
    background: 'var(--bg-surface)',
    borderColor: 'var(--border-default)',
    minWidth: 220,
    maxWidth: 280,
  };

  const path = readPath(evidence.payload);

  return (
    <div className="border rounded-md p-2.5 flex flex-col gap-1.5" style={cardStyle}>
      <div className="flex items-center gap-1.5">
        <Copy size={12} aria-hidden="true" style={{ color: 'var(--fg-subtle)' }} />
        <span
          className="font-mono uppercase tracking-wider"
          style={{ color: 'var(--fg-subtle)', fontSize: '10px' }}
        >
          {t('similar.code')}
        </span>
      </div>
      <div
        className="leading-snug"
        style={{ color: 'var(--fg-default)', fontSize: '12px' }}
      >
        {evidence.summary}
      </div>
      {path ? (
        <div
          className="font-mono truncate"
          style={{ color: 'var(--fg-subtle)', fontSize: '10px' }}
          title={path}
        >
          {path}
        </div>
      ) : null}
      <div className="flex items-center justify-end gap-1.5 mt-0.5">
        <ConfidenceDot confidence={evidence.confidence} />
        <SourceToolBadge tool={evidence.sourceTool} />
      </div>
    </div>
  );
}
