import { useTranslation } from 'react-i18next';
import type { ReviewerRationale } from '@entities/ownership';

const RATIONALE_FIELDS: readonly {
  key: keyof ReviewerRationale;
  labelKey: string;
}[] = [
  { key: 'touchedAreaFamiliarity', labelKey: 'routing.rationale.touchedArea' },
  { key: 'recentReviewer', labelKey: 'routing.rationale.recentReviewer' },
  { key: 'incidentResolver', labelKey: 'routing.rationale.incidentResolver' },
  { key: 'codeOwner', labelKey: 'routing.rationale.codeOwner' },
];

export function ReviewerRow({ rationale }: { rationale: ReviewerRationale }) {
  const { t } = useTranslation('ownership');
  const dominantKey = RATIONALE_FIELDS.reduce((acc, f) =>
    rationale[f.key] > rationale[acc.key] ? f : acc,
  ).key;
  const dominantValue = rationale[dominantKey];
  const dominantStrong = dominantValue >= 0.55;
  return (
    <div className="space-y-1.5">
      {RATIONALE_FIELDS.map(({ key, labelKey }) => {
        const v = rationale[key];
        const pct = Math.round(v * 100);
        const isDominant = key === dominantKey && dominantStrong;
        return (
          <div
            key={key}
            className={`flex items-center gap-2 text-sm ${isDominant ? 'font-bold' : ''}`}
            style={{
              color: isDominant ? 'var(--fg-strong)' : 'var(--fg-default)',
            }}
          >
            <span
              className="w-[120px] shrink-0 truncate"
              style={{ color: 'var(--fg-muted)' }}
            >
              {t(labelKey)}
            </span>
            <div
              className="flex-1 h-1.5 rounded-full overflow-hidden"
              style={{ background: 'var(--bg-surface-muted)' }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  background: `color-mix(in srgb, var(--fg-default) ${
                    25 + Math.round(v * 55)
                  }%, transparent)`,
                }}
              />
            </div>
            <span
              className="w-8 text-right tabular-nums font-bold text-sm"
              style={{ color: 'var(--fg-default)' }}
            >
              {pct}%
            </span>
            {isDominant && (
              <span
                className="text-2xs font-black uppercase tracking-eyebrow px-1 py-0.5 rounded shrink-0"
                style={{
                  background: 'var(--bg-surface-muted)',
                  color: 'var(--fg-muted)',
                  border: '1px solid var(--border-muted)',
                }}
                title={t('routing.rationale.topTitle')}
              >
                {t('routing.rationale.top')}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
