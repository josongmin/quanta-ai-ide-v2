// ─── Tab: Overview ────────────────────────────────────────────────────
// The "30-second read" — two hero scores, the headline counts beneath each,
// and a peek at composition. Anything deeper lives in another tab.

import { memo } from 'react';
import { useFilterRepo } from '@entities/filter-state';
import { languageHue, pct } from '@shared/lib';
import { Score, StackedRatioBar, Stat } from '@shared/ui';
import { useTranslation } from '@shared/i18n';
import { ConfidenceMeter } from '../ConfidenceMeter';
import DepsCarousel from '../DepsCarousel';
import { SubCard } from '../parts/TabPanel';
import type { RepoStats } from './shared';
import {
  AgentCapacityLine, ChipBlock, SafetyHistogram, TopOffenders, VerdictStrip,
} from './viz';

export const OverviewTab = memo(function OverviewTab({ stats, isDark }: { stats: RepoStats; isDark: boolean }) {
  const repo = useFilterRepo();
  const { t } = useTranslation('inspect');
  const untestedPct = pct(stats.untested, stats.files);
  const humanOnlyPct = pct(stats.humanOnly, stats.files);
  const autoFixablePct = pct(stats.autoFixable, stats.files);
  const langTotal = Math.max(1, Object.values(stats.byLanguage).reduce((a, b) => a + b, 0));
  const langEntries = Object.entries(stats.byLanguage).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-4">
      {/* Spec §10 — single-line "ship light". Reads first; everything else
          below is "drilling into the reason for the verdict". */}
      <VerdictStrip verdict={stats.verdict} />

      <SubCard title={t('section.seHealth')}>
        <Score label={t('stat.maintainability')} value={stats.maintainability} isDark={isDark} hero
               trend={stats.maintTrend} />
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
        {stats.churnHotspots.length > 0 && (
          <TopOffenders
            title={t('topOffenders')}
            rows={stats.churnHotspots.slice(0, 3).map((h) => ({
              path: `${h.path}/${h.name}`,
              meta: `cx ${h.complexity} · churn ${h.churn.toFixed(2)}`,
            }))}
          />
        )}
      </SubCard>

      <SubCard title={t('section.dependencies')}>
        {/* Eight-view carousel: edge bundling, layer view, DSM matrix,
            sunburst, top-coupling chord, treemap, risk heatmap, cycles.
            Each slide answers a different question about the same graph. */}
        <DepsCarousel repo={repo} isDark={isDark} size={260} />
      </SubCard>

      <SubCard title={t('section.aiEfficiency')}>
        <Score label={t('stat.editSafety')} value={stats.avgEditSafety} isDark={isDark} hero diverging />

        {/* Histogram replaces "two stat boxes" — same data, but as a
            distribution it answers "where is most of the work?" in one read. */}
        <SafetyHistogram bins={stats.safetyBins} total={stats.files} />

        {/* Agent-capacity sentence: the takeaway in plain English. */}
        <AgentCapacityLine
          autoFixable={stats.autoFixable}
          autoPct={autoFixablePct}
          humanOnly={stats.humanOnly}
          humanPct={humanOnlyPct}
          unknown={stats.confidence.unknown}
          unknownPct={pct(stats.confidence.unknown, stats.files)}
        />

        <ConfidenceMeter
          isDark={isDark}
          exact={stats.confidence.exact}
          overapprox={stats.confidence.overapprox}
          unknown={stats.confidence.unknown}
          stale={stats.confidence.stale}
          total={stats.files}
        />
      </SubCard>

      <SubCard title={t('section.stack')}>
        {langEntries.length <= 1 ? (
          <div className="flex flex-wrap gap-1.5">
            {langEntries.map(([lang, n]) => (
              <span
                key={lang}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px]"
                style={{ background: 'var(--bg-surface-muted)' }}
              >
                <span className="font-mono font-bold" style={{ color: 'var(--fg-default)' }}>{lang}</span>
                <span className="tabular-nums" style={{ color: 'var(--fg-muted)' }}>{n}</span>
                <span className="tabular-nums text-[9px]" style={{ color: 'var(--fg-subtle)' }}>
                  {Math.round((n / langTotal) * 100)}%
                </span>
              </span>
            ))}
          </div>
        ) : (
          <>
            <StackedRatioBar
              isDark={isDark}
              segments={langEntries.map(([lang, n]) => ({
                key: lang,
                n,
                hue: languageHue(lang, isDark),
              }))}
              total={langTotal}
            />
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-2">
              {langEntries.map(([lang, n]) => (
                <div key={lang} className="flex items-center gap-1.5 text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: languageHue(lang, isDark) }} />
                  <span className="flex-1" style={{ color: 'var(--fg-muted)' }}>{lang}</span>
                  <span className="tabular-nums font-bold" style={{ color: 'var(--fg-default)' }}>{n}</span>
                  <span
                    className="tabular-nums text-[9px] w-7 text-right"
                    style={{ color: 'var(--fg-subtle)' }}
                  >
                    {Math.round((n / langTotal) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Frameworks / build / manifests — the "what's actually here"
            row. Stack identification is a Spec §1 fast-map duty, and the
            reader expects a quick visual census, not a long form. */}
        <ChipBlock
          label={t('stack.frameworks')}
          items={stats.frameworks.length > 0
            ? stats.frameworks.map((f) => ({ text: f.name, tone: f.tone }))
            : [{ text: t('stack.noneDetected'), tone: 'muted' as const }]}
        />
        <ChipBlock
          label={t('stack.buildTools')}
          items={stats.buildTools.map((tool) => ({ text: tool }))}
        />
        <ChipBlock
          label={t('stack.manifests')}
          items={stats.manifests.map((m) => ({ text: m, mono: true }))}
        />

        {/* Test runner detection — the *missing* signal is the message. */}
        {stats.testRunner ? (
          <ChipBlock label={t('stack.testRunner')} items={[{ text: stats.testRunner }]} />
        ) : (
          <div
            className="mt-2 px-2 py-1.5 rounded-md text-[10px] flex items-center gap-2"
            style={{
              background: 'rgb(from var(--intent-warn-vivid) r g b / 0.12)',
              color: 'var(--intent-warn-fg)',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: 'var(--intent-warn-vivid)' }}
            />
            <span className="font-bold uppercase tracking-[var(--track-eyebrow)]">{t('stack.noTestRunner')}</span>
            <span className="ml-auto" style={{ opacity: 0.7 }}>
              {t('stack.addTestRunner')}
            </span>
          </div>
        )}
      </SubCard>
    </div>
  );
});
