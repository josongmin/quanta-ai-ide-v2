import { useMemo } from 'react';
import { useFilterStore } from '@entities/filter-state';
import { useTranslation } from '@shared/i18n';
import { STATUS_CSS, type StatusKey } from '@entities/repo';

const ORDER: StatusKey[] = ['STABLE', 'MODIFIED', 'NEW', 'SECURITY_ALERT'];

export default function StatusFacet() {
  const { t } = useTranslation('filter');
  // Narrow selectors — reading the four fields we actually use avoids a
  // re-render on every unrelated facet/range change.
  const repo = useFilterStore((s) => s.repo);
  const statuses = useFilterStore((s) => s.state.statuses);
  const matched = useFilterStore((s) => s.matched);
  const toggleStatus = useFilterStore((s) => s.toggleStatus);

  const counts = useMemo(() => {
    const total: Record<StatusKey, number> = { STABLE: 0, MODIFIED: 0, NEW: 0, SECURITY_ALERT: 0 };
    const m: Record<StatusKey, number> = { STABLE: 0, MODIFIED: 0, NEW: 0, SECURITY_ALERT: 0 };
    for (const f of repo.files) {
      total[f.status]++;
      if (matched[f.id]) m[f.status]++;
    }
    return { total, m };
  }, [repo, matched]);

  return (
    // Single dense row: dot + label + count chip per status. Each pill
    // collapses to a count badge on the right so the four entries fit on
    // one line at the panel's 296 px width.
    <div className="flex flex-wrap gap-1">
      {ORDER.map((s) => {
        const selected = statuses.has(s);
        return (
          <button type="button"
            key={s}
            onClick={() => { toggleStatus(s); }}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs transition-colors ${
              selected
                ? 'bg-[color:var(--fg-strong)] text-[color:var(--bg-surface)] border-[color:var(--fg-strong)]'
                : 'bg-[color:var(--bg-surface-muted)] border-[color:var(--border-muted)] text-[color:var(--fg-default)] hover:bg-[color:var(--bg-active)]'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-sm shrink-0" style={{ backgroundColor: STATUS_CSS[s] }} />
            <span className="font-bold uppercase tracking-eyebrow">{t(`status.${s}`)}</span>
            <span className={`text-2xs tabular-nums font-mono ${
              selected ? 'opacity-70' : 'text-[color:var(--fg-subtle)]'
            }`}>
              {counts.m[s]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
