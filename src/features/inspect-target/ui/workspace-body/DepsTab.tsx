// ─── Tab: Deps ────────────────────────────────────────────────────────

import { memo, useMemo } from 'react';
import { Stat } from '@shared/ui';
import { useTranslation, formatNumber } from '@shared/i18n';
import { BarRow } from '../BarRow';
import { SubCard } from '../parts/TabPanel';
import type { RepoStats } from './shared';

export const DepsTab = memo(function DepsTab({ stats, isDark }: { stats: RepoStats; isDark: boolean }) {
  const { t } = useTranslation('inspect');
  const layerMax = Math.max(1, ...Object.values(stats.byLayer));
  const sortedLayers = useMemo(
    () => Object.entries(stats.byLayer).sort((a, b) => b[1] - a[1]),
    [stats.byLayer],
  );
  return (
    <div className="space-y-4">
      <SubCard title={t('section.topology')}>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          <Stat label={t('stat.edges')} sublabel={t('stat.edgesSub')} value={formatNumber(stats.edges)} isDark={isDark} />
          <Stat label={t('stat.avgFanOut')} value={stats.avgFanOut} isDark={isDark} />
          <Stat label={t('stat.avgBlastRadius')} value={stats.avgBlast} isDark={isDark} />
          <Stat label={t('stat.maxFanIn')} value={stats.maxFanIn.n}
                suffix={stats.maxFanIn.name} isDark={isDark} />
        </div>
        <div
          className="mt-2 pt-2 border-t border-dashed space-y-1"
          style={{ borderColor: 'var(--border-muted)' }}
        >
          <Stat label={t('stat.inCycle')} value={stats.cyclic} suffix={t('focus.filesUnit')} isDark={isDark}
                tone={stats.cyclic > 0 ? 'critical' : 'neutral'} />
          <Stat label={t('stat.layerViolations')} value={stats.layerViolations} isDark={isDark}
                tone={stats.layerViolations > 0 ? 'critical' : 'neutral'} />
          <Stat label={t('stat.deadCode')} value={stats.dead} isDark={isDark}
                tone={stats.dead > 5 ? 'warn' : 'neutral'} />
        </div>
      </SubCard>

      <SubCard title={t('section.layers')}>
        <div className="space-y-1">
          {sortedLayers.map(([layer, n]) => (
            <BarRow key={layer} label={layer} value={n} max={layerMax} isDark={isDark} />
          ))}
        </div>
      </SubCard>
    </div>
  );
});
