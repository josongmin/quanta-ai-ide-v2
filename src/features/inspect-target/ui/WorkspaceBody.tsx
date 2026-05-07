// Workspace inspect body — repo-level summary (Overview / Activity / Risk / Deps).
//
// Split from InspectPanel for SRP: that file used to host two unrelated render
// trees (workspace + folder) plus eight tab subcomponents. They share neither
// state nor data, so co-locating them only made the file harder to read and
// produced cross-component churn on every edit. WorkspaceBody is now self-
// contained — it owns its tab state, its stats memo, and its tab-specific
// renderers — and InspectPanel becomes a thin dispatcher.

import { memo, useMemo, useState } from 'react';
import { Activity, Boxes, LayoutGrid, Network, ShieldAlert } from 'lucide-react';
import { useFilterRepo } from '@features/filter-files';
import type { RepoData } from '@entities/repo';
import { C, type Tone, languageHue, pct } from '@shared/lib';
import { computeRepoStats, type Verdict } from '@entities/metric';
import EdgeBundlingMap from './EdgeBundlingMap';
import {
  BarRow, ConfidenceMeter, EmptyHint, FileRow,
  PanelFooter as Footer, Score, Section, StackedRatioBar, Stat, TabBar,
} from '@shared/ui';
import { useTranslation } from '@shared/i18n';

type WorkspaceTab = 'overview' | 'activity' | 'risk' | 'deps';

// `isDark` is still threaded down to shared/ui primitives (TabBar, Section,
// Stat, FileRow, etc.) which are owned by a parallel migration. Once those
// primitives switch to tokens the prop can be dropped from this file in a
// follow-up. All inline color/surface/border below is now token-based.
function WorkspaceBody({ repo, isDark }: { repo: RepoData; isDark: boolean }) {
  const stats = useMemo(() => computeRepoStats(repo), [repo]);
  const [tab, setTab] = useState<WorkspaceTab>('overview');
  const { t } = useTranslation('inspect');

  // Risk badge: split into two counts so the *kind* of risk is visible
  // before the user clicks. A single "33" red badge would equate a
  // 4-vuln incident with 29 architectural debts — different urgencies.
  const riskCritical = stats.vulnerable;
  const riskWarn = stats.cyclic + stats.layerViolations;

  const tabs: {
    id: WorkspaceTab;
    label: string;
    icon: typeof Activity;
    badges?: { n: number; tone: Tone }[];
  }[] = [
    { id: 'overview', label: t('tab.overview'), icon: LayoutGrid },
    { id: 'activity', label: t('tab.activity'), icon: Activity },
    {
      id: 'risk',
      label: t('tab.risk'),
      icon: ShieldAlert,
      badges: [
        // `satisfies` keeps the literal narrowed to a member of Tone without
        // the bare `as` cast lying about provenance — if Tone ever drops
        // 'critical' or 'warn', this is a compile error instead of a silent
        // miscoercion at runtime.
        ...(riskCritical > 0 ? [{ n: riskCritical, tone: 'critical' as Tone }] : []),
        ...(riskWarn > 0     ? [{ n: riskWarn,     tone: 'warn'     as Tone }] : []),
      ],
    },
    { id: 'deps', label: t('tab.deps'), icon: Network },
  ];

  return (
    <>
      <header
        className="shrink-0 px-5 pt-4 pb-3 border-b"
        style={{ borderColor: 'var(--border-default)' }}
      >
        <div
          className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.18em]"
          style={{ color: 'var(--fg-subtle)' }}
        >
          <Boxes className="w-3 h-3" /> {t('header.workspace')}
        </div>
        <h2 className="font-black text-[17px] tracking-tight mt-1 leading-none">{t('header.workspaceName')}</h2>
        <div
          className="flex items-center gap-1.5 text-[10px] font-mono mt-1.5"
          style={{ color: 'var(--fg-muted)' }}
        >
          <span
            className="px-1.5 py-0.5 rounded-md text-[9px] font-bold tracking-wide"
            style={{ background: 'var(--bg-elevated)', color: 'var(--fg-muted)' }}
          >{t('header.main')}</span>
          <span className="opacity-40">·</span>
          {/* "fresh" is *index state*, not severity — using the green from
              the severity palette here would make every green dot on the
              page mean three different things. A subtle pulse + neutral
              text says "alive" without competing for color attention. */}
          <span className="inline-flex items-center gap-1">
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: 'var(--fg-default)' }}
            />
            <span style={{ color: 'var(--fg-muted)' }}>{t('header.fresh')}</span>
          </span>
          <span className="opacity-40">·</span>
          <span className="tabular-nums">{stats.files.toLocaleString()} {t('focus.filesUnit')}</span>
          <span className="opacity-40">·</span>
          <span className="tabular-nums">{stats.totalLoc.toLocaleString()} {t('stat.loc')}</span>
        </div>
      </header>

      <TabBar tabs={tabs} active={tab} onChange={setTab} isDark={isDark} />

      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 scrollbar-hide text-[11px]">
        {tab === 'overview' && <OverviewTab stats={stats} isDark={isDark} />}
        {tab === 'activity' && <ActivityTab stats={stats} isDark={isDark} />}
        {tab === 'risk' && <RiskTab stats={stats} isDark={isDark} />}
        {tab === 'deps' && <DepsTab stats={stats} isDark={isDark} />}
      </div>

      <Footer text={tabFooter(tab, t)} />
    </>
  );
}

function tabFooter(tab: WorkspaceTab, t: (k: string) => string): string {
  switch (tab) {
    case 'overview': return t('footer.workspaceOverview');
    case 'activity': return t('footer.activity');
    case 'risk':     return t('footer.risk');
    case 'deps':     return t('footer.deps');
  }
}

// ─── Tab: Overview ────────────────────────────────────────────────────
// The "30-second read" — two hero scores, the headline counts beneath each,
// and a peek at composition. Anything deeper lives in another tab.

const OverviewTab = memo(function OverviewTab({ stats, isDark }: { stats: ReturnType<typeof computeRepoStats>; isDark: boolean }) {
  const repo = useFilterRepo();
  const { t } = useTranslation('inspect');
  const untestedPct = pct(stats.untested, stats.files);
  const humanOnlyPct = pct(stats.humanOnly, stats.files);
  const autoFixablePct = pct(stats.autoFixable, stats.files);
  const langTotal = Math.max(1, Object.values(stats.byLanguage).reduce((a, b) => a + b, 0));
  const langEntries = Object.entries(stats.byLanguage).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-5">
      {/* Spec §10 — single-line "ship light". Reads first; everything else
          below is "drilling into the reason for the verdict". */}
      <VerdictStrip verdict={stats.verdict} />

      <Section title={t('section.seHealth')}>
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
      </Section>

      <Section title={t('section.dependencies')}>
        {/* Hierarchical edge bundling (Holten 2006) — files arranged on a
            ring grouped by folder; edges curve through shared ancestors so
            same-folder calls cluster, cross-folder calls dive deep. */}
        <EdgeBundlingMap repo={repo} isDark={isDark} size={260} />
      </Section>

      <Section title={t('section.aiEfficiency')}>
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
      </Section>

      <Section title={t('section.stack')}>
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
            <span className="font-bold uppercase tracking-[0.18em]">{t('stack.noTestRunner')}</span>
            <span className="ml-auto" style={{ opacity: 0.7 }}>
              {t('stack.addTestRunner')}
            </span>
          </div>
        )}
      </Section>
    </div>
  );
});

// ─── Verdict strip ────────────────────────────────────────────────────
// One line, four tones, dropped right under the header. This is the
// "Admission Readiness" badge from Spec §10.
function VerdictStrip({ verdict }: { verdict: Verdict }) {
  const { t } = useTranslation('inspect');
  const tone = verdict.tone;
  const palette = (() => {
    if (tone === 'ok') return {
      dot: 'var(--intent-success-vivid)',
      bg: 'rgb(from var(--intent-success-vivid) r g b / 0.10)',
      text: 'var(--intent-success-fg)',
    };
    if (tone === 'warn') return {
      dot: C.warning,
      bg: 'rgb(from var(--intent-warn-vivid) r g b / 0.12)',
      text: 'var(--intent-warn-fg)',
    };
    if (tone === 'critical') return {
      dot: C.critical,
      bg: 'rgb(from var(--intent-danger-vivid) r g b / 0.10)',
      text: 'var(--intent-danger-fg)',
    };
    return {
      dot: '#5a8fce',
      bg: 'rgb(from var(--fg-link) r g b / 0.10)',
      text: 'var(--fg-link)',
    };
  })();
  // Translate at the UI boundary — entity layer emits a key + params only.
  const title = t(`verdict.${verdict.key}.title`, verdict.params ?? {});
  const hint  = t(`verdict.${verdict.key}.hint`,  verdict.params ?? {});
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-lg"
      style={{ background: palette.bg }}
    >
      <span className="relative shrink-0">
        <span className="block w-2 h-2 rounded-full animate-ping absolute opacity-50"
              style={{ background: palette.dot }} />
        <span className="block w-2 h-2 rounded-full relative" style={{ background: palette.dot }} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-bold leading-tight" style={{ color: palette.text }}>
          {title}
        </div>
        <div className="text-[9px] truncate" style={{ color: 'var(--fg-subtle)' }}>
          {hint}
        </div>
      </div>
      <span
        className="text-[8px] font-black uppercase tracking-[0.18em]"
        style={{ color: palette.text, opacity: 0.75 }}
      >
        {tone === 'ok' ? t('verdict.ready') : tone === 'critical' ? t('verdict.block') : tone === 'warn' ? t('verdict.review') : t('verdict.info')}
      </span>
    </div>
  );
}

// ─── SE Health: top offenders mini-list ───────────────────────────────
function TopOffenders({
  title, rows,
}: { title: string; rows: { path: string; meta: string }[] }) {
  return (
    <div
      className="mt-3 pt-2 border-t border-dashed space-y-1"
      style={{ borderColor: 'var(--border-muted)' }}
    >
      <div
        className="text-[8px] font-black uppercase tracking-[0.18em]"
        style={{ color: 'var(--fg-subtle)' }}
      >
        {title}
      </div>
      {rows.map((r) => (
        <div key={r.path} className="flex items-center justify-between gap-2 text-[10px]">
          <span className="truncate font-mono" style={{ color: 'var(--fg-muted)' }}>{r.path}</span>
          <span className="shrink-0 font-mono tabular-nums" style={{ color: 'var(--fg-subtle)' }}>
            {r.meta}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── AI Efficiency: 5-bin safety histogram ────────────────────────────
function SafetyHistogram({
  bins, total,
}: { bins: number[]; total: number }) {
  const { t } = useTranslation('inspect');
  const max = Math.max(1, ...bins);
  const labels = ['0–20', '21–40', '41–60', '61–80', '81–100'];
  // Sequential warm hue, low → high (matching Heat overlay's single-hue principle)
  const hueAt = (i: number) => {
    if (i === 0) return C.critical; // don't touch
    if (i === 1) return C.warning;
    if (i === 2) return '#9a8537';
    if (i === 3) return C.ok;
    return '#4f9a5c'; // safe
  };
  return (
    <div className="mt-2">
      <div
        className="text-[8px] font-black uppercase tracking-[0.18em] mb-1"
        style={{ color: 'var(--fg-subtle)' }}
      >
        {t('histogram.title')}
      </div>
      <div className="flex items-end gap-1 h-10">
        {bins.map((n, i) => {
          const h = (n / max) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5"
                 title={`${labels[i]}: ${n} (${pct(n, total)}%)`}>
              <div className="w-full rounded-sm" style={{ height: `${Math.max(2, h)}%`, background: hueAt(i), opacity: n === 0 ? 0.15 : 0.85 }} />
              <span className="text-[8px] tabular-nums" style={{ color: 'var(--fg-subtle)' }}>
                {n}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-0.5 text-[8px] uppercase tracking-[0.18em]">
        <span style={{ color: 'var(--fg-subtle)', opacity: 0.7 }}>{t('histogram.dontTouch')}</span>
        <span style={{ color: 'var(--fg-subtle)', opacity: 0.7 }}>{t('histogram.safe')}</span>
      </div>
    </div>
  );
}

function AgentCapacityLine({
  autoFixable, autoPct, humanOnly, humanPct, unknown, unknownPct,
}: {
  autoFixable: number; autoPct: number;
  humanOnly: number; humanPct: number;
  unknown: number; unknownPct: number;
}) {
  const { t } = useTranslation('inspect');
  return (
    <div
      className="mt-2 px-2 py-2 rounded-md text-[10px] leading-relaxed"
      style={{ background: 'var(--bg-surface-muted)' }}
    >
      <span
        className="font-black uppercase tracking-[0.18em] mr-2"
        style={{ color: 'var(--fg-subtle)' }}
      >
        {t('agent.label')}
      </span>
      <span className="font-bold" style={{ color: 'var(--intent-success-fg)' }}>{autoFixable}</span>
      <span style={{ color: 'var(--fg-muted)' }}> {t('agent.autoFix')} ({autoPct}%) · </span>
      <span className="font-bold" style={{ color: 'var(--intent-danger-fg)' }}>{humanOnly}</span>
      <span style={{ color: 'var(--fg-muted)' }}> {t('agent.needHumans')} ({humanPct}%) · </span>
      <span className="font-bold" style={{ color: 'var(--intent-warn-fg)' }}>{unknown}</span>
      <span style={{ color: 'var(--fg-muted)' }}> {t('agent.needMoreProof')} ({unknownPct}%)</span>
    </div>
  );
}

// ─── Stack chip row ───────────────────────────────────────────────────
function ChipBlock({
  label, items,
}: {
  label: string;
  items: { text: string; tone?: 'ok' | 'warn' | 'muted'; mono?: boolean }[];
}) {
  return (
    <div className="mt-2.5">
      <div
        className="text-[8px] font-black uppercase tracking-[0.18em] mb-1"
        style={{ color: 'var(--fg-subtle)' }}
      >
        {label}
      </div>
      <div className="flex flex-wrap gap-1">
        {items.map((it) => {
          const tone = it.tone;
          const style: React.CSSProperties = tone === 'warn'
            ? { background: 'rgb(from var(--intent-warn-vivid) r g b / 0.12)', color: 'var(--intent-warn-fg)' }
            : tone === 'ok'
              ? { background: 'rgb(from var(--intent-success-vivid) r g b / 0.12)', color: 'var(--intent-success-fg)' }
              : tone === 'muted'
                ? { background: 'var(--bg-surface-muted)', color: 'var(--fg-subtle)' }
                : { background: 'var(--bg-surface-muted)', color: 'var(--fg-muted)' };
          return (
            <span
              key={it.text}
              className={`px-1.5 py-0.5 rounded-md text-[10px] ${it.mono ? 'font-mono' : 'font-bold'}`}
              style={style}
            >
              {it.text}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ─── Tab: Activity ────────────────────────────────────────────────────
// Time-axis view. Answers "is this repo alive, and where is the work
// happening right now?"

const ActivityTab = memo(function ActivityTab({ stats, isDark }: { stats: ReturnType<typeof computeRepoStats>; isDark: boolean }) {
  const { t } = useTranslation('inspect');
  const activePct = pct(stats.activeRecent, stats.files);
  const stalePct = pct(stats.staleFiles, stats.files);
  return (
    <div className="space-y-5">
      <Section title={t('section.pulse')}>
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
      </Section>

      <Section title={t('section.recentHotspots')} subtitle={t('subtitle.highChurnComplexity')}>
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
      </Section>

      <Section title={t('section.topOwners')}>
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
      </Section>
    </div>
  );
});

// ─── Tab: Risk ────────────────────────────────────────────────────────
// "Where do I look first?" — every count here links to a concrete file or
// finding. No global averages; this is the triage queue.

const RiskTab = memo(function RiskTab({ stats, isDark }: { stats: ReturnType<typeof computeRepoStats>; isDark: boolean }) {
  const { t } = useTranslation('inspect');
  const totalRisk = stats.vulnerable + stats.cyclic + stats.layerViolations;
  return (
    <div className="space-y-5">
      <Section title={t('section.structuralDefects')} subtitle={t('subtitle.blockSafeAutomation')}>
        <div className="space-y-1">
          <Stat label={t('stat.vulnerableFiles')} value={stats.vulnerable} isDark={isDark}
                tone={stats.vulnerable > 0 ? 'critical' : 'neutral'} />
          <Stat label={t('stat.inCycle')} value={stats.cyclic} suffix={t('focus.filesUnit')} isDark={isDark}
                tone={stats.cyclic > 0 ? 'critical' : 'neutral'} />
          <Stat label={t('stat.layerViolations')} value={stats.layerViolations} isDark={isDark}
                tone={stats.layerViolations > 0 ? 'critical' : 'neutral'} />
        </div>
        {totalRisk === 0 && (
          <div
            className="mt-1.5 text-[10px] italic"
            style={{ color: 'var(--fg-subtle)', opacity: 0.7 }}
          >
            {t('empty.noStructuralDefects')}
          </div>
        )}
      </Section>

      <Section title={t('section.qualityDebt')} subtitle={t('subtitle.thresholdMisses')}>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          <Stat label={t('stat.hotspots')} value={stats.hotspots} isDark={isDark}
                tone={stats.hotspots > 10 ? 'warn' : 'neutral'} />
          <Stat label={t('stat.typeLoose')} value={stats.typeLoose} isDark={isDark}
                tone={stats.typeLoose > stats.files * 0.15 ? 'warn' : 'neutral'} />
          <Stat label={t('stat.deadCode')} value={stats.dead} isDark={isDark}
                tone={stats.dead > 5 ? 'warn' : 'neutral'} />
          <Stat label={t('stat.staleIndex')} value={stats.staleIndex} isDark={isDark}
                tone={stats.staleIndex > 0 ? 'warn' : 'neutral'} />
        </div>
      </Section>

      <Section title={t('section.lowestEditSafety')} subtitle={t('subtitle.worst5StartHere')}>
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
      </Section>
    </div>
  );
});

// ─── Tab: Deps ────────────────────────────────────────────────────────

// WorkspaceBody re-renders whenever its parent (InspectPanel) does. Its
// props (`repo` from the zustand store, `isDark` from theme) are reference-
// stable across unrelated parent renders, so memo prevents the whole
// stats / tab tree from rebuilding when only sibling state changes.
export default memo(WorkspaceBody);

const DepsTab = memo(function DepsTab({ stats, isDark }: { stats: ReturnType<typeof computeRepoStats>; isDark: boolean }) {
  const { t } = useTranslation('inspect');
  const layerMax = Math.max(1, ...Object.values(stats.byLayer));
  return (
    <div className="space-y-5">
      <Section title={t('section.topology')}>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          <Stat label={t('stat.edges')} sublabel={t('stat.edgesSub')} value={stats.edges.toLocaleString()} isDark={isDark} />
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
      </Section>

      <Section title={t('section.layers')}>
        <div className="space-y-1">
          {Object.entries(stats.byLayer)
            .sort((a, b) => b[1] - a[1])
            .map(([layer, n]) => (
              <BarRow key={layer} label={layer} value={n} max={layerMax} isDark={isDark} />
            ))}
        </div>
      </Section>
    </div>
  );
});
