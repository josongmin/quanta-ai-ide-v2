import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { History } from 'lucide-react';
import type { EvidenceItem } from '@entities/investigation';
import { ConfidenceDot, SourceToolBadge } from '../evidence';

type Props = { evidence: EvidenceItem };

const INCIDENT_ID_RE = /INC-\d+/;
const RELATIVE_TIME_RE = /\d+\s*(d|w|mo|y|months?|days?|weeks?|years?)\s*(ago)?/i;
const PAREN_AGO_RE = /\(\d+\s+(months?|days?|weeks?|years?)\s+ago\)/i;

function parseId(summary: string, fallback: string): string {
  const m = INCIDENT_ID_RE.exec(summary);
  return m ? m[0] : fallback;
}

function parseAge(summary: string, fallback: string): string {
  const paren = PAREN_AGO_RE.exec(summary);
  if (paren) return paren[0].replace(/[()]/g, '');
  const rel = RELATIVE_TIME_RE.exec(summary);
  if (rel) return rel[0];
  return fallback;
}

export function SimilarIncidentCard({ evidence }: Props) {
  const { t } = useTranslation('investigation');
  if (evidence.kind !== 'similar_incident') return null;

  const cardStyle: CSSProperties = {
    background: 'var(--bg-surface)',
    borderColor: 'var(--border-default)',
    minWidth: 220,
    maxWidth: 280,
  };

  const incidentId = parseId(evidence.summary, t('similar.incidentFallback'));
  const age = parseAge(evidence.summary, t('similar.dateUnknown'));

  return (
    <div className="border rounded-md p-2.5 flex flex-col gap-1.5" style={cardStyle}>
      <div className="flex items-center gap-1.5">
        <History size={12} aria-hidden="true" style={{ color: 'var(--intent-warn-vivid)' }} />
        <span
          className="font-mono uppercase tracking-wider"
          style={{ color: 'var(--intent-warn-vivid)', fontSize: '10px' }}
        >
          {incidentId}
        </span>
      </div>
      <div
        className="leading-snug"
        style={{ color: 'var(--fg-default)', fontSize: '12px' }}
      >
        {evidence.summary}
      </div>
      <div
        className="font-mono"
        style={{ color: 'var(--fg-subtle)', fontSize: '10px' }}
      >
        {age}
      </div>
      <div className="flex items-center justify-end gap-1.5 mt-0.5">
        <ConfidenceDot confidence={evidence.confidence} />
        <SourceToolBadge tool={evidence.sourceTool} />
      </div>
    </div>
  );
}
