import { useMemo, useState } from 'react';
import { Wand2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { functionSummary, type FileRecord } from '@entities/repo';
import { C } from '@shared/lib';
import { useTranslation } from '@shared/i18n';
import { MiniStat, SectionHeader } from './shared';
import { IndexStateBox } from './IndexStateBox';
import { AiContextBox } from './AiContextBox';
import { RefactorActionsBox } from './RefactorActionsBox';
import { BlastRadiusBox } from './BlastRadiusBox';
import { SymbolTimeMachine } from './SymbolTimeMachine';
import { SemanticConflictCard } from './SemanticConflictCard';
import { SafeRenameCard } from './SafeRenameCard';

// ─── PROFILE: file outline + health + refactor verdict ────────────────
//
// "What is this file?" — function summary, health bars, refactor verdict.
// All helpers used only by this tab live in this file (RefactorBlock,
// FunctionRow, ProposalRow, ActionPill, Bar, effectChipStyle).

export function ProfileTab({ file }: { file: FileRecord }) {
  const { t } = useTranslation('inspect');
  const churnPct = Math.round(file.metrics.churn * 100);
  const summary = useMemo(() => functionSummary(file), [file]);

  return (
    <div className="space-y-4">
      {/* Engine identity strip — three boxes that surface the parts of
          this product no static-analysis dashboard does: the live state
          of the incremental engine for this file, what an AI agent can
          safely reason about here, and the concrete patches the engine
          can apply right now. Kept above the static metrics so the
          differentiated view leads. */}
      <IndexStateBox file={file} />
      <BlastRadiusBox file={file} />
      <AiContextBox file={file} />

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

      {/* Refactor actions — concrete, applicable patches with confidence
          and blast radius. Replaces the prior advisory-only block as the
          primary "what can we do here?" surface. */}
      <RefactorActionsBox file={file} />

      {/* SOTA++ trio — git × graph × AST fusion that no static-analysis
          dashboard does. Order matters: rename safety leads (the most
          common action), then time-travel to understand what got us
          here, then the conflict radar before merging. */}
      <SafeRenameCard file={file} />
      <SymbolTimeMachine file={file} />
      <SemanticConflictCard file={file} />

      {/* Legacy verdict block — kept (collapsed) for the qualitative
          take that complements the action list. */}
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
