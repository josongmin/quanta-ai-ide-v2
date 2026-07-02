// ─── Tab: Activity ────────────────────────────────────────────────────
// Time-axis view. Answers "is this repo alive, and where is the work
// happening right now?"

import { memo } from 'react';
import { pct } from '@shared/lib';
import { EmptyHint, FileRow, Stat } from '@shared/ui';
import { useTranslation } from '@shared/i18n';
import { BarRow } from '../BarRow';
import { SubCard } from '../parts/TabPanel';
import type { RepoStats } from './shared';

export const ActivityTab = memo(function ActivityTab({ stats, isDark }: { stats: RepoStats; isDark: boolean }) {
  const { t } = useTranslation('inspect');
  const activePct = pct(stats.activeRecent, stats.files);
  const stalePct = pct(stats.staleFiles, stats.files);
  return (
    <div className="space-y-4">
      <SubCard title={t('section.pulse')}>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          <Stat label={t('stat.lastTouch')} value={t('stat.lastTouchAgo', { days: stats.minDaysSince })} isDark={isDark} />
          <Stat label={t('stat.prs30d')} value={stats.totalRecentPRs} isDark={isDark} />
          <Stat label={t('stat.avgChurn')} value={stats.avgChurn.toFixed(2)} isDark={isDark}
                tone={stats.avgChurn > 0.4 ? 'warn' : 'neutral'} />
          <Stat label={t('stat.busFactor1')} value={stats.busFactor1} isDark={isDark}
                tone={stats.busFactor1 > stats.files * 0.3 ? 'warn' : 'neutral'} />
        </div>
        <div
          className="mt-2 pt-2 border-t border-dashed space-y-1.5"
          style={{ borderColor: 'var(--border-muted)' }}
        >
          <Stat label={t('stat.activeFiles')} sublabel={t('stat.activeFilesSub')} value={stats.activeRecent} suffix={`${activePct}%`}
                isDark={isDark} />
          <Stat label={t('stat.staleFiles')} sublabel={t('stat.staleFilesSub')} value={stats.staleFiles} suffix={`${stalePct}%`}
                isDark={isDark} tone={stalePct > 40 ? 'warn' : 'neutral'} />
        </div>
      </SubCard>

      <SubCard title={t('section.recentHotspots')} subtitle={t('subtitle.highChurnComplexity')}>
        {stats.churnHotspots.length === 0 ? (
          <EmptyHint text={t('empty.noHotspots')} />
        ) : (
          <div className="space-y-1.5">
            {stats.churnHotspots.map((h) => (
              <FileRow
                key={h.id}
                isDark={isDark}
                name={h.name}
                path={h.path}
                metrics={[
                  { label: 'churn', value: h.churn.toFixed(2), tone: h.churn > 0.5 ? 'warn' : 'neutral' },
                  { label: 'cx', value: h.complexity, tone: h.complexity >= 30 ? 'warn' : 'neutral' },
                  { label: 'auth', value: h.authors, tone: h.authors === 1 ? 'warn' : 'neutral' },
                ]}
              />
            ))}
          </div>
        )}
      </SubCard>

      <SubCard title={t('section.topOwners')}>
        <div className="space-y-1">
          {stats.topOwners.map((o) => (
            <BarRow
              key={o.owner}
              label={o.owner}
              value={o.n}
              max={Math.max(1, ...stats.topOwners.map((x) => x.n))}
              isDark={isDark}
              mono
            />
          ))}
        </div>
      </SubCard>
    </div>
  );
});
