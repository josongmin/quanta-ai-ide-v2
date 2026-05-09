// Folder inspect body — folder-scoped summary (Overview / Activity / Risk / Deps).
//
// Split from InspectPanel for SRP. Mirrors WorkspaceBody but consumes
// computeFolderStats() and renders dependency direction (in/out) rather
// than repo-wide topology. Self-contained: owns its tab state, its memoized
// stats, and its tab renderers.

import { memo, useMemo, useState, type ReactNode } from 'react';
import { Activity, Folder, GitBranch, LayoutGrid, Network, ShieldAlert } from 'lucide-react';
import type { FolderRecord, RepoData } from '@entities/repo';
import { C, type Tone, languageHue, pct } from '@shared/lib';
import { computeFolderStats } from '@entities/metric';
import {
  BarRow, ConfidenceMeter, EmptyHint, FileRow, GlassCard,
  Score, StackedRatioBar, Stat,
} from '@shared/ui';
import { useTranslation } from '@shared/i18n';

type FolderTab = 'overview' | 'activity' | 'risk' | 'deps';

function FolderBody({ path, repo, isDark }: { path: string; repo: RepoData; isDark: boolean }) {
  const folder = repo.foldersByPath.get(path);
  const stats = useMemo(() => folder ? computeFolderStats(repo, folder) : null, [repo, folder]);
  const [tab, setTab] = useState<FolderTab>('overview');
  const { t } = useTranslation('inspect');

  if (!folder || !stats) {
    return (
      <div className={`p-6 text-[12px] ${isDark ? 'text-white/55' : 'text-black/55'}`}>
        {t('empty.folderNotFound')}
      </div>
    );
  }

  const riskCritical = stats.vulnerable;
  const riskWarn = stats.cyclic + stats.layerViolations;

  const tabs: {
    id: FolderTab;
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

  // The outer InspectPanel shell is the top card. Header / chips / tab strip
  // are flush with that shell — same shape as FocusScanPanel — so workspace,
  // folder, and file selections all read as the same chrome.
  const folderPath = folder.parts.length === 0 ? '/' : '/' + folder.parts.join('/');
  return (
    <>
      <div className="-mx-2 px-5 pt-4 pb-0">
        <div className="flex items-start gap-2 min-w-0">
          <div className="min-w-0 flex-1">
            <div
              className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.18em]"
              style={{ color: 'var(--fg-subtle)' }}
            >
              <Folder className="w-3 h-3" /> {t('header.folder')}
            </div>
            <h2 className="font-black text-[13px] truncate tracking-tight mt-1">
              {folder.name || t('tree.repo')}
            </h2>
            <p
              className="text-[10px] font-mono truncate mt-0.5"
              style={{ color: 'var(--fg-subtle)' }}
            >
              {folderPath}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-2.5 mb-3 flex-wrap">
          <span
            className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-[0.18em] tabular-nums"
            style={{ background: 'var(--bg-elevated)', color: 'var(--fg-muted)' }}
          >
            {stats.totalFiles.toLocaleString()} {t('focus.filesUnit')}
          </span>
          <span
            className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-[0.18em] tabular-nums"
            style={{ background: 'var(--bg-elevated)', color: 'var(--fg-muted)' }}
          >
            {stats.totalLoc.toLocaleString()} {t('stat.loc')}
          </span>
        </div>
        <nav
          className="-mx-5 overflow-x-auto scrollbar-hide border-t"
          style={{ borderColor: 'var(--border-default)' }}
        >
          <div className="flex items-stretch gap-3 px-4 min-w-max">
            {tabs.map(({ id, label, icon: Icon, badges }) => {
              const active = tab === id;
              return (
                <button
                  type="button"
                  key={id}
                  onClick={() => { setTab(id); }}
                  className="relative flex items-center gap-1.5 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] whitespace-nowrap transition-colors"
                  style={{ color: active ? 'var(--fg-strong)' : 'var(--fg-subtle)' }}
                >
                  <Icon className="w-3 h-3 shrink-0" />
                  <span>{label}</span>
                  {badges && badges.length > 0 && (
                    <span className="ml-0.5 inline-flex items-center gap-0.5">
                      {badges.map((b, i) => {
                        const c = b.tone === 'critical' ? C.critical : b.tone === 'warn' ? C.warning : C.ok;
                        return (
                          <span
                            key={i}
                            className="inline-flex items-center justify-center min-w-[14px] h-[14px] px-1 rounded-full text-[9px] font-black tabular-nums"
                            style={{ background: `${c}22`, color: c }}
                          >
                            {b.n}
                          </span>
                        );
                      })}
                    </span>
                  )}
                  {active && (
                    <span
                      className="absolute left-0 right-0 -bottom-px h-[1.5px]"
                      style={{ background: 'var(--fg-strong)' }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      <div className="text-[11px]">
        {tab === 'overview' && <FolderOverviewTab stats={stats} folder={folder} isDark={isDark} />}
        {tab === 'activity' && <FolderActivityTab stats={stats} isDark={isDark} />}
        {tab === 'risk' && <FolderRiskTab stats={stats} isDark={isDark} />}
        {tab === 'deps' && <FolderDepsTab stats={stats} isDark={isDark} />}
      </div>

      <GlassCard
        tone="inner"
        className="px-5 py-2 text-[9px] font-mono uppercase tracking-[0.18em]"
        style={{ color: 'var(--fg-subtle)' }}
      >
        {folderTabFooter(tab, stats.totalFiles, t)}
      </GlassCard>

      <div className="h-2" aria-hidden />
    </>
  );
}

// Memoized for the same reason as WorkspaceBody: stable primitive/store
// props mean we can short-circuit re-renders triggered by sibling state.
export default memo(FolderBody);

// Subcard mirrors the FocusScanPanel box style — `rounded-xl border` block on
// `bg-surface-muted` with the eyebrow living *inside* the card. Keeps the
// visual grouping while matching file-panel chrome across all three inspect
// modes (workspace / folder / file).
function SubCard({
  title, subtitle, children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div
      className="rounded-xl border px-3 py-2.5"
      style={{
        background: 'var(--bg-surface-muted)',
        borderColor: 'var(--border-default)',
      }}
    >
      <div className="flex items-baseline gap-2">
        <div
          className="text-[9px] font-black uppercase tracking-[0.18em]"
          style={{ color: 'var(--fg-subtle)' }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            className="text-[9px] font-mono truncate"
            style={{ color: 'var(--fg-subtle)', opacity: 0.7 }}
          >
            {subtitle}
          </div>
        )}
      </div>
      <div className="mt-2 space-y-1">{children}</div>
    </div>
  );
}

function folderTabFooter(tab: FolderTab, files: number, t: (k: string, opts?: Record<string, unknown>) => string): string {
  switch (tab) {
    case 'overview': return t('footer.folderScope', { count: files });
    case 'activity': return t('footer.activity');
    case 'risk':     return t('footer.risk');
    case 'deps':     return t('footer.folderDeps');
  }
}

// ─── Folder tabs ──────────────────────────────────────────────────────

const FolderOverviewTab = memo(function FolderOverviewTab({
  stats, folder, isDark,
}: {
  stats: ReturnType<typeof computeFolderStats>;
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
          <Stat label={t('stat.totalLoc')} value={stats.totalLoc.toLocaleString()} isDark={isDark} />
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
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] ${
                    isDark ? 'bg-white/[0.04]' : 'bg-black/[0.03]'
                  }`}
                >
                  <span className={`font-mono font-bold ${isDark ? 'text-white/85' : 'text-black/85'}`}>{lang}</span>
                  <span className={`tabular-nums ${isDark ? 'text-white/55' : 'text-black/55'}`}>{n}</span>
                  <span className={`tabular-nums text-[9px] ${isDark ? 'text-white/40' : 'text-black/40'}`}>
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
                  <div key={lang} className="flex items-center gap-1.5 text-[10px]">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: languageHue(lang, isDark) }} />
                    <span className={`flex-1 ${isDark ? 'text-white/55' : 'text-black/55'}`}>{lang}</span>
                    <span className={`tabular-nums font-bold ${isDark ? 'text-white/85' : 'text-black/85'}`}>{n}</span>
                    <span className={`tabular-nums text-[9px] w-7 text-right ${isDark ? 'text-white/40' : 'text-black/40'}`}>
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

const FolderActivityTab = memo(function FolderActivityTab({
  stats, isDark,
}: {
  stats: ReturnType<typeof computeFolderStats>;
  isDark: boolean;
}) {
  const { t } = useTranslation('inspect');
  const activePct = pct(stats.activeRecent, stats.totalFiles);
  const stalePct = pct(stats.staleFiles, stats.totalFiles);
  return (
    <div className="space-y-4">
      <SubCard title={t('section.pulse')}>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          <Stat label={t('stat.lastTouch')} value={t('stat.lastTouchAgo', { days: stats.minDaysSince })} isDark={isDark} />
          <Stat label={t('stat.prs30d')} value={stats.totalRecentPRs} isDark={isDark} />
          <Stat label={t('stat.avgChurn')} value={stats.avgChurn.toFixed(2)} isDark={isDark}
                tone={stats.avgChurn > 0.4 ? 'warn' : 'neutral'} />
          <Stat label={t('stat.busFactor1')} value={stats.busFactor1} isDark={isDark}
                tone={stats.busFactor1 > stats.totalFiles * 0.3 ? 'warn' : 'neutral'} />
        </div>
        <div className={`mt-2 pt-2 border-t border-dashed ${isDark ? 'border-white/[0.06]' : 'border-black/[0.06]'} space-y-1.5`}>
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

      <SubCard title={t('section.owners')}>
        <div className="space-y-1">
          {stats.owners.map((o) => (
            <BarRow
              key={o.owner}
              label={o.owner}
              value={o.n}
              max={Math.max(1, ...stats.owners.map((x) => x.n))}
              isDark={isDark}
              mono
            />
          ))}
        </div>
      </SubCard>
    </div>
  );
});

const FolderRiskTab = memo(function FolderRiskTab({
  stats, isDark,
}: {
  stats: ReturnType<typeof computeFolderStats>;
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
          <div className={`mt-1.5 text-[10px] italic ${isDark ? 'text-white/30' : 'text-black/30'}`}>
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

const FolderDepsTab = memo(function FolderDepsTab({
  stats, isDark,
}: {
  stats: ReturnType<typeof computeFolderStats>;
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
            <div className={`flex w-full h-1.5 rounded-full overflow-hidden ${
              isDark ? 'bg-white/[0.04]' : 'bg-black/[0.04]'
            }`}>
              <div
                style={{
                  width: `${(stats.inboundEdges / totalEdges) * 100}%`,
                  background: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)',
                }}
                className="h-full"
              />
              <div
                style={{
                  width: `${(stats.outboundEdges / totalEdges) * 100}%`,
                  background: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.22)',
                }}
                className="h-full"
              />
            </div>
            <div className={`flex justify-between text-[9px] font-mono mt-1 ${isDark ? 'text-white/40' : 'text-black/40'}`}>
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
              <DepRow key={d.path} path={d.path} n={d.n} isDark={isDark} dir="out" />
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
              <DepRow key={d.path} path={d.path} n={d.n} isDark={isDark} dir="in" />
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

function DepRow({ path, n, isDark, dir }: { path: string; n: number; isDark: boolean; dir: 'in' | 'out' }) {
  const { t } = useTranslation('inspect');
  return (
    <div className="flex items-center gap-2 py-0.5">
      <GitBranch
        className={`w-2.5 h-2.5 shrink-0 ${isDark ? 'text-white/30' : 'text-black/30'} ${
          dir === 'in' ? 'rotate-180' : ''
        }`}
      />
      <span className={`flex-1 text-[11px] font-mono truncate ${isDark ? 'text-white/55' : 'text-black/55'}`}>
        {path ? path.split('.').join('/') : t('deps.rootLabel')}
      </span>
      <span className={`text-[10px] tabular-nums font-bold ${isDark ? 'text-white/85' : 'text-black/85'}`}>
        {n}
      </span>
    </div>
  );
}
