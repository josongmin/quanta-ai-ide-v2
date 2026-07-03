// ─── Folder tab: Deps ─────────────────────────────────────────────────
// Folder-scoped coupling: inbound vs outbound direction, top dependency
// folders in each direction, and the per-layer breakdown of this subtree.

import { memo } from 'react';
import { EmptyHint, Stat } from '@shared/ui';
import { useTranslation } from '@shared/i18n';
import { BarRow } from '../BarRow';
import { SubCard } from '../parts/TabPanel';
import { DepRow, type FolderStats } from './shared';

export const DepsTab = memo(function DepsTab({
  stats, isDark,
}: {
  stats: FolderStats;
  isDark: boolean;
}) {
  const { t } = useTranslation('inspect');
  const layerMax = Math.max(1, ...Object.values(stats.byLayer));
  // Coupling ratio: how directional is this folder's relationship to the rest
  // of the codebase? > 1 means it consumes more than it provides (leaf-ish);
  // < 1 means it's a hub that everyone imports from.
  const totalEdges = stats.inboundEdges + stats.outboundEdges;
  return (
    <div className="space-y-4">
      <SubCard title={t('section.coupling')}>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          <Stat label={t('stat.inboundLabel')} sublabel={t('stat.inboundSub')} value={stats.inboundEdges} isDark={isDark} />
          <Stat label={t('stat.outboundLabel')} sublabel={t('stat.outboundSub')} value={stats.outboundEdges} isDark={isDark} />
          <Stat label={t('stat.avgBlastRadius')} value={stats.avgBlast} isDark={isDark} />
          <Stat label={t('stat.totalEdges')} value={totalEdges} isDark={isDark} />
        </div>
        {totalEdges > 0 && (
          <div className="mt-2">
            {/* Two-direction ratio bar — shows at a glance whether this
                folder is a sink (mostly inbound) or a leaf (mostly outbound).
                Neutral grays so the viewer reads *direction*, not severity. */}
            <div className="flex w-full h-1.5 rounded-full overflow-hidden bg-[var(--bg-hover)]">
              <div
                style={{
                  width: `${(stats.inboundEdges / totalEdges) * 100}%`,
                  background: 'var(--fg-muted)',
                }}
                className="h-full"
              />
              <div
                style={{
                  width: `${(stats.outboundEdges / totalEdges) * 100}%`,
                  background: 'var(--fg-subtle)',
                }}
                className="h-full"
              />
            </div>
            <div className="flex justify-between text-2xs font-mono mt-1 text-[var(--fg-subtle)]">
              <span>{t('deps.inboundArrow')}</span>
              <span>{t('deps.outboundArrow')}</span>
            </div>
          </div>
        )}
      </SubCard>

      <SubCard title={t('section.outbound')} subtitle={t('subtitle.topFoldersDependsOn')}>
        {stats.depFolders.length === 0 ? (
          <EmptyHint text={t('empty.noOutbound')} />
        ) : (
          <div className="space-y-1">
            {stats.depFolders.map((d) => (
              <DepRow key={d.path} path={d.path} n={d.n} dir="out" />
            ))}
          </div>
        )}
      </SubCard>

      <SubCard title={t('section.inbound')} subtitle={t('subtitle.topFoldersDependents')}>
        {stats.inboundFolders.length === 0 ? (
          <EmptyHint text={t('empty.noInbound')} />
        ) : (
          <div className="space-y-1">
            {stats.inboundFolders.map((d) => (
              <DepRow key={d.path} path={d.path} n={d.n} dir="in" />
            ))}
          </div>
        )}
      </SubCard>

      {Object.keys(stats.byLayer).length > 0 && (
        <SubCard title={t('section.layers')}>
          <div className="space-y-1">
            {Object.entries(stats.byLayer)
              .sort((a, b) => b[1] - a[1])
              .map(([layer, n]) => (
                <BarRow key={layer} label={layer} value={n} max={layerMax} isDark={isDark} />
              ))}
          </div>
        </SubCard>
      )}
    </div>
  );
});
