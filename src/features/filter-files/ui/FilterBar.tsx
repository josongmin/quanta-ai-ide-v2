import { useRef } from 'react';
import { ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { GlassCard, SectionHeader } from '@shared/ui';
import { useTheme } from '@shared/theme';
import { useTranslation } from '@shared/i18n';
import FolderTree, { type FolderTreeHandle } from './FolderTree';
import StatusFacet from './StatusFacet';
import SortFacet from './SortFacet';
import ProjectSelector from './ProjectSelector';
import CategorySection from './CategorySection';
import { CATEGORIES } from '@entities/facet';

// Open handlers are threaded from the host (typically the route component
// that owns the inspect stack). Keeping the tree dumb means filter-files
// no longer reaches into inspect-target.
export type FilterBarProps = {
  onOpenFolder?: (path: string) => void;
  onOpenFile?: (id: number) => void;
  activeKey?: string | null;
};

export default function FilterBar({ onOpenFolder, onOpenFile, activeKey }: FilterBarProps = {}) {
  const { t } = useTranslation('filter');
  const { isDark } = useTheme();
  const treeRef = useRef<FolderTreeHandle>(null);

  return (
    <aside className="w-full h-full min-h-0 z-30 flex flex-col shrink-0">
      {/* Scroll rail owns its own vertical breathing room so the panel can
          stay flush to the viewport while content still has top/bottom pad. */}
      <div className="flex-1 overflow-y-auto scrollbar-hide space-y-2 py-3">
        <ProjectSelector />

        {/* Files card. The header carries IDE-style tree controls (expand
            all / collapse all). */}
        <GlassCard className="px-3 py-2.5" style={{ boxShadow: 'none' }}>
          <div className="flex items-center justify-between gap-2 mb-1.5 px-0.5">
            <h3 className={`text-[10px] font-black uppercase tracking-[0.18em] ${isDark ? 'text-white/70' : 'text-black/55'}`}>
              {t('section.files')}
            </h3>
            <TreeToolbar
              isDark={isDark}
              onExpandAll={() => treeRef.current?.expandAll()}
              onCollapseAll={() => treeRef.current?.collapseAll()}
            />
          </div>
          <div className="max-h-[280px] overflow-y-auto overflow-x-hidden scrollbar-hide -mx-1 pr-1">
            <FolderTree
              ref={treeRef}
              onOpenFolder={onOpenFolder}
              onOpenFile={onOpenFile}
              activeKey={activeKey}
            />
          </div>
        </GlassCard>

        <GlassCard className="px-3 py-2.5" style={{ boxShadow: 'none' }}>
          <SectionHeader title={t('section.status')} />
          <StatusFacet />
        </GlassCard>

        {CATEGORIES.map((c) => (
          <CategorySection key={c.key} category={c.key} />
        ))}

        <GlassCard className="px-3 py-2.5" style={{ boxShadow: 'none' }}>
          <SectionHeader title={t('section.sortAndHighlight')} />
          <SortFacet />
        </GlassCard>
      </div>
    </aside>
  );
}

function TreeToolbar({
  isDark, onExpandAll, onCollapseAll,
}: { isDark: boolean; onExpandAll: () => void; onCollapseAll: () => void }) {
  const { t } = useTranslation('filter');
  const btn = (
    isDark
      ? 'text-white/40 hover:text-white/85 hover:bg-white/5'
      : 'text-black/40 hover:text-black/70 hover:bg-black/5'
  );
  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={onExpandAll}
        title={t('tree.expandAll')}
        aria-label={t('tree.expandAll')}
        className={`p-1 rounded-md transition-colors ${btn}`}
      >
        <ChevronsUpDown className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={onCollapseAll}
        title={t('tree.collapseAll')}
        aria-label={t('tree.collapseAll')}
        className={`p-1 rounded-md transition-colors ${btn}`}
      >
        <ChevronsDownUp className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
