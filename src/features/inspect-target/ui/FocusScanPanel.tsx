import { useEffect, useMemo, useState } from 'react';
import {
  Wand2, ScrollText, AlertTriangle, Sparkles, Network, FileSearch, ShieldAlert,
  Radio, ChevronDown, ChevronUp, ArrowDownToLine, ArrowUpFromLine,
} from 'lucide-react';
import { useFilterRepo } from '@features/filter-files';
import { useOverlay } from '@features/apply-overlay';
import {
  computeBlast, findSimilar,
  functionSummary, riskChannels, plannerTrace, projectEdges, proofFreshness, severityBand, aggregateRiskScore,
  type Confidence, type FileRecord, type GraphEdgeMode, type RiskChannelKey, type RiskChannelSummary,
  type SimilarHit,
} from '@entities/repo';
import { GlassCard, Portal } from '@shared/ui';
import { C } from '@shared/lib';
import { useTranslation } from '@shared/i18n';
import { useStack } from '../model/StackContext';

// Spec §2 Focus Scan + Catalog (docs/catalog-algorithms-listing.md). The new
// 4-tab layout collapses the old Overview/Calls/Impact/Blast/Refactor/Evidence
// rail into Profile · Graph · Risk · Proof so each tab maps to a clear DXUX
// question:
//   PROFILE — what is this file?              (function_summary, refactor verdict)
//   GRAPH   — what is it wired to?            (call_graph / dataflow / refs lens toggle)
//   RISK    — what breaks if we touch it?     (blast + taint + race + typestate channels)
//   PROOF   — why should we trust this?       (planner trace, freshness, replay capsule)
// Similar-files is demoted from a tab into a header action since it's a
// single capability and shouldn't compete with the four pillars above.

type TabId = 'profile' | 'graph' | 'risk' | 'proof';

const TABS: { id: TabId; labelKey: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'profile', labelKey: 'tab.profile', icon: FileSearch },
  { id: 'graph',   labelKey: 'tab.graph',   icon: Network },
  { id: 'risk',    labelKey: 'tab.risk',    icon: ShieldAlert },
  { id: 'proof',   labelKey: 'tab.proof',   icon: ScrollText },
];

// `isDark` is retained on the public API so parallel call-sites compile, but
// all colour decisions inside this panel now flow through theme-aware CSS
// variables. The prop is no longer read internally.
export default function FocusScanPanel({
  file, embedded = false,
}: { file: FileRecord; isDark?: boolean; onClose?: () => void; embedded?: boolean }) {
  const repo = useFilterRepo();
  const { t } = useTranslation('inspect');
  const { t: tc } = useTranslation('common');
  const [tab, setTab] = useState<TabId>('profile');
  const [similarOpen, setSimilarOpen] = useState(false);

  // Reverse deps once per file selection.
  const reverseDeps = useMemo(() => {
    const ins: number[] = [];
    for (const f of repo.files) if (f.deps.includes(file.id)) ins.push(f.id);
    return ins;
  }, [repo, file.id]);

  // Embedded variant gets a stronger backing fill — the rail tabs sit on the
  // canvas and the card needs to read as a solid surface in front, not as
  // a sheet of clear glass.
  const cardStyle: React.CSSProperties | undefined = embedded
    ? { backgroundColor: 'var(--bg-surface)' }
    : undefined;

  const card = (
    <GlassCard
      className="flex flex-col h-full max-h-[calc(100vh-130px)] overflow-hidden"
      style={cardStyle}
    >
      <header
        className="shrink-0 px-5 pt-4 pb-3 border-b"
        style={{ borderColor: 'var(--border-default)' }}
      >
        <div className="flex items-start gap-2 min-w-0">
          <div className="min-w-0 flex-1">
            <h2 className="font-black text-[13px] truncate tracking-tight">{file.name}</h2>
            <p
              className="text-[10px] font-mono truncate mt-0.5"
              style={{ color: 'var(--fg-subtle)' }}
            >
              {file.folderPath}/{file.name}
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setSimilarOpen((v) => !v); }}
            title={t('catalog.openSimilar')}
            className="shrink-0 p-1.5 rounded-md transition-colors hover-surface"
            style={
              similarOpen
                ? { background: 'var(--bg-active)', color: 'var(--fg-strong)' }
                : { background: 'var(--bg-elevated)', color: 'var(--fg-muted)' }
            }
          >
            <Sparkles className="w-3 h-3" />
          </button>
        </div>
        <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
          <Badge kind={file.status}>{tc(`status.${file.status}`).toUpperCase()}</Badge>
          <Badge kind="confidence" conf={file.metrics.confidence}>
            {file.metrics.confidence.toUpperCase()}
          </Badge>
          <Badge kind="safety" safety={file.metrics.editSafety}>
            {t('focus.safetyLabel')} {file.metrics.editSafety}
          </Badge>
        </div>
      </header>

      {/* Similar files drawer — opens from the Sparkles header button */}
      {similarOpen && (
        <SimilarDrawer file={file} onClose={() => { setSimilarOpen(false); }} />
      )}

      {/* Tabs — 4 pillars */}
      <nav
        className="shrink-0 overflow-x-auto scrollbar-hide border-b"
        style={{ borderColor: 'var(--border-default)' }}
      >
        <div className="flex items-stretch gap-3 px-4 min-w-max">
          {TABS.map(({ id, labelKey, icon: Icon }) => {
            const active = tab === id;
            return (
              <button type="button"
                key={id}
                onClick={() => { setTab(id); }}
                className="relative flex items-center gap-1.5 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] whitespace-nowrap transition-colors"
                style={{ color: active ? 'var(--fg-strong)' : 'var(--fg-subtle)' }}
              >
                <Icon className="w-3 h-3 shrink-0" />
                <span>{t(labelKey)}</span>
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

      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 scrollbar-hide text-[11px]">
        {tab === 'profile' && <ProfileTab file={file} />}
        {tab === 'graph'   && <GraphTab   file={file} reverseDeps={reverseDeps} />}
        {tab === 'risk'    && <RiskTab    file={file} />}
        {tab === 'proof'   && <ProofTab   file={file} />}
      </div>

      <footer
        className="shrink-0 px-5 py-2.5 border-t text-[9px] font-mono uppercase tracking-[0.18em]"
        style={{ borderColor: 'var(--border-default)', color: 'var(--fg-subtle)', opacity: 0.7 }}
      >
        {t('footer.focusScan', { state: file.metrics.indexState })}
      </footer>
    </GlassCard>
  );

  if (embedded) return card;

  return (
    <Portal>
      <div className="fixed top-[68px] right-4 z-30 w-[360px] max-h-[calc(100vh-84px)] pointer-events-auto">
        {card}
      </div>
    </Portal>
  );
}

// ─── SIMILAR drawer (header action, not a tab) ────────────────────────

function SimilarDrawer({ file, onClose }: { file: FileRecord; onClose: () => void }) {
  const repo = useFilterRepo();
  const { t } = useTranslation('inspect');
  const { open: openStack } = useStack();
  const hits = useMemo<SimilarHit[]>(() => findSimilar(repo, file.id, 6), [repo, file.id]);
  return (
    <div
      className="shrink-0 px-4 py-3 border-b"
      style={{
        borderColor: 'var(--border-default)',
        background: 'var(--bg-surface-muted)',
      }}
    >
      <div
        className="text-[9px] font-black uppercase tracking-[0.18em] mb-1.5 flex items-center justify-between"
        style={{ color: 'var(--fg-subtle)' }}
      >
        <span>{t('catalog.openSimilar')}</span>
        <button
          type="button"
          onClick={onClose}
          className="text-[9px] font-mono"
          style={{ color: 'var(--fg-subtle)', opacity: 0.7 }}
        >
          esc
        </button>
      </div>
      <p className="text-[10px] mb-2" style={{ color: 'var(--fg-muted)' }}>
        {t('focus.similarHint', { name: file.name })}
      </p>
      {hits.length === 0 ? (
        <Empty>{t('focus.similarEmpty')}</Empty>
      ) : (
        <div className="space-y-1">
          {hits.map((hit) => {
            const f = repo.files[hit.id];
            if (!f) return null;
            const pct = Math.max(0, Math.min(1, hit.score));
            return (
              <button
                key={hit.id}
                type="button"
                onClick={() => { openStack({ kind: 'file', id: hit.id }); }}
                className="w-full text-left px-2 py-1.5 rounded-md text-[10px] transition-colors hover-surface"
                style={{ background: 'var(--bg-surface-muted)' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono truncate">{f.name}</div>
                    <div
                      className="font-mono truncate text-[9px]"
                      style={{ color: 'var(--fg-subtle)' }}
                    >
                      {f.folderPath}
                    </div>
                  </div>
                  <span
                    className="shrink-0 px-1.5 py-0.5 rounded-md font-mono text-[9px] tabular-nums"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--fg-muted)' }}
                  >
                    {Math.round(pct * 100)}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── PROFILE: file outline + health + refactor verdict ────────────────

function ProfileTab({ file }: { file: FileRecord }) {
  const { t } = useTranslation('inspect');
  const churnPct = Math.round(file.metrics.churn * 100);
  const summary = useMemo(() => functionSummary(file), [file]);

  return (
    <div className="space-y-4">
      {/* Function outline — catalog: function_summary */}
      <div>
        <SectionHeader
          title={t('catalog.profileTitle')}
          sub={t('catalog.profileSub')}
        />
        <div className="mt-1.5 space-y-1">
          {summary.map((row) => (
            <FunctionRow key={row.name} row={row} />
          ))}
        </div>
      </div>

      {/* Health bars — same axis as old Overview */}
      <div
        className="pt-3 border-t space-y-2"
        style={{ borderColor: 'var(--border-muted)' }}
      >
        <Bar label={t('stat.complexity')} value={file.metrics.complexity} max={50}
             bad={file.metrics.complexity >= 35} />
        <Bar label={t('stat.churn90d')} value={churnPct} max={100}
             bad={churnPct >= 70} />
        <Bar label={t('stat.coverage')} value={file.metrics.lineCoverage} max={100}
             bad={file.metrics.lineCoverage < 40} />
        <Bar label={t('stat.editSafety')} value={file.metrics.editSafety} max={100}
             bad={file.metrics.editSafety < 40} />
      </div>

      <div
        className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-3 border-t"
        style={{ borderColor: 'var(--border-muted)' }}
      >
        <MiniStat label={t('stat.loc')} value={file.metrics.loc} />
        <MiniStat label={t('stat.fanInOut')} value={`${file.metrics.fanIn} / ${file.metrics.fanOut}`} />
        <MiniStat label={t('stat.pageRank')} value={`${(file.metrics.pagerank * 1000).toFixed(1)}‰`} />
        <MiniStat label={t('stat.authors')} value={file.metrics.authors} />
        <MiniStat label={t('stat.lastTouch')} value={t('stat.lastTouchAgo', { days: file.metrics.daysSinceTouched })} />
        <MiniStat label={t('stat.publicApi')} value={file.metrics.publicApi ? t('focus.yes') : t('focus.no')} />
      </div>

      {/* Refactor verdict — collapsed by default to keep tab compact. */}
      <RefactorBlock file={file} />

      {file.metrics.unknownReasons.length > 0 && (
        <div
          className="mt-1 px-3 py-2.5 rounded-xl border text-[10px]"
          style={{
            background: 'var(--bg-surface-muted)',
            borderColor: 'var(--border-default)',
            color: 'var(--fg-muted)',
          }}
        >
          <div
            className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.18em]"
            style={{ color: 'var(--fg-subtle)' }}
          >
            <AlertTriangle className="w-3 h-3" />
            {t('focus.partialResolution')}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {file.metrics.unknownReasons.map((r) => (
              <span
                key={r}
                className="px-1.5 py-0.5 rounded-md font-mono text-[10px]"
                style={{ background: 'var(--bg-elevated)', color: 'var(--fg-muted)' }}
              >
                {r}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RefactorBlock({ file }: { file: FileRecord }) {
  const { t } = useTranslation('inspect');
  const [open, setOpen] = useState(false);
  const safety = file.metrics.editSafety;
  const verdict =
    safety >= 70 ? { tone: 'good',    label: t('verdict.autoFixable'),  hint: t('verdict.hintAuto') } :
    safety >= 40 ? { tone: 'caution', label: t('verdict.reviewBefore'), hint: t('verdict.hintReview') } :
                   { tone: 'danger',  label: t('verdict.humanOnly'),    hint: t('verdict.hintHuman') };
  const accent = verdict.tone === 'good' ? C.ok : verdict.tone === 'caution' ? C.warning : C.critical;

  return (
    <div
      className="rounded-xl border"
      style={{
        background: 'var(--bg-surface-muted)',
        borderColor: 'var(--border-default)',
      }}
    >
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); }}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left"
      >
        <div className="min-w-0">
          <div
            className="text-[9px] font-black uppercase tracking-[0.18em]"
            style={{ color: 'var(--fg-subtle)' }}
          >
            {t('catalog.refactorVerdictHeader')}
          </div>
          <div className="text-[12px] font-black mt-0.5 tracking-tight" style={{ color: accent }}>{verdict.label}</div>
        </div>
        <span className="shrink-0" style={{ color: 'var(--fg-subtle)' }}>
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </span>
      </button>
      {open && (
        <div
          className="px-3 pb-3 pt-1 space-y-2 border-t"
          style={{ borderColor: 'var(--border-muted)' }}
        >
          <div className="text-[10px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>{verdict.hint}</div>
          <div className="space-y-1">
            <ProposalRow ok={file.metrics.complexity > 30} title={t('proposal.extractBranches')} detail={t('proposal.extractBranchesDetail')} />
            <ProposalRow ok={file.metrics.fnCount > 10}    title={t('proposal.moveHelpers')}     detail={t('proposal.moveHelpersDetail', { count: file.metrics.fnCount })} />
            <ProposalRow ok={file.metrics.anyCount > 10}   title={t('proposal.tightenTypes')}    detail={t('proposal.tightenTypesDetail', { count: file.metrics.anyCount })} />
            <ProposalRow ok={file.metrics.todoCount > 5}   title={t('proposal.resolveTodos')}    detail={t('proposal.resolveTodosDetail', { count: file.metrics.todoCount })} />
            <ProposalRow ok={!file.metrics.hasTestFile}    title={t('proposal.addTest')}         detail={t('proposal.addTestDetail')} />
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            <ActionPill label={t('catalog.actionRename')} icon={Wand2} />
            <ActionPill label={t('catalog.actionExtract')} icon={Wand2} />
            <ActionPill label={t('catalog.actionAddTest')} icon={Wand2} />
          </div>
        </div>
      )}
    </div>
  );
}

function FunctionRow({ row }: { row: ReturnType<typeof functionSummary>[number] }) {
  const { t } = useTranslation('inspect');
  const kindLabel = t(`catalog.kind${row.kind.charAt(0).toUpperCase() + row.kind.slice(1)}`);
  return (
    <div
      className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[10px] hover-surface"
      style={{ background: 'var(--bg-surface-muted)' }}
    >
      <span
        className="shrink-0 px-1.5 py-0.5 rounded-md font-mono text-[9px] uppercase tracking-[0.18em]"
        style={{ background: 'var(--bg-elevated)', color: 'var(--fg-muted)' }}
      >{kindLabel}</span>
      <span className="flex-1 min-w-0 font-mono truncate">{row.name}</span>
      <span
        className="shrink-0 font-mono tabular-nums text-[9px] px-1 py-0.5 rounded-md"
        style={
          row.cyclomatic >= 12 ? { background: 'rgb(from var(--intent-danger-vivid) r g b / 0.15)', color: 'var(--intent-danger-vivid)' }
          : row.cyclomatic >= 6 ? { background: 'rgb(from var(--intent-warn-vivid) r g b / 0.15)', color: 'var(--intent-warn-vivid)' }
          : { background: 'var(--bg-elevated)', color: 'var(--fg-muted)' }
        }
      >cyc {row.cyclomatic}</span>
      <span className="shrink-0 font-mono text-[9px]" style={{ color: 'var(--fg-subtle)' }}>{row.cost}</span>
      <div className="shrink-0 flex gap-0.5">
        {row.effects.map((e) => (
          <span
            key={e}
            className="text-[9px] font-mono px-1 rounded-md"
            style={effectChipStyle(e)}
            title={t(`catalog.effect${e.charAt(0).toUpperCase() + e.slice(1)}`)}
          >
            {t(`catalog.effect${e.charAt(0).toUpperCase() + e.slice(1)}`)}
          </span>
        ))}
      </div>
    </div>
  );
}

function effectChipStyle(e: 'pure' | 'io' | 'heap' | 'mutation' | 'async'): React.CSSProperties {
  if (e === 'pure') return { background: 'rgb(from var(--intent-success-fg) r g b / 0.15)', color: 'var(--intent-success-fg)' };
  if (e === 'io') return { background: 'rgb(from var(--fg-link) r g b / 0.15)', color: 'var(--fg-link)' };
  if (e === 'heap') return { background: 'rgb(from var(--intent-warn-vivid) r g b / 0.15)', color: 'var(--intent-warn-vivid)' };
  if (e === 'mutation') return { background: 'rgb(from var(--intent-danger-vivid) r g b / 0.15)', color: 'var(--intent-danger-vivid)' };
  return { background: 'var(--bg-elevated)', color: 'var(--fg-muted)' };
}

// ─── GRAPH: imports / calls / dataflow / refs lens ──────────────────

function GraphTab({ file, reverseDeps }: { file: FileRecord; reverseDeps: number[] }) {
  const repo = useFilterRepo();
  const { t } = useTranslation('inspect');
  const [mode, setMode] = useState<GraphEdgeMode>('imports');

  const { outgoing, incoming } = useMemo(
    () => projectEdges(repo, file, reverseDeps, mode),
    [repo, file, reverseDeps, mode],
  );

  const modes: { key: GraphEdgeMode; labelKey: string }[] = [
    { key: 'imports',    labelKey: 'catalog.modeImports' },
    { key: 'calls',      labelKey: 'catalog.modeCalls' },
    { key: 'dataflow',   labelKey: 'catalog.modeDataflow' },
    { key: 'references', labelKey: 'catalog.modeReferences' },
  ];

  return (
    <div className="space-y-3">
      <SectionHeader
        title={t('catalog.graphTitle')}
        sub={t('catalog.graphSub', { mode: t(`catalog.mode${mode.charAt(0).toUpperCase() + mode.slice(1)}`) })}
      />

      {/* Mode toggle */}
      <div
        className="inline-flex rounded-lg p-0.5"
        style={{ background: 'var(--bg-elevated)' }}
      >
        {modes.map((m) => {
          const active = mode === m.key;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => { setMode(m.key); }}
              className="px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] rounded-md transition-colors"
              style={
                active
                  ? { background: 'var(--bg-active)', color: 'var(--fg-strong)' }
                  : { color: 'var(--fg-subtle)' }
              }
            >
              {t(m.labelKey)}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1">
        <MiniStat label={t('stat.fanInOut')} value={`${file.metrics.fanIn} / ${file.metrics.fanOut}`} />
        <MiniStat label={t('stat.publicApi')} value={file.metrics.publicApi ? t('focus.yes') : t('focus.no')} />
      </div>

      <div className="space-y-3">
        <div>
          <div
            className="flex items-center gap-1.5 mb-1.5 text-[9px] font-black uppercase tracking-[0.18em]"
            style={{ color: 'var(--fg-subtle)' }}
          >
            <ArrowUpFromLine className="w-2.5 h-2.5" />
            {t('catalog.outgoing', { count: outgoing.length })}
          </div>
          <div className="space-y-1">
            {outgoing.length === 0 && <Empty>{t('catalog.edgeNoneOut')}</Empty>}
            {outgoing.map((edge) => {
              const f = repo.files[edge.fileId];
              if (!f) return null;
              return <EdgeRow key={edge.fileId} f={f} edge={edge} />;
            })}
          </div>
        </div>
        <div>
          <div
            className="flex items-center gap-1.5 mb-1.5 text-[9px] font-black uppercase tracking-[0.18em]"
            style={{ color: 'var(--fg-subtle)' }}
          >
            <ArrowDownToLine className="w-2.5 h-2.5" />
            {t('catalog.incoming', { count: incoming.length })}
          </div>
          <div className="space-y-1">
            {incoming.length === 0 && <Empty>{t('catalog.edgeNoneIn')}</Empty>}
            {incoming.map((edge) => {
              const f = repo.files[edge.fileId];
              if (!f) return null;
              return <EdgeRow key={edge.fileId} f={f} edge={edge} />;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function EdgeRow({
  f, edge,
}: {
  f: FileRecord;
  edge: { confidence: 'exact' | 'overapprox' | 'unknown'; note?: string };
}) {
  const dotColor =
    edge.confidence === 'exact' ? C.ok : edge.confidence === 'overapprox' ? C.warning : C.critical;
  return (
    <div
      className="flex items-center gap-2 px-2 py-1 rounded-md text-[10px] hover-surface"
      style={{ background: 'var(--bg-surface-muted)' }}
    >
      <span className="font-mono truncate flex-1 min-w-0">{f.folderPath}/{f.name}</span>
      {edge.note && (
        <span
          className="shrink-0 text-[9px] italic"
          style={{ color: 'var(--fg-subtle)' }}
        >
          {edge.note}
        </span>
      )}
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dotColor, boxShadow: `0 0 6px ${dotColor}` }} title={edge.confidence} />
    </div>
  );
}

// ─── RISK: blast + risk channels (taint/race/typestate/vuln/layer) ─────

function RiskTab({ file }: { file: FileRecord }) {
  const repo = useFilterRepo();
  const { t } = useTranslation('inspect');
  const { setBlastSeed, clearBlast } = useOverlay();

  // Light up the dot-field stage while tab is mounted; clear on unmount.
  useEffect(() => {
    setBlastSeed(file.id);
    return () => { clearBlast(); };
  }, [file.id, setBlastSeed, clearBlast]);

  const blast = useMemo(() => computeBlast(repo, file.id, 4), [repo, file.id]);
  const channels = useMemo(() => riskChannels(file), [file]);
  const total = blast.transitive.length;
  const directCount = blast.direct.length;
  const severe = total >= 5 || aggregateRiskScore(channels) >= 0.7;
  const ringColor = severe ? C.critical : 'var(--fg-default)';

  const grouped = useMemo(() => {
    const byHop = new Map<number, number[]>();
    for (const id of blast.transitive) {
      const hop = blast.hopOf.get(id) ?? 0;
      const arr = byHop.get(hop) ?? [];
      arr.push(id);
      byHop.set(hop, arr);
    }
    return Array.from(byHop.entries()).sort((a, b) => a[0] - b[0]);
  }, [blast]);

  // Channel selection — null = show blast hop list; else swap to channel hits.
  const [selectedChannel, setSelectedChannel] = useState<RiskChannelKey | null>(null);

  return (
    <div className="space-y-4">
      {/* Blast ring + risk-channel grid side by side. */}
      <div className="grid grid-cols-[auto_1fr] gap-3 items-start">
        <div className="flex flex-col items-center">
          <div
            className="relative w-20 h-20 rounded-full flex flex-col items-center justify-center"
            style={{
              border: `1.5px solid ${severe ? 'rgba(194,90,85,0.4)' : 'var(--border-strong)'}`,
            }}
          >
            <div className="text-[22px] font-black leading-none tabular-nums" style={{ color: ringColor }}>
              {total}
            </div>
            <div
              className="mt-1 text-[8px] font-black uppercase tracking-[0.18em]"
              style={{ color: 'var(--fg-subtle)' }}
            >
              {t('focus.filesUnit')}
            </div>
          </div>
          <p
            className="text-[10px] mt-2 text-center leading-snug max-w-[100px]"
            style={{ color: 'var(--fg-muted)' }}
          >
            {t('focus.blastHeadline')}
          </p>
        </div>

        <div>
          <div
            className="flex items-center gap-1.5 mb-1.5 text-[9px] font-black uppercase tracking-[0.18em]"
            style={{ color: 'var(--fg-subtle)' }}
          >
            <Radio className="w-2.5 h-2.5" />
            {t('catalog.riskChannels')}
          </div>
          <div className="space-y-1">
            {channels.map((ch) => (
              <ChannelRow
                key={ch.key}
                ch={ch}
                active={selectedChannel === ch.key}
                onSelect={() => { setSelectedChannel(selectedChannel === ch.key ? null : ch.key); }}
              />
            ))}
          </div>
        </div>
      </div>

      <div
        className="grid grid-cols-2 gap-x-4 gap-y-2 pt-3 border-t"
        style={{ borderColor: 'var(--border-muted)' }}
      >
        <MiniStat label={t('stat.directDependents')} value={directCount} />
        <MiniStat label={t('stat.transitive')} value={total} />
        <MiniStat label={t('stat.publicApiHits')} value={blast.publicApiHits.length}
                  valueClass={blast.publicApiHits.length > 0 ? `text-[${C.warning}]` : ''} />
        <MiniStat label={t('stat.testHits')} value={blast.testHits.length} />
      </div>

      {/* Lower section: blast hops by default, channel evidence when selected. */}
      {selectedChannel === null ? (
        <>
          {grouped.length === 0 && (
            <Note>{t('focus.blastEmpty')}</Note>
          )}
          {grouped.map(([hop, ids]) => {
            const visible = ids.slice(0, 20);
            const overflow = ids.length - visible.length;
            return (
              <Section key={hop} title={t('focus.blastHop', { hop, count: ids.length })}>
                {visible.map((id) => {
                  const f = repo.files[id];
                  if (!f) return null;
                  return <FileRow key={id} f={f} />;
                })}
                {overflow > 0 && (
                  <div
                    className="text-[10px] italic px-2 py-1"
                    style={{ color: 'var(--fg-subtle)' }}
                  >
                    {t('focus.blastMore', { count: overflow })}
                  </div>
                )}
              </Section>
            );
          })}
          <Note>
            {t('focus.blastFooter')}
          </Note>
        </>
      ) : (
        <ChannelHits
          summary={channels.find((c) => c.key === selectedChannel)!}
        />
      )}
    </div>
  );
}

const CHANNEL_LABEL_KEY: Record<RiskChannelKey, string> = {
  taint: 'catalog.channelTaint',
  race: 'catalog.channelRace',
  typestate: 'catalog.channelTypestate',
  vuln: 'catalog.channelVuln',
  layer: 'catalog.channelLayer',
  publicApi: 'catalog.channelPublicApi',
};

function ChannelRow({
  ch, active, onSelect,
}: { ch: RiskChannelSummary; active: boolean; onSelect: () => void }) {
  const { t } = useTranslation('inspect');
  const band = severityBand(ch.severity);
  const dim = ch.count === 0;
  const toneStyle: React.CSSProperties =
    band === 'high'
      ? {
          background: 'rgb(from var(--intent-danger-vivid) r g b / 0.15)',
          color: 'var(--intent-danger-vivid)',
          borderColor: 'rgb(from var(--intent-danger-vivid) r g b / 0.30)',
        }
      : band === 'medium'
      ? {
          background: 'rgb(from var(--intent-warn-vivid) r g b / 0.15)',
          color: 'var(--intent-warn-vivid)',
          borderColor: 'rgb(from var(--intent-warn-vivid) r g b / 0.30)',
        }
      : {
          background: 'var(--bg-surface-muted)',
          color: 'var(--fg-muted)',
          borderColor: 'var(--border-default)',
        };
  return (
    <button
      type="button"
      onClick={ch.count > 0 ? onSelect : undefined}
      disabled={ch.count === 0}
      className={`w-full flex items-center justify-between gap-2 px-2 py-1 rounded-md border text-[10px] transition-colors ${
        dim ? 'opacity-50' : 'hover:brightness-110'
      } ${active ? 'ring-1' : ''}`}
      style={{
        ...toneStyle,
        ...(active ? { boxShadow: '0 0 0 1px var(--border-strong)' } : null),
      }}
    >
      <span className="font-bold uppercase tracking-[0.18em] text-[9px]">{t(CHANNEL_LABEL_KEY[ch.key])}</span>
      <div className="flex items-center gap-1.5">
        {ch.count > 0 ? (
          <>
            <span className="font-mono tabular-nums text-[10px]">{ch.count}</span>
            <span className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1 h-1 rounded-full"
                  style={
                    i < Math.min(3, ch.count)
                      ? { background: 'currentColor' }
                      : { background: 'var(--border-default)' }
                  }
                />
              ))}
            </span>
          </>
        ) : (
          <span className="font-mono text-[9px]">·</span>
        )}
      </div>
    </button>
  );
}

function ChannelHits({ summary }: { summary: RiskChannelSummary }) {
  const { t } = useTranslation('inspect');
  const name = t(CHANNEL_LABEL_KEY[summary.key]);
  return (
    <div className="space-y-1.5">
      <SectionHeader
        title={t('catalog.channelHitsTitle', { name, count: summary.count })}
      />
      {summary.hits.length === 0 && (
        <Empty>{t('catalog.riskNoIssue')}</Empty>
      )}
      {summary.hits.map((h, i) => (
        <div
          key={`${summary.key}-${i}`}
          className="px-2.5 py-1.5 rounded-md border text-[10px]"
          style={{
            background: 'var(--bg-surface-muted)',
            borderColor: 'var(--border-default)',
          }}
        >
          <div className="font-mono leading-snug break-all">{h.label}</div>
          <div className="flex items-center gap-2 mt-0.5">
            <SeverityChip severity={h.severity} />
            {h.depth !== undefined && (
              <span
                className="text-[9px] font-mono"
                style={{ color: 'var(--fg-subtle)' }}
              >depth {h.depth}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function SeverityChip({ severity }: { severity: number }) {
  const band = severityBand(severity);
  const style: React.CSSProperties =
    band === 'high'
      ? { background: 'rgb(from var(--intent-danger-vivid) r g b / 0.20)', color: 'var(--intent-danger-vivid)' }
      : band === 'medium'
      ? { background: 'rgb(from var(--intent-warn-vivid) r g b / 0.20)', color: 'var(--intent-warn-vivid)' }
      : { background: 'rgb(from var(--intent-success-fg) r g b / 0.20)', color: 'var(--intent-success-fg)' };
  return (
    <span
      className="px-1.5 py-0.5 rounded-md font-mono text-[9px] uppercase tracking-[0.18em]"
      style={style}
    >
      {band} · {(severity * 100).toFixed(0)}%
    </span>
  );
}

// ─── PROOF: planner trace + freshness + replay capsule ──────────────

function ProofTab({ file }: { file: FileRecord }) {
  const { t } = useTranslation('inspect');
  const fresh = useMemo(() => proofFreshness(file), [file]);
  const trace = useMemo(() => plannerTrace(file), [file]);
  const lines = useMemo(() => buildEvidenceTrace(file, t), [file, t]);

  const trustColor =
    fresh.trust === 'green' ? C.ok :
    fresh.trust === 'amber' ? C.warning : C.critical;

  return (
    <div className="space-y-4">
      {/* Trust strip */}
      <div
        className="grid grid-cols-2 gap-2 px-3 py-2.5 rounded-xl border text-[10px]"
        style={{
          background: 'var(--bg-surface-muted)',
          borderColor: 'var(--border-default)',
        }}
      >
        <div>
          <div
            className="text-[9px] font-black uppercase tracking-[0.18em]"
            style={{ color: 'var(--fg-subtle)' }}
          >
            {t('catalog.proofTrust')}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: trustColor, boxShadow: `0 0 6px ${trustColor}` }} />
            <span className="font-bold uppercase">{fresh.trust}</span>
          </div>
        </div>
        <div>
          <div
            className="text-[9px] font-black uppercase tracking-[0.18em]"
            style={{ color: 'var(--fg-subtle)' }}
          >
            {t('catalog.proofFreshness')}
          </div>
          <div className="mt-0.5 font-mono">{fresh.freshnessClass}</div>
        </div>
        <div>
          <div
            className="text-[9px] font-black uppercase tracking-[0.18em]"
            style={{ color: 'var(--fg-subtle)' }}
          >
            {t('catalog.proofEnvelope')}
          </div>
          <div className="mt-0.5 font-bold">{fresh.verifiedEnvelope ? t('focus.yes') : t('focus.no')}</div>
        </div>
        <div>
          <div
            className="text-[9px] font-black uppercase tracking-[0.18em]"
            style={{ color: 'var(--fg-subtle)' }}
          >
            {t('catalog.proofReplay')}
          </div>
          <div className="mt-0.5 font-bold">{fresh.replayAvailable ? t('focus.yes') : t('focus.no')}</div>
        </div>
      </div>

      {/* Planner trace */}
      <div>
        <SectionHeader
          title={t('catalog.plannerTrace')}
          sub={t('catalog.plannerTraceSub')}
        />
        <div className="mt-1.5 space-y-1">
          {trace.map((c, i) => (
            <PlannerRow key={`${c.capability}-${c.algorithm}-${i}`} cand={c} />
          ))}
        </div>
      </div>

      {/* Witness lines (legacy evidence trace) */}
      <div>
        <div
          className="text-[9px] uppercase tracking-[0.18em] mb-2"
          style={{ color: 'var(--fg-subtle)' }}
        >
          {t('focus.evidenceTrace')}
        </div>
        <div className="space-y-1 font-mono text-[10px]">
          {lines.map((l, i) => (
            <div key={l} className="flex gap-2" style={{ color: 'var(--fg-muted)' }}>
              <span
                className="shrink-0 w-5 text-right"
                style={{ color: 'var(--fg-subtle)', opacity: 0.7 }}
              >{i + 1}</span>
              <span className="flex-1">{l}</span>
            </div>
          ))}
        </div>
      </div>

      {fresh.verifiedEnvelope && (
        <button
          type="button"
          className="w-full py-2 rounded-lg text-[10px] font-black uppercase tracking-[0.18em] transition-colors hover:brightness-110"
          style={{
            background: 'rgb(from var(--intent-success-vivid) r g b / 0.15)',
            color: 'var(--intent-success-fg)',
            border: '1px solid rgb(from var(--intent-success-vivid) r g b / 0.30)',
          }}
        >
          {t('catalog.verifyBundle')}
        </button>
      )}

      <div
        className="mt-1 p-2.5 rounded-lg border text-[10px]"
        style={
          file.metrics.confidence === 'exact'
            ? {
                background: 'rgb(from var(--intent-success-vivid) r g b / 0.10)',
                borderColor: 'rgb(from var(--intent-success-vivid) r g b / 0.30)',
                color: 'var(--intent-success-fg)',
              }
            : {
                background: 'rgb(from var(--intent-warn-vivid) r g b / 0.10)',
                borderColor: 'rgb(from var(--intent-warn-vivid) r g b / 0.30)',
                color: 'var(--intent-warn-fg)',
              }
        }
      >
        {t('focus.resultIs')} <b>{file.metrics.confidence}</b>. {file.metrics.confidence === 'exact'
          ? t('focus.evidenceConverged')
          : t('focus.evidenceApproximate')}
      </div>
    </div>
  );
}

function PlannerRow({
  cand,
}: {
  cand: { algorithm: string; capability: string; selected: boolean; reason: string; precisionClass: 'exact' | 'overapprox' | 'unknown' };
}) {
  const { t } = useTranslation('inspect');
  const dotColor = cand.precisionClass === 'exact' ? C.ok : cand.precisionClass === 'overapprox' ? C.warning : C.critical;
  return (
    <div
      className="px-2 py-1.5 rounded-md border text-[10px]"
      style={
        cand.selected
          ? { background: 'var(--bg-elevated)', borderColor: 'var(--border-strong)' }
          : { background: 'var(--bg-surface-muted)', borderColor: 'var(--border-muted)', opacity: 0.65 }
      }
    >
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dotColor }} />
        <span className="font-mono font-bold flex-1 truncate">{cand.algorithm}</span>
        <span
          className="shrink-0 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-[0.18em]"
          style={
            cand.selected
              ? { background: 'rgb(from var(--intent-success-fg) r g b / 0.20)', color: 'var(--intent-success-fg)' }
              : { background: 'var(--bg-elevated)', color: 'var(--fg-subtle)' }
          }
        >
          {cand.selected ? t('catalog.plannerSelected') : t('catalog.plannerRejected')}
        </span>
      </div>
      <div
        className="mt-0.5 ml-3.5 font-mono text-[9px]"
        style={{ color: 'var(--fg-subtle)' }}
      >
        {cand.capability} · <span className="italic">{cand.reason}</span>
      </div>
    </div>
  );
}

function buildEvidenceTrace(f: FileRecord, t: (k: string, opts?: Record<string, unknown>) => string): string[] {
  const lines: string[] = [];
  lines.push(t('evidence.indexedAt', { days: f.metrics.daysSinceTouched, state: f.metrics.indexState }));
  lines.push(t('evidence.detectedLanguage', { language: f.language, layer: f.layer, owner: f.owner }));
  if (f.metrics.cyclic) lines.push(t('evidence.importCycle'));
  if (f.metrics.fanIn > 0) lines.push(t('evidence.reverseRefs', { count: f.metrics.fanIn }));
  if (f.metrics.unknownReasons.length > 0) {
    for (const r of f.metrics.unknownReasons) lines.push(t('evidence.fallback', { reason: r }));
  }
  if (f.metrics.security) lines.push(t('evidence.sastFlagged'));
  if (f.metrics.publicApi) lines.push(t('evidence.publicApi'));
  lines.push(t('evidence.coverage', { line: f.metrics.lineCoverage, branch: f.metrics.branchCoverage, mut: f.metrics.mutationScore }));
  lines.push(t('evidence.editSafety', { value: f.metrics.editSafety }));
  return lines;
}

// ─── shared primitives (unchanged from previous panel) ────────────────

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div>
      <div
        className="text-[9px] font-black uppercase tracking-[0.18em]"
        style={{ color: 'var(--fg-subtle)' }}
      >
        {title}
      </div>
      {sub && (
        <div
          className="text-[9px] mt-0.5"
          style={{ color: 'var(--fg-subtle)', opacity: 0.7 }}
        >{sub}</div>
      )}
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="px-3 py-2.5 rounded-xl border text-[10px] leading-relaxed"
      style={{
        background: 'var(--bg-surface-muted)',
        borderColor: 'var(--border-default)',
        color: 'var(--fg-muted)',
      }}
    >
      {children}
    </div>
  );
}

function Bar({ label, value, max, bad = false }: { label: string; value: number; max: number; bad?: boolean }) {
  const fillBg = bad ? 'var(--intent-danger-vivid)' : 'var(--fg-default)';
  const valueColor = bad ? 'var(--intent-danger-vivid)' : undefined;
  return (
    <div>
      <div className="flex justify-between text-[10px] mb-1">
        <span style={{ color: 'var(--fg-muted)' }}>{label}</span>
        <span className="font-bold tabular-nums" style={valueColor ? { color: valueColor } : undefined}>{value}</span>
      </div>
      <div
        className="w-full h-1.5 rounded-full overflow-hidden"
        style={{ background: 'var(--bg-elevated)' }}
      >
        <div
          style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: fillBg }}
          className="h-full rounded-full"
        />
      </div>
    </div>
  );
}

function MiniStat({ label, value, valueClass }: { label: string; value: string | number; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between text-[10px]" style={{ color: 'var(--fg-muted)' }}>
      <span>{label}</span>
      <span
        className={`font-bold tabular-nums ${valueClass ?? ''}`}
        style={valueClass ? undefined : { color: 'var(--fg-default)' }}
      >{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        className="text-[9px] font-black uppercase tracking-[0.18em] mb-1.5"
        style={{ color: 'var(--fg-subtle)' }}
      >
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[10px] italic px-2 py-1"
      style={{ color: 'var(--fg-subtle)', opacity: 0.7 }}
    >{children}</div>
  );
}

function FileRow({ f }: { f: FileRecord }) {
  return (
    <div
      className="flex items-center justify-between px-2 py-1 rounded-md text-[10px] hover-surface"
      style={{ background: 'var(--bg-surface-muted)' }}
    >
      <span className="font-mono truncate">{f.folderPath}/{f.name}</span>
      <ConfDot c={f.metrics.confidence} />
    </div>
  );
}
function ConfDot({ c }: { c: Confidence }) {
  const bg = c === 'exact' ? C.ok : c === 'overapprox' ? C.warning : c === 'unknown' ? C.critical : '#6e7681';
  return <span className="w-2 h-2 rounded-full shrink-0" style={{ background: bg, boxShadow: `0 0 6px ${bg}` }} title={c} />;
}

function ProposalRow({ ok, title, detail }: { ok: boolean; title: string; detail: string }) {
  return (
    <div
      className="flex items-start gap-2 px-2 py-1.5 rounded-md text-[10px]"
      style={
        ok
          ? { background: 'rgb(from var(--intent-success-vivid) r g b / 0.10)' }
          : { background: 'var(--bg-surface-muted)' }
      }
    >
      <span
        className="mt-0.5 w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: ok ? 'var(--intent-success-vivid)' : 'var(--fg-subtle)', opacity: ok ? 1 : 0.5 }}
      />
      <div className="min-w-0">
        <div
          className="font-bold"
          style={ok ? undefined : { color: 'var(--fg-subtle)' }}
        >{title}</div>
        <div style={{ color: 'var(--fg-subtle)' }}>{detail}</div>
      </div>
    </div>
  );
}

function ActionPill({ label, icon: Icon }: { label: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-[0.18em] transition-colors hover-surface"
      style={{ background: 'var(--bg-elevated)', color: 'var(--fg-muted)' }}
    >
      <Icon className="w-2.5 h-2.5" />
      {label}
    </button>
  );
}

function Badge({
  children, kind, conf, safety,
}: {
  children: React.ReactNode;
  kind: 'STABLE' | 'MODIFIED' | 'NEW' | 'SECURITY_ALERT' | 'confidence' | 'safety';
  conf?: Confidence;
  safety?: number;
}) {
  let style: React.CSSProperties = {};
  if (kind === 'confidence' && conf) {
    style = conf === 'exact'
      ? { background: 'rgb(from var(--intent-success-fg) r g b / 0.20)', color: 'var(--intent-success-fg)' }
      : conf === 'overapprox'
      ? { background: 'rgb(from var(--intent-warn-vivid) r g b / 0.20)', color: 'var(--intent-warn-vivid)' }
      : conf === 'unknown'
      ? { background: 'rgb(from var(--intent-danger-vivid) r g b / 0.20)', color: 'var(--intent-danger-vivid)' }
      : { background: 'var(--bg-elevated)', color: 'var(--fg-muted)' };
  } else if (kind === 'safety' && safety !== undefined) {
    style = safety >= 70
      ? { background: 'rgb(from var(--intent-success-fg) r g b / 0.20)', color: 'var(--intent-success-fg)' }
      : safety >= 40
      ? { background: 'rgb(from var(--intent-warn-vivid) r g b / 0.20)', color: 'var(--intent-warn-vivid)' }
      : { background: 'rgb(from var(--intent-danger-vivid) r g b / 0.20)', color: 'var(--intent-danger-vivid)' };
  } else if (kind === 'SECURITY_ALERT') {
    style = { background: 'rgb(from var(--intent-danger-vivid) r g b / 0.20)', color: 'var(--intent-danger-vivid)' };
  } else if (kind === 'NEW') {
    style = { background: 'rgb(from var(--intent-success-vivid) r g b / 0.25)', color: 'var(--intent-success-vivid)' };
  } else if (kind === 'MODIFIED') {
    style = { background: 'rgb(from var(--intent-success-vivid) r g b / 0.15)', color: 'var(--intent-success-vivid)' };
  } else {
    style = { background: 'var(--bg-elevated)', color: 'var(--fg-muted)' };
  }

  return (
    <span
      className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-[0.18em]"
      style={style}
    >
      {children}
    </span>
  );
}

