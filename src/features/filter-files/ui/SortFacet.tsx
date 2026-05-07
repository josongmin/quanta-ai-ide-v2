import { useFilterFacets, useFilterActions } from '../model/FilterContext';
import { useTheme } from '@shared/theme';
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
  const { isDark } = useTheme();
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
        className={`w-full rounded-xl text-[11px] px-3 py-2 focus:outline-none transition-colors border ${
          isDark
            ? 'bg-white/5 border-white/10 text-white/85 focus:border-white/30'
            : 'bg-black/5 border-black/10 text-black/85 focus:border-black/30'
        }`}
      >
        {SORT_KEYS.map((k) => <option key={k} value={k}>{t(`sort.options.${k}`)}</option>)}
      </select>
      {state.sort !== 'none' && (
        <div className={`flex items-center justify-between text-[10px] ${isDark ? 'text-white/55' : 'text-black/55'}`}>
          <span className="uppercase tracking-[0.18em] font-bold">{t('sort.glowTop')}</span>
          <select
            value={state.topNHighlight}
            onChange={(e) => { setTopN(+e.target.value); }}
            className={`rounded-md px-2 py-1 text-[10px] focus:outline-none ${
              isDark ? 'bg-white/5 border border-white/10 text-white' : 'bg-black/5 border border-black/10 text-black'
            }`}
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
