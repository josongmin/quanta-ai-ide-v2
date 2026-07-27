import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { BundleCoverage, WhyPartial } from '@entities/investigation';

type Props = {
  coverage: BundleCoverage | undefined;
};

function colorForScore(score: number): string {
  if (score >= 0.8) return 'var(--intent-success-vivid)';
  if (score >= 0.5) return 'var(--intent-warn-vivid)';
  return 'var(--intent-danger-vivid)';
}

export function CoverageBadge({ coverage }: Props) {
  const { t } = useTranslation('investigation');
  if (!coverage) return null;
  const pct = Math.round(coverage.score * 100);
  const fillColor = colorForScore(coverage.score);

  const reasonText = coverage.partialReasons.length > 0
    ? t('coverage.partialReasons', {
        reasons: coverage.partialReasons
          .filter((r): r is NonNullable<WhyPartial> => r !== null)
          .map((r) => t(`coverage.reason.${r}`))
          .join(', '),
      })
    : t('coverage.allFresh');

  const tooltip = t('coverage.tooltip', {
    pct,
    fresh: coverage.fresh,
    stale: coverage.stale,
    partial: coverage.partial,
    reasonText,
  });

  const wrapperStyle: CSSProperties = {
    background: 'var(--bg-surface-muted)',
    border: '1px solid var(--border-default)',
    color: 'var(--fg-default)',
    fontSize: 10,
    borderRadius: 3,
    padding: '2px 6px',
  };

  const trackStyle: CSSProperties = {
    width: 12,
    height: 3,
    background: 'var(--bg-active)',
    borderRadius: 2,
    overflow: 'hidden',
    flexShrink: 0,
  };

  const fillStyle: CSSProperties = {
    width: `${pct}%`,
    height: '100%',
    background: fillColor,
    transition: 'width 200ms linear',
  };

  return (
    <span
      className="inline-flex items-center gap-1.5 font-mono"
      style={wrapperStyle}
      title={tooltip}
    >
      <span style={{ color: 'var(--fg-subtle)' }}>{t('coverage.label')}</span>
      <span style={trackStyle}>
        <span style={fillStyle} />
      </span>
      <span style={{ color: 'var(--fg-default)' }}>{pct}%</span>
    </span>
  );
}
