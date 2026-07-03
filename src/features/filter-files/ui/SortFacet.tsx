import { useFilterFacets, useFilterActions } from '@entities/filter-state';
import { useTranslation } from '@shared/i18n';
import type { SortKey } from '@entities/repo';

const SORT_KEYS: SortKey[] = [
  'none',
  'loc-desc',
  'complexity-desc',
  'cognitive-desc',
  'maintainability-asc',
  'fanIn-desc',
  'fanOut-desc',
  'churn-desc',
  'pagerank-desc',
  'coverage-asc',
  'eslint-desc',
  'anyCount-desc',
  'todo-desc',
  'authors-desc',
  'staleness-desc',
];

// Narrowing guard — keeps the cast out of the JSX. If a stray DOM value
// ever sneaks through (browser autofill, devtools edit), we fall back to
// 'none' rather than feeding the store an unexpected union member.
function isSortKey(v: string): v is SortKey {
  return (SORT_KEYS as readonly string[]).includes(v);
}

export default function SortFacet() {
  const { t } = useTranslation('filter');
  const { state } = useFilterFacets();
  const { setSort, setTopN } = useFilterActions();
  return (
    <div className="space-y-2.5">
      <select
        value={state.sort}
        onChange={(e) => {
          const v = e.target.value;
          setSort(isSortKey(v) ? v : 'none');
        }}
        className="w-full rounded-xl text-sm px-3 py-2 focus:outline-none transition-colors border bg-[color:var(--bg-surface-muted)] border-[color:var(--border-default)] text-[color:var(--fg-default)] focus:border-[color:var(--border-strong)]"
      >
        {SORT_KEYS.map((k) => <option key={k} value={k}>{t(`sort.options.${k}`)}</option>)}
      </select>
      {state.sort !== 'none' && (
        <div className="flex items-center justify-between text-xs text-[color:var(--fg-muted)]">
          <span className="uppercase tracking-eyebrow font-bold">{t('sort.glowTop')}</span>
          <select
            value={state.topNHighlight}
            onChange={(e) => { setTopN(+e.target.value); }}
            className="rounded-md px-2 py-1 text-xs focus:outline-none bg-[color:var(--bg-surface-muted)] border border-[color:var(--border-default)] text-[color:var(--fg-strong)]"
          >
            <option value={0}>{t('sort.off')}</option>
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
      )}
    </div>
  );
}
