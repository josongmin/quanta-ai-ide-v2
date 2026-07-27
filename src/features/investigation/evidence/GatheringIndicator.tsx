import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { BundleStatus, EvidenceItem, SourceTool } from '@entities/investigation';
import { SourceToolBadge } from './SourceToolBadge';

type Props = {
  status: BundleStatus;
  count: number;
  recentEvidence?: EvidenceItem[];
};

// Streaming progress indicator. Shows the static-analysis tools that produced
// the most recent evidence chunks — turns the "gathering" state from a vague
// spinner into a visible reasoning trace. animate-pulse only — no rotation,
// since transform on glass parents kills backdrop-filter.
export function GatheringIndicator({ status, count, recentEvidence = [] }: Props) {
  const { t } = useTranslation('investigation');
  if (status !== 'gathering' && status !== 'partial') return null;

  const dotStyle: CSSProperties = {
    width: 6,
    height: 6,
    background: 'var(--intent-success-vivid)',
    borderRadius: '999px',
    display: 'inline-block',
    flexShrink: 0,
  };

  const text =
    status === 'gathering'
      ? t('gathering.gathering')
      : t('gathering.soFar', { count });

  const recentTools = uniqueRecentTools(recentEvidence, 3);
  const lastTool = recentTools[0];

  return (
    <div
      className="flex flex-col gap-1.5"
      role="status"
      aria-live="polite"
    >
      <div
        className="flex items-center gap-2"
        style={{ color: 'var(--fg-muted)', fontSize: '11px' }}
      >
        <span className="animate-pulse" style={dotStyle} aria-hidden="true" />
        <span>{text}</span>
        {lastTool ? (
          <span
            className="font-mono"
            style={{ color: 'var(--fg-subtle)', fontSize: '10px' }}
          >
            {t('gathering.running', { tool: t(`sourceTool.full.${lastTool}`) })}
          </span>
        ) : null}
      </div>
      {recentTools.length > 0 ? (
        <div className="flex items-center gap-1 flex-wrap">
          {recentTools.map((t, i) => (
            <span
              key={t}
              style={{ opacity: i === 0 ? 1 : 0.55 - i * 0.15 }}
            >
              <SourceToolBadge tool={t} />
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function uniqueRecentTools(evidence: EvidenceItem[], n: number): SourceTool[] {
  const seen = new Set<SourceTool>();
  const out: SourceTool[] = [];
  for (let i = evidence.length - 1; i >= 0 && out.length < n; i--) {
    const ev = evidence[i];
    if (!ev) continue;
    if (seen.has(ev.sourceTool)) continue;
    seen.add(ev.sourceTool);
    out.push(ev.sourceTool);
  }
  return out;
}
