import { ChevronDown } from 'lucide-react';
import { GlassCard } from '@shared/ui';
import FacetRenderer from './FacetRenderer';
import { facetsByCategory } from '@entities/facet';
import { usePrefs } from '@features/tweak-prefs';
import type { FacetCategoryKey } from '@entities/facet';
import { useTheme } from '@shared/theme';
import { useTranslation } from '@shared/i18n';

type Props = { category: FacetCategoryKey };

export default function CategorySection({ category }: Props) {
  const prefs = usePrefs();
  const { isDark } = useTheme();
  const { t } = useTranslation('filter');
  const facets = facetsByCategory(category);
  const visibleFacets = facets.filter((f) => prefs.isVisible(f));
  const lockedFacets = facets.filter((f) => !prefs.isUnlocked(f));
  const collapsed = prefs.collapsedCategories.has(category);

  // Hide empty (everything user-hidden, nothing locked to show)
  if (visibleFacets.length === 0 && lockedFacets.length === 0) return null;

  return (
    <GlassCard className="px-3 py-2.5" style={{ boxShadow: 'none' }}>
      <button type="button"
        onClick={() => { prefs.toggleCategoryCollapsed(category); }}
        className="w-full flex items-center justify-between mb-1.5 group"
      >
        <div className="flex items-center gap-2">
          <h3 className={`text-[10px] font-black uppercase tracking-[0.18em] ${
            isDark ? 'text-white/70' : 'text-black/55'
          }`}>{t(`category.${category}`)}</h3>
          <span className="text-[8px] tabular-nums text-[color:var(--fg-subtle)]">
            {visibleFacets.length}{lockedFacets.length > 0 && <span> + {lockedFacets.length}🔒</span>}
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform text-[color:var(--fg-subtle)] ${collapsed ? '-rotate-90' : ''}`}
        />
      </button>
      {!collapsed && (
        <div>
          {visibleFacets.map((f) => <FacetRenderer key={f.key} facet={f} />)}
          {lockedFacets.map((f) => <FacetRenderer key={f.key} facet={f} />)}
        </div>
      )}
    </GlassCard>
  );
}
