import type { ReviewerRationale } from '@entities/ownership';

const RATIONALE_FIELDS: readonly {
  key: keyof ReviewerRationale;
  label: string;
}[] = [
  { key: 'touchedAreaFamiliarity', label: 'Touched area' },
  { key: 'recentReviewer', label: 'Recent reviewer' },
  { key: 'incidentResolver', label: 'Incident resolver' },
  { key: 'codeOwner', label: 'Code owner' },
];

export function ReviewerRow({ rationale }: { rationale: ReviewerRationale }) {
  const dominantKey = RATIONALE_FIELDS.reduce((acc, f) =>
    rationale[f.key] > rationale[acc.key] ? f : acc,
  ).key;
  const dominantValue = rationale[dominantKey];
  const dominantStrong = dominantValue >= 0.55;
  return (
    <div className="space-y-1.5">
      {RATIONALE_FIELDS.map(({ key, label }) => {
        const v = rationale[key];
        const pct = Math.round(v * 100);
        const isDominant = key === dominantKey && dominantStrong;
        return (
          <div
            key={key}
            className={`flex items-center gap-2 text-[11px] ${isDominant ? 'font-bold' : ''}`}
            style={{
              color: isDominant ? 'var(--fg-strong)' : 'var(--fg-default)',
            }}
          >
            <span
              className="w-[120px] shrink-0 truncate"
              style={{ color: 'var(--fg-muted)' }}
            >
              {label}
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
              className="w-8 text-right tabular-nums font-bold text-[11px]"
              style={{ color: 'var(--fg-default)' }}
            >
              {pct}%
            </span>
            {isDominant && (
              <span
                className="text-[8px] font-black uppercase tracking-[0.18em] px-1 py-0.5 rounded shrink-0"
                style={{
                  background: 'var(--bg-surface-muted)',
                  color: 'var(--fg-muted)',
                  border: '1px solid var(--border-muted)',
                }}
                title="Tiebreaker — strongest signal in this rationale"
              >
                top
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
