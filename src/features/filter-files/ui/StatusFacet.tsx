import { useMemo } from 'react';
import { useFilterStore } from '../model/FilterContext';
import { useTheme } from '@shared/theme';
import { useTranslation } from '@shared/i18n';
import { STATUS_CSS, type StatusKey } from '@entities/repo';

const ORDER: StatusKey[] = ['STABLE', 'MODIFIED', 'NEW', 'SECURITY_ALERT'];

export default function StatusFacet() {
  const { isDark } = useTheme();
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
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] transition-colors ${
              selected
                ? (isDark ? 'bg-white text-black border-white' : 'bg-black text-white border-black')
                : (isDark ? 'bg-white/5 border-white/5 text-white/70 hover:bg-white/10' : 'bg-black/5 border-black/5 text-black/70 hover:bg-black/10')
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-sm shrink-0" style={{ backgroundColor: STATUS_CSS[s] }} />
            <span className="font-bold uppercase tracking-[0.18em]">{t(`status.${s}`)}</span>
            <span className={`text-[9px] tabular-nums font-mono ${
              selected ? 'opacity-70' : isDark ? 'text-white/40' : 'text-black/40'
            }`}>
              {counts.m[s]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
