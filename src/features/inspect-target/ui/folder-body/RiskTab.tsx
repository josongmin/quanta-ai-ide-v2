// ─── Folder tab: Risk ─────────────────────────────────────────────────
// Folder-scoped defects + quality debt + the worst edit-safety files.

import { memo } from 'react';
import { pct } from '@shared/lib';
import { EmptyHint, FileRow, Stat } from '@shared/ui';
import { useTranslation } from '@shared/i18n';
import { SubCard } from '../parts/TabPanel';
import type { FolderStats } from './shared';

export const RiskTab = memo(function RiskTab({
  stats, isDark,
}: {
  stats: FolderStats;
  isDark: boolean;
}) {
  const { t } = useTranslation('inspect');
  const totalRisk = stats.vulnerable + stats.cyclic + stats.layerViolations;
  return (
    <div className="space-y-4">
      <SubCard title={t('section.structuralDefects')} subtitle={t('subtitle.blockSafeAutomation')}>
        <div className="space-y-1">
          <Stat label={t('stat.vulnerableFiles')} value={stats.vulnerable} isDark={isDark}
                tone={stats.vulnerable > 0 ? 'critical' : 'neutral'} />
          <Stat label={t('stat.inCycle')} value={stats.cyclic} suffix={t('focus.filesUnit')} isDark={isDark}
                tone={stats.cyclic > 0 ? 'critical' : 'neutral'} />
          <Stat label={t('stat.layerViolations')} value={stats.layerViolations} isDark={isDark}
                tone={stats.layerViolations > 0 ? 'critical' : 'neutral'} />
        </div>
        {totalRisk === 0 && (
          <div className="mt-1.5 text-[10px] italic text-[var(--fg-subtle)]">
            {t('empty.noStructuralDefects')}
          </div>
        )}
      </SubCard>

      <SubCard title={t('section.qualityDebt')} subtitle={t('subtitle.thresholdMisses')}>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          <Stat label={t('stat.hotspots')} value={stats.hotspots} isDark={isDark}
                tone={stats.hotspots > 10 ? 'warn' : 'neutral'} />
          <Stat label={t('stat.typeLoose')} value={stats.typeLoose} isDark={isDark}
                tone={stats.typeLoose > stats.totalFiles * 0.15 ? 'warn' : 'neutral'} />
          <Stat label={t('stat.deadCode')} value={stats.dead} isDark={isDark}
                tone={stats.dead > 5 ? 'warn' : 'neutral'} />
          <Stat label={t('stat.untested')} value={stats.untested} isDark={isDark}
                tone={pct(stats.untested, stats.totalFiles) > 30 ? 'warn' : 'neutral'} />
        </div>
      </SubCard>

      <SubCard title={t('section.lowestEditSafety')} subtitle={t('subtitle.worst5StartHere')}>
        {stats.riskFiles.length === 0 ? (
          <EmptyHint text={t('empty.noRiskyFiles')} />
        ) : (
          <div className="space-y-1.5">
            {stats.riskFiles.map((f) => (
              <FileRow
                key={f.id}
                isDark={isDark}
                name={f.name}
                path={f.path}
                alert={f.vulnerable}
                metrics={[
                  { label: 'safety', value: f.safety, tone: f.safety < 40 ? 'critical' : f.safety < 70 ? 'warn' : 'neutral' },
                  { label: 'blast', value: f.blast, tone: f.blast > 20 ? 'warn' : 'neutral' },
                ]}
              />
            ))}
          </div>
        )}
      </SubCard>
    </div>
  );
});
