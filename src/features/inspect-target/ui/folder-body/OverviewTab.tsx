// ─── Folder tab: Overview ─────────────────────────────────────────────
// Folder-scoped "30-second read": contents census, SE health, AI edit
// efficiency, and the language stack for this subtree.

import { memo } from 'react';
import type { FolderRecord } from '@entities/repo';
import { languageHue, pct } from '@shared/lib';
import { Score, StackedRatioBar, Stat } from '@shared/ui';
import { useTranslation, formatNumber } from '@shared/i18n';
import { ConfidenceMeter } from '../ConfidenceMeter';
import { SubCard } from '../parts/TabPanel';
import type { FolderStats } from './shared';

export const OverviewTab = memo(function OverviewTab({
  stats, folder, isDark,
}: {
  stats: FolderStats;
  folder: FolderRecord;
  isDark: boolean;
}) {
  const { t } = useTranslation('inspect');
  const untestedPct = pct(stats.untested, stats.totalFiles);
  const humanOnlyPct = pct(stats.humanOnly, stats.totalFiles);
  const langTotal = Math.max(1, Object.values(stats.byLanguage).reduce((a, b) => a + b, 0));
  const langEntries = Object.entries(stats.byLanguage).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-4">
      <SubCard title={t('section.contents')}>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          <Stat label={t('stat.directFiles')} value={stats.directFiles} isDark={isDark} />
          <Stat label={t('stat.recursive')} value={stats.totalFiles} isDark={isDark} />
          <Stat label={t('stat.subfolders')} value={folder.childPaths.length} isDark={isDark} />
          <Stat label={t('stat.totalLoc')} value={formatNumber(stats.totalLoc)} isDark={isDark} />
        </div>
      </SubCard>

      <SubCard title={t('section.seHealth')}>
        <Score label={t('stat.maintainability')} value={stats.maintainability} isDark={isDark} hero />
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-1">
          <Stat label={t('stat.avgComplexity')} value={stats.avgComplexity} isDark={isDark}
                tone={stats.avgComplexity >= 25 ? 'warn' : 'neutral'} />
          <Stat label={t('stat.avgCoverage')} value={`${stats.avgCoverage}%`} isDark={isDark}
                tone={stats.avgCoverage < 50 ? 'warn' : 'neutral'} />
          <Stat label={t('stat.filesWithoutTests')} value={stats.untested} suffix={`${untestedPct}%`}
                isDark={isDark} tone={untestedPct > 30 ? 'warn' : 'neutral'} />
          <Stat label={t('stat.vulnerable')} value={stats.vulnerable} isDark={isDark}
                tone={stats.vulnerable > 0 ? 'critical' : 'neutral'} />
        </div>
      </SubCard>

      <SubCard title={t('section.aiEfficiency')}>
        <Score label={t('stat.editSafety')} value={stats.avgEditSafety} isDark={isDark} hero diverging />
        <ConfidenceMeter
          isDark={isDark}
          exact={stats.confidence.exact}
          overapprox={stats.confidence.overapprox}
          unknown={stats.confidence.unknown}
          stale={stats.confidence.stale}
          total={stats.totalFiles}
        />
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
          <Stat label={t('stat.autoFixable')} value={stats.autoFixable}
                suffix={`${pct(stats.autoFixable, stats.totalFiles)}%`}
                isDark={isDark}
                tone={pct(stats.autoFixable, stats.totalFiles) >= 50 ? 'ok' : 'neutral'} />
          <Stat label={t('stat.humanOnly')} value={stats.humanOnly} suffix={`${humanOnlyPct}%`}
                isDark={isDark} tone={humanOnlyPct > 25 ? 'warn' : 'neutral'} />
        </div>
      </SubCard>

      {langEntries.length > 0 && (
        <SubCard title={t('section.stack')}>
          {langEntries.length <= 1 ? (
            <div className="flex flex-wrap gap-1.5">
              {langEntries.map(([lang, n]) => (
                <span
                  key={lang}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs bg-[var(--bg-hover)]"
                >
                  <span className="font-mono font-bold text-[var(--fg-strong)]">{lang}</span>
                  <span className="tabular-nums text-[var(--fg-muted)]">{n}</span>
                  <span className="tabular-nums text-2xs text-[var(--fg-subtle)]">
                    {Math.round((n / langTotal) * 100)}%
                  </span>
                </span>
              ))}
            </div>
          ) : (
            <>
              <StackedRatioBar
                isDark={isDark}
                segments={langEntries.map(([lang, n]) => ({ key: lang, n, hue: languageHue(lang, isDark) }))}
                total={langTotal}
              />
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-2">
                {langEntries.map(([lang, n]) => (
                  <div key={lang} className="flex items-center gap-1.5 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: languageHue(lang, isDark) }} />
                    <span className="flex-1 text-[var(--fg-muted)]">{lang}</span>
                    <span className="tabular-nums font-bold text-[var(--fg-strong)]">{n}</span>
                    <span className="tabular-nums text-2xs w-7 text-right text-[var(--fg-subtle)]">
                      {Math.round((n / langTotal) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </SubCard>
      )}
    </div>
  );
});
