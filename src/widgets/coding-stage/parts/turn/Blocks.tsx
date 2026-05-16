import { useEffect, useMemo, useState } from 'react';
import {
  FileCode, Terminal, Search, Sparkles, Globe,
  ChevronRight, Check, Brain, ArrowRight, GitPullRequest,
  CheckCircle2, XCircle, Loader2, Copy, ExternalLink,
  Eye, FileEdit, AlertCircle, MessageSquare, HelpCircle, Plus,
  GitCompareArrows, Columns2, AlignLeft, Wand2, Zap,
} from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import type {
  AgentBlock, ToolBlock, DiffBlock, TextBlock, ThinkingBlock, PlanBlock, CodingFileChange,
  HunkComment, DiffPreviewBlock, CodingDiffHunk,
} from '../types';

// Each block knows how to render itself. Tool blocks expand inline to show
// terminal output; diff blocks expand each file to show hunks. The
// expandability is local UI state — refreshing the page would reset it.

export function BlockView({ block, isDark }: { block: AgentBlock; isDark: boolean }) {
  if (block.kind === 'text') return <TextBlockView block={block} isDark={isDark} />;
  if (block.kind === 'thinking') return <ThinkingBlockView block={block} isDark={isDark} />;
  if (block.kind === 'plan') return <PlanBlockView block={block} isDark={isDark} />;
  if (block.kind === 'tool') return <ToolBlockView block={block} isDark={isDark} />;
  if (block.kind === 'diff-preview') return <DiffPreviewBlockView block={block} isDark={isDark} />;
  return <DiffBlockView block={block} isDark={isDark} />;
}

// ─── text ─────────────────────────────────────────────────────────────────

function TextBlockView({ block, isDark }: { block: TextBlock; isDark: boolean }) {
  const color = isDark ? 'text-white/85' : 'text-black/85';
  // Tiny inline-code formatter: anything between backticks gets a chip.
  const parts = block.text.split(/(`[^`]+`)/g);
  return (
    <div className={`text-[13px] leading-[1.65] ${color} whitespace-pre-wrap break-words`}>
      {parts.map((p, i) =>
        p.startsWith('`') && p.endsWith('`') && p.length > 2 ? (
          <code
            key={i}
            style={{ color: 'var(--intent-success-fg)' }}
            className={`mx-px px-1 py-px rounded-md text-[12px] font-mono ${
              isDark
                ? 'bg-white/[0.08] border border-white/[0.06]'
                : 'bg-black/[0.05] border border-black/[0.05]'
            }`}
          >
            {p.slice(1, -1)}
          </code>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </div>
  );
}

// ─── thinking ─────────────────────────────────────────────────────────────

function ThinkingBlockView({ block, isDark }: { block: ThinkingBlock; isDark: boolean }) {
  const { t } = useTranslation('coding');
  const [open, setOpen] = useState(false);
  const seconds = (block.durationMs / 1000).toFixed(1);
  const muted = isDark ? 'text-white/40' : 'text-black/55';
  const faint = isDark ? 'text-white/30' : 'text-black/40';
  return (
    <div>
      <button type="button"
        onClick={() => { setOpen((v) => !v); }}
        className={`group flex items-center gap-1.5 text-[11px] font-medium transition-colors ${muted} hover:${isDark ? 'text-white/70' : 'text-black/70'}`}
      >
        <Brain className="w-3 h-3" />
        <span>{t('block.thoughtFor', { seconds })}</span>
        <ChevronRight className={`w-3 h-3 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div
          className={`mt-1.5 ml-4 pl-3 border-l text-[12px] leading-[1.6] italic ${
            isDark ? 'border-white/[0.08] text-white/55' : 'border-black/[0.08] text-black/55'
          }`}
        >
          {block.text}
        </div>
      )}
      {!open && (
        <div className={`ml-4 mt-0.5 text-[11px] ${faint} italic line-clamp-1`}>
          {block.text}
        </div>
      )}
    </div>
  );
}

// ─── plan ─────────────────────────────────────────────────────────────────

function PlanBlockView({ block, isDark }: { block: PlanBlock; isDark: boolean }) {
  const { t } = useTranslation('coding');
  // Local-only checkbox state. Real impl would dispatch to the agent
  // and the agent would echo it back as a plan-block patch. We mirror
  // the seed (`item.done`) so already-done items stay ticked.
  const [done, setDone] = useState<Record<string, boolean>>(() => {
    const seed: Record<string, boolean> = {};
    block.items.forEach((it) => { seed[it.id] = it.done; });
    return seed;
  });
  // Auto-advance: when a step flips to done, the next pending step's
  // text is dispatched as a custom event the parent (CodingStage)
  // listens for and feeds into the composer. Opt-in via a tiny toggle
  // so users who want to drive the plan manually aren't surprised.
  const [autoAdvance, setAutoAdvance] = useState(false);

  const doneCount = block.items.filter((it) => done[it.id]).length;
  const total = block.items.length;
  const card = isDark
    ? 'bg-gradient-to-b from-white/[0.04] to-white/[0.015] border-white/[0.08]'
    : 'bg-gradient-to-b from-black/[0.025] to-transparent border-black/[0.08]';
  const labelColor = isDark ? 'text-white/85' : 'text-black/85';
  const sub = isDark ? 'text-white/40' : 'text-black/55';
  const checkOff = isDark ? 'border-white/15 hover:border-white/40' : 'border-black/15 hover:border-black/40';
  const checkOnStyle: React.CSSProperties = {
    background: 'var(--intent-success-vivid)',
    borderColor: 'var(--intent-success-vivid)',
  };
  const dotIdle = isDark ? 'bg-white/[0.10]' : 'bg-black/[0.10]';
  const dotOnStyle: React.CSSProperties = { background: 'var(--intent-success-vivid)' };

  function toggle(id: string) {
    const wasDone = done[id];
    const nextDone = !wasDone;
    setDone((cur) => ({ ...cur, [id]: nextDone }));
    if (autoAdvance && nextDone) {
      // Find the next not-yet-done item *after* this one.
      const idx = block.items.findIndex((it) => it.id === id);
      const next = block.items.slice(idx + 1).find((it) => !done[it.id] && it.id !== id);
      if (next != null) {
        // Dispatch on window so CodingStage (the only listener) can
        // pick it up without us threading a callback through Blocks.
        window.dispatchEvent(new CustomEvent('coding:plan-advance', {
          detail: { nextText: next.text, planTitle: block.title },
        }));
      }
    }
  }

  return (
    <div className={`rounded-lg border ${card} p-3`}>
      <div className="flex items-center gap-2 mb-2.5">
        <Sparkles className={`w-3 h-3 ${sub}`} />
        <span className={`text-[11px] font-bold uppercase tracking-[0.18em] ${sub}`}>plan</span>
        <span className={`text-[12px] font-semibold ${labelColor}`}>{block.title}</span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => { setAutoAdvance((v) => !v); }}
          aria-pressed={autoAdvance}
          title={t('autoadvance.tooltip')}
          style={autoAdvance ? {
            background: 'color-mix(in srgb, var(--intent-success-vivid) 15%, transparent)',
            color: 'var(--intent-success-fg)',
          } : undefined}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
            autoAdvance
              ? ''
              : (isDark ? 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]' : 'text-black/40 hover:text-black/70 hover:bg-black/[0.04]')
          }`}
        >
          <Zap className="w-2.5 h-2.5" />
          {t('autoadvance.label')}
        </button>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5">
            {block.items.map((item, idx) => (
              <span
                key={item.id}
                className={`block w-2 h-2 rounded-full ${done[item.id] ? 'coding-dot-pop' : dotIdle}`}
                style={done[item.id] ? { ...dotOnStyle, animationDelay: `${idx * 60}ms` } : undefined}
              />
            ))}
          </div>
          <span className={`text-[11px] font-mono ${sub} tabular-nums`}>{doneCount}/{total}</span>
        </div>
      </div>
      <ol className="space-y-1.5">
        {block.items.map((item, i) => {
          const pct = item.confidence != null ? Math.round(item.confidence * 100) : null;
          // Confidence tone: <60% reads as low (amber), 60–85% mid
          // (neutral), >85% high (subtle emerald). Threshold picked
          // from Anthropic's published self-eval calibration: their
          // models cluster around 0.7 when answering correctly and
          // 0.55 when wrong, so 0.6 is the practical decision line.
          const confidenceStyle: React.CSSProperties | undefined = pct == null ? undefined
            : pct >= 85 ? { color: 'color-mix(in srgb, var(--intent-success-fg) 85%, transparent)' }
            : pct >= 60 ? undefined
            : { color: 'color-mix(in srgb, var(--intent-warn-fg) 85%, transparent)' };
          const confidenceTone = pct == null ? null
            : pct >= 60 && pct < 85 ? sub
            : '';
          return (
            <li key={item.id} className="flex items-start gap-2">
              <button
                type="button"
                onClick={() => { toggle(item.id); }}
                aria-pressed={done[item.id]}
                style={done[item.id] ? checkOnStyle : undefined}
                className={`mt-0.5 inline-flex items-center justify-center w-4 h-4 rounded-[5px] border shrink-0 transition-colors cursor-pointer ${
                  done[item.id] ? '' : checkOff
                }`}
              >
                {done[item.id] && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
              </button>
              <div className="flex-1 min-w-0">
                <span className={`text-[12px] leading-relaxed ${
                  done[item.id]
                    ? (isDark ? 'text-white/40 line-through' : 'text-black/40 line-through')
                    : labelColor
                }`}>
                  <span className={`mr-1.5 font-mono text-[11px] ${sub}`}>{i + 1}.</span>
                  {item.text}
                </span>
                {(pct != null || item.estTokens != null || item.estSeconds != null) && (
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] font-mono">
                    {pct != null && (
                      <span
                        style={confidenceStyle}
                        className={confidenceTone ?? sub}
                        title={pct < 60 ? t('planMeta.lowConfidence') : t('planMeta.confidence', { pct })}
                      >
                        {t('planMeta.confidence', { pct })}
                      </span>
                    )}
                    {item.estTokens != null && (
                      <span className={sub}>{t('planMeta.estTokens', { n: item.estTokens.toLocaleString() })}</span>
                    )}
                    {item.estSeconds != null && (
                      <span className={sub}>{t('planMeta.estTime', { n: item.estSeconds })}</span>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ─── tool ─────────────────────────────────────────────────────────────────

const TOOL_META = {
  read:   { Icon: FileCode, label: 'read',   color: 'var(--fg-link)' },
  edit:   { Icon: FileCode, label: 'edit',   color: 'var(--intent-success-fg)' },
  run:    { Icon: Terminal, label: 'run',    color: 'var(--intent-warn-fg)' },
  search: { Icon: Search,   label: 'search', color: 'var(--brand-fg)' },
  plan:   { Icon: Sparkles, label: 'plan',   color: 'var(--intent-danger-fg)' },
  web:    { Icon: Globe,    label: 'web',    color: 'var(--fg-link)' },
} as const;

function ToolBlockView({ block, isDark }: { block: ToolBlock; isDark: boolean }) {
  const [open, setOpen] = useState(false);
  const meta = TOOL_META[block.tool];
  const Icon = meta.Icon;
  const toneStyle: React.CSSProperties = { color: meta.color };
  const card = isDark ? 'bg-white/[0.025] border-white/[0.06] hover:border-white/[0.12]' : 'bg-white border-black/[0.06] hover:border-black/[0.12]';
  const textPrimary = isDark ? 'text-white/85' : 'text-black/85';
  const textFaint = isDark ? 'text-white/40' : 'text-black/40';
  const StatusIcon = block.status === 'fail' ? XCircle : block.status === 'running' ? Loader2 : CheckCircle2;
  const statusStyle: React.CSSProperties = block.status === 'fail'
    ? { color: 'var(--intent-danger-fg)' }
    : block.status === 'running'
      ? { color: 'var(--intent-warn-fg)' }
      : { color: 'var(--intent-success-fg)' };
  const statusClass = block.status === 'running' ? 'animate-spin' : '';

  return (
    <div className={`rounded-md border overflow-hidden transition-colors ${card}`}>
      <button type="button"
        onClick={() => { if (block.output) setOpen((v) => !v); }}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left"
      >
        <Icon style={toneStyle} className="w-3 h-3 shrink-0" />
        <span style={toneStyle} className="uppercase tracking-[0.18em] text-[9px] font-bold shrink-0">
          {meta.label}
        </span>
        <span className={`flex-1 truncate font-mono text-[12px] ${textPrimary}`}>{block.label}</span>
        {block.detail && (
          <span className={`shrink-0 font-mono text-[11px] ${textFaint}`}>{block.detail}</span>
        )}
        {block.status && (
          <StatusIcon style={statusStyle} className={`w-3 h-3 shrink-0 ${statusClass}`} />
        )}
        {block.output && (
          <ChevronRight className={`w-3 h-3 shrink-0 transition-transform ${textFaint} ${open ? 'rotate-90' : ''}`} />
        )}
      </button>
      {open && block.output && (
        <div className={`border-t ${isDark ? 'border-white/[0.06] bg-black/40' : 'border-black/[0.05] bg-black/[0.92]'}`}>
          <pre className={`px-3 py-2 text-[11px] leading-[1.55] font-mono overflow-x-auto whitespace-pre ${
            isDark ? 'text-white/70' : 'text-white/85'
          } scrollbar-thin`}>
            {block.output}
          </pre>
        </div>
      )}
      {/* Linked test failures — surfaced when the tool is a test runner
          (status === 'fail' or testResults attached). Card lists each
          failing test, expected/got, and a Jump-to-hunk action that
          dispatches a window event for the parent to scroll the diff.
          Pattern: Sentry stack-trace link to source. */}
      {block.testResults && block.testResults.failures.length > 0 && (
        <TestFailuresCard run={block.testResults} isDark={isDark} />
      )}
    </div>
  );
}

// Linked-failure summary. Above each failure, a thin gradient line
// drops down toward the next sibling (the diff) so the visual reads as
// "this failure points there" without requiring a real DOM connection.
function TestFailuresCard({
  run, isDark,
}: {
  run: NonNullable<ToolBlock['testResults']>;
  isDark: boolean;
}) {
  const { t } = useTranslation('coding');
  const muted = isDark ? 'text-white/55' : 'text-black/55';
  const faint = isDark ? 'text-white/35' : 'text-black/40';
  const heading = isDark ? 'text-white/85' : 'text-black/85';
  const border = isDark ? 'border-white/[0.06]' : 'border-black/[0.06]';
  return (
    <div
      style={{ background: 'color-mix(in srgb, var(--intent-danger-vivid) 6%, transparent)' }}
      className={`border-t ${border} px-3 py-2 space-y-1.5`}
    >
      <div
        style={{ color: 'var(--intent-danger-fg)' }}
        className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em]"
      >
        <XCircle className="w-2.5 h-2.5" />
        {t('testMap.linkedFailures')} · {run.failed} / {run.failed + run.passed}
      </div>
      {run.failures.map((f, i) => (
        <div
          key={i}
          className={`coding-test-link rounded-md border ${border} ${isDark ? 'bg-[#11141a]' : 'bg-white'} px-2 py-1.5`}
        >
          <div className={`flex items-center gap-1.5 mb-0.5`}>
            <span className={`text-[11px] font-semibold truncate ${heading}`}>{f.name}</span>
            <span className={`shrink-0 text-[9px] font-mono ${faint}`}>{f.file.split('/').pop()}</span>
          </div>
          <div className={`text-[10px] font-mono leading-relaxed ${muted}`}>{f.message}</div>
          {f.stackHits.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {f.stackHits.slice(0, 3).map((h, j) => (
                <button
                  key={j}
                  type="button"
                  onClick={() => {
                    // Dispatch global event the parent thread can use
                    // to scroll into the matching hunk. No-op when no
                    // listener — safe.
                    window.dispatchEvent(new CustomEvent('coding:jump-to-hunk', {
                      detail: { file: h.file, line: h.line, hunkId: h.hunkId },
                    }));
                  }}
                  className={`inline-flex items-center gap-1 px-1.5 py-px rounded text-[9.5px] font-mono transition-colors ${
                    isDark
                      ? 'bg-white/[0.05] text-white/70 hover:text-[var(--intent-danger-fg)]'
                      : 'bg-black/[0.04] text-black/70 hover:text-[var(--intent-danger-fg)]'
                  }`}
                  title={t('testMap.jumpToHunk')}
                >
                  <ArrowRight className="w-2.5 h-2.5" />
                  {h.file.split('/').pop()}:{h.line}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── diff ─────────────────────────────────────────────────────────────────

type DiffViewMode = 'unified' | 'split';

function DiffBlockView({ block, isDark }: { block: DiffBlock; isDark: boolean }) {
  const { t } = useTranslation('coding');
  const [applied, setApplied] = useState(block.applied === 'applied');
  // View mode lives at the block level so toggling once affects every
  // file in the diff at the same time. Persist across re-renders only
  // for this block instance — refreshing the page resets to unified.
  const [viewMode, setViewMode] = useState<DiffViewMode>('unified');
  const textMuted = isDark ? 'text-white/55' : 'text-black/55';
  const textFaint = isDark ? 'text-white/40' : 'text-black/40';
  const card = isDark ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-white border-black/[0.08]';
  const headerBorder = isDark ? 'border-white/[0.06]' : 'border-black/[0.05]';

  const stateBadgeStyle: React.CSSProperties | undefined = applied
    ? {
        background: 'var(--intent-success-bg)',
        color: 'var(--intent-success-fg)',
        borderColor: 'color-mix(in srgb, var(--intent-success-vivid) 20%, transparent)',
      }
    : undefined;
  const stateBadge = applied
    ? ''
    : (isDark
        ? 'bg-white/[0.05] text-white/65 border-white/[0.10]'
        : 'bg-black/[0.04] text-black/65 border-black/[0.10]');
  const StateIcon = applied ? FileEdit : Eye;

  return (
    <div className={`rounded-lg border overflow-hidden ${card} shadow-[0_1px_3px_rgba(0,0,0,0.04)]`}>
      <div className={`flex items-center gap-2 px-3 py-2 border-b ${headerBorder}`}>
        <GitPullRequest className={`w-3 h-3 ${textMuted}`} />
        <span className={`text-[11px] font-bold uppercase tracking-[0.18em] ${textFaint}`}>
          changes
        </span>
        <span className={`text-[11px] font-mono ${textMuted}`}>
          {block.files.length} {block.files.length === 1 ? t('block.fileOne') : t('block.fileMany')}
        </span>
        <span
          style={stateBadgeStyle}
          className={`inline-flex items-center gap-1 px-1.5 py-px rounded-md text-[9px] font-bold uppercase tracking-[0.18em] border ${stateBadge}`}
        >
          <StateIcon className="w-2.5 h-2.5" />
          {applied ? t('apply.applied') : t('apply.suggested')}
        </span>
        <div className="flex-1" />
        {/* unified ↔ split toggle. Two-button segmented control rather
            than a dropdown — the choice is binary and the icons tell the
            story without a label. */}
        <div className={`flex items-center gap-px rounded-md p-px ${
          isDark ? 'bg-white/[0.04]' : 'bg-black/[0.04]'
        }`} title={t('diffView.toggleTooltip')}>
          <button
            type="button"
            onClick={() => { setViewMode('unified'); }}
            aria-pressed={viewMode === 'unified'}
            title={t('diffView.unified')}
            className={`p-1 rounded transition-colors ${
              viewMode === 'unified'
                ? (isDark ? 'bg-white/[0.10] text-white' : 'bg-white text-black shadow-sm')
                : (isDark ? 'text-white/40 hover:text-white/70' : 'text-black/40 hover:text-black/70')
            }`}
          >
            <AlignLeft className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => { setViewMode('split'); }}
            aria-pressed={viewMode === 'split'}
            title={t('diffView.split')}
            className={`p-1 rounded transition-colors ${
              viewMode === 'split'
                ? (isDark ? 'bg-white/[0.10] text-white' : 'bg-white text-black shadow-sm')
                : (isDark ? 'text-white/40 hover:text-white/70' : 'text-black/40 hover:text-black/70')
            }`}
          >
            <Columns2 className="w-3 h-3" />
          </button>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono tabular-nums">
          <span style={{ color: 'var(--intent-success-vivid)' }} className="coding-num-rise">+{block.added}</span>
          <span style={{ color: 'var(--intent-danger-vivid)', animationDelay: '60ms' }} className="coding-num-rise">−{block.removed}</span>
        </div>
      </div>

      <div className={isDark ? 'divide-y divide-white/[0.04]' : 'divide-y divide-black/[0.04]'}>
        {block.files.map((file) => (
          <FileRow key={file.path} file={file} isDark={isDark} viewMode={viewMode} />
        ))}
      </div>

      <div className={`flex items-start gap-2 px-3 py-2 border-t ${headerBorder} ${
        isDark ? 'bg-white/[0.015]' : 'bg-black/[0.015]'
      }`}>
        <AlertCircle className={`w-3 h-3 shrink-0 mt-0.5 ${textFaint}`} />
        <span className={`text-[10px] leading-relaxed ${textMuted}`}>
          {applied ? t('apply.appliedNote') : t('apply.suggestedNote')}
        </span>
      </div>

      <div className={`flex items-center justify-between px-2.5 py-2 border-t ${headerBorder} ${
        isDark ? 'bg-white/[0.015]' : 'bg-black/[0.02]'
      }`}>
        <span className={`text-[11px] font-mono ${textFaint}`}>
          {applied ? t('apply.applied') : t('apply.previewOnly')}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            title={t('block.patch')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
              isDark ? 'text-white/55 hover:text-white hover:bg-white/[0.06]' : 'text-black/55 hover:text-black hover:bg-black/[0.06]'
            }`}
          >
            <Copy className="w-2.5 h-2.5" />
            {t('block.patch')}
          </button>
          {!applied ? (
            <button
              type="button"
              onClick={() => { setApplied(true); }}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                isDark
                  ? 'text-white/85 bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.10]'
                  : 'text-black/85 bg-black/[0.06] hover:bg-black/[0.12] border border-black/[0.10]'
              }`}
            >
              <FileEdit className="w-2.5 h-2.5" />
              {t('apply.applyToTree')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { setApplied(false); }}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                isDark ? 'text-white/55 hover:text-white hover:bg-white/[0.06]' : 'text-black/55 hover:text-black hover:bg-black/[0.06]'
              }`}
              title={t('apply.previewOnly')}
            >
              <Eye className="w-2.5 h-2.5" />
              {t('apply.previewOnly')}
            </button>
          )}
          <button
            type="button"
            style={{
              color: 'var(--intent-success-fg)',
              background: 'var(--intent-success-bg)',
              border: '1px solid color-mix(in srgb, var(--intent-success-vivid) 20%, transparent)',
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors"
          >
            <ExternalLink className="w-2.5 h-2.5" />
            {applied ? t('apply.applyAndPr') : t('block.openPr')}
            <ArrowRight className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function FileRow({
  file, isDark, viewMode = 'unified',
}: {
  file: CodingFileChange;
  isDark: boolean;
  viewMode?: DiffViewMode;
}) {
  const { t } = useTranslation('coding');
  const [open, setOpen] = useState(false);
  const [decisions, setDecisions] = useState<Record<string, 'accepted' | 'rejected' | undefined>>(() => {
    const seed: Record<string, 'accepted' | 'rejected' | undefined> = {};
    file.hunks.forEach((h, i) => {
      const key = h.id ?? `i:${i}`;
      seed[key] = h.decision;
    });
    return seed;
  });
  // Inline review comments, keyed the same way as decisions.
  const [comments, setComments] = useState<Record<string, HunkComment[]>>({});
  const [composing, setComposing] = useState<string>('');
  function addComment(key: string, text: string, kind: 'note' | 'ask') {
    if (!text.trim()) return;
    setComments((cur) => ({
      ...cur,
      [key]: [...(cur[key] ?? []), {
        id: `c-${Date.now().toString(36)}`,
        text: text.trim(),
        kind, at: 'now',
        author: 'user',
        replies: [],
      }],
    }));
    setComposing('');
    // Synthetic agent reply for "ask" comments — gives the demo a tangible
    // back-and-forth without a real model. Real impl would route the
    // question to the agent and stream the answer back.
    if (kind === 'ask') {
      setTimeout(() => {
        setComments((cur) => ({
          ...cur,
          [key]: (cur[key] ?? []).map((c, i, arr) =>
            i === arr.length - 1
              ? {
                  ...c,
                  replies: [
                    ...(c.replies ?? []),
                    {
                      id: `c-${Date.now().toString(36)}`,
                      text: '이 hunk의 변경 의도를 분석해 답변드릴게요. 더 구체적으로 알고 싶은 부분이 있다면 알려주세요.',
                      kind: 'note', at: 'now', author: 'agent',
                    },
                  ],
                }
              : c,
          ),
        }));
      }, 900);
    }
  }
  function replyToComment(key: string, parentId: string, text: string) {
    if (!text.trim()) return;
    setComments((cur) => ({
      ...cur,
      [key]: (cur[key] ?? []).map((c) =>
        c.id === parentId
          ? {
              ...c,
              replies: [
                ...(c.replies ?? []),
                {
                  id: `c-${Date.now().toString(36)}`,
                  text: text.trim(),
                  kind: 'note', at: 'now', author: 'user',
                },
              ],
            }
          : c,
      ),
    }));
  }
  function toggleResolve(key: string, commentId: string) {
    setComments((cur) => ({
      ...cur,
      [key]: (cur[key] ?? []).map((c) =>
        c.id === commentId ? { ...c, resolved: !c.resolved } : c,
      ),
    }));
  }
  const expandable = file.hunks.length > 0;
  const textPrimary = isDark ? 'text-white/85' : 'text-black/85';
  const textFaint = isDark ? 'text-white/30' : 'text-black/40';

  const acceptedCount = Object.values(decisions).filter((d) => d === 'accepted').length;
  const total = file.hunks.length;
  return (
    <div>
      <button type="button"
        disabled={!expandable}
        onClick={() => { if (expandable) setOpen((v) => !v); }}
        className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left transition-colors ${
          expandable
            ? (isDark ? 'hover:bg-white/[0.025]' : 'hover:bg-black/[0.025]')
            : ''
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {expandable && (
            <ChevronRight className={`w-3 h-3 transition-transform ${textFaint} ${open ? 'rotate-90' : ''}`} />
          )}
          {!expandable && <span className="w-3 h-3 shrink-0" />}
          <span className={`text-[11px] font-mono truncate ${textPrimary}`}>{file.path}</span>
          {expandable && acceptedCount > 0 && (
            <span
              style={{ background: 'var(--intent-success-bg)', color: 'var(--intent-success-fg)' }}
              className="shrink-0 inline-flex items-center gap-1 px-1.5 py-px rounded-md text-[9px] font-mono"
              title={t('hunk.summary', { accepted: acceptedCount, total })}
            >
              <Check className="w-2.5 h-2.5" />
              {acceptedCount}/{total}
            </span>
          )}
          {/* Drift badge — surfaces working-tree drift verdict next to
              the file name. Tones follow the standard CI lineage:
              emerald = clean, sky = shifted (auto-rebase OK), amber =
              overlap (review required), rose = gone (file deleted). */}
          {file.drift && file.drift.state !== 'clean' && (
            <DriftBadge drift={file.drift} isDark={isDark} t={t} />
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono shrink-0">
          <span style={{ color: 'var(--intent-success-vivid)' }}>+{file.added}</span>
          <span style={{ color: 'var(--intent-danger-vivid)' }}>−{file.removed}</span>
          <DiffBar added={file.added} removed={file.removed} isDark={isDark} />
        </div>
      </button>
      {open && expandable && (
        <div className={`px-3 pb-2`}>
          {file.hunks.map((hunk, i) => {
            const key = hunk.id ?? `i:${i}`;
            const decision = decisions[key];
            const isAccepted = decision === 'accepted';
            const isRejected = decision === 'rejected';
            // This specific hunk drifted? Used to render a hatch
            // overlay over the line area + a small glyph on the
            // hunk header gutter.
            const hunkDrifted = file.drift?.driftedHunkIdx?.includes(i) ?? false;
            const driftGlyph =
              file.drift?.state === 'overlap' ? '⚠'
              : file.drift?.state === 'shifted' ? '⊙'
              : file.drift?.state === 'gone' ? '✕'
              : null;
            return (
              <div key={key} className={`mt-1 rounded-md overflow-hidden border transition-opacity relative ${
                isDark ? 'border-white/[0.06]' : 'border-black/[0.06]'
              } ${isRejected ? 'opacity-45' : ''}`}>
                <div
                  className={`sticky top-0 z-10 flex items-center gap-2 px-2 py-1 text-[10px] font-mono backdrop-blur ${
                    isDark ? 'bg-[#0b0d10]/90 text-white/40' : 'bg-white/90 text-black/55'
                  }`}
                >
                  {hunkDrifted && driftGlyph && (
                    <span
                      style={{
                        color: file.drift?.state === 'overlap'
                          ? 'var(--intent-warn-fg)'
                          : file.drift?.state === 'gone'
                            ? 'var(--intent-danger-fg)'
                            : 'var(--fg-link)',
                      }}
                      className="shrink-0"
                      title={
                        file.drift?.state === 'overlap' ? t('drift.fileOverlap')
                        : file.drift?.state === 'gone' ? t('drift.fileGone')
                        : t('drift.fileShifted')
                      }
                    >
                      {driftGlyph}
                    </span>
                  )}
                  <span className="flex-1 truncate">{hunk.header}</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setDecisions((d) => ({ ...d, [key]: isAccepted ? undefined : 'accepted' })); }}
                    title={t('hunk.accept')}
                    aria-label={t('hunk.accept')}
                    aria-pressed={isAccepted}
                    style={isAccepted
                      ? { color: 'var(--intent-success-fg)', background: 'color-mix(in srgb, var(--intent-success-vivid) 15%, transparent)' }
                      : undefined}
                    className={`p-0.5 rounded transition-colors ${
                      isAccepted
                        ? ''
                        : (isDark ? 'text-white/30 hover:text-[var(--intent-success-fg)]' : 'text-black/30 hover:text-[var(--intent-success-fg)]')
                    }`}
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setDecisions((d) => ({ ...d, [key]: isRejected ? undefined : 'rejected' })); }}
                    title={t('hunk.reject')}
                    aria-label={t('hunk.reject')}
                    aria-pressed={isRejected}
                    style={isRejected
                      ? { color: 'var(--intent-danger-fg)', background: 'color-mix(in srgb, var(--intent-danger-vivid) 15%, transparent)' }
                      : undefined}
                    className={`p-0.5 rounded transition-colors ${
                      isRejected
                        ? ''
                        : (isDark ? 'text-white/30 hover:text-[var(--intent-danger-fg)]' : 'text-black/30 hover:text-[var(--intent-danger-fg)]')
                    }`}
                  >
                    <XCircle className="w-3 h-3" />
                  </button>
                </div>
                <div className="relative">
                  {/* Diagonal hatch overlay when this hunk's lines will
                      conflict on apply. Pattern from DAW clipping
                      warnings: visible enough to read as "danger zone"
                      yet keeps underlying code legible. Pointer-events
                      none so it doesn't trap clicks. */}
                  {hunkDrifted && file.drift?.state === 'overlap' && (
                    <div
                      className="coding-drift-hatch pointer-events-none absolute inset-0 z-[5]"
                      aria-hidden
                    />
                  )}
                  {viewMode === 'unified'
                    ? <UnifiedHunkBody hunk={hunk} isDark={isDark} />
                    : <SplitHunkBody hunk={hunk} isDark={isDark} />
                  }
                </div>
                <HunkCommentThread
                  hunkKey={key}
                  comments={comments[key] ?? []}
                  composing={composing === key}
                  onOpenCompose={() => { setComposing(key); }}
                  onCancelCompose={() => { setComposing(''); }}
                  onSubmit={(text, kind) => { addComment(key, text, kind); }}
                  onReply={(parentId, text) => { replyToComment(key, parentId, text); }}
                  onToggleResolve={(commentId) => { toggleResolve(key, commentId); }}
                  isDark={isDark}
                  t={t}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Inline review thread under a hunk. Renders existing comments as small
// stacked bubbles; the [+ Note] / [+ Ask] affordance opens a compact
// composer that posts back to the parent FileRow's state.
function HunkCommentThread({
  hunkKey, comments, composing, onOpenCompose, onCancelCompose, onSubmit, onReply, onToggleResolve, isDark, t,
}: {
  hunkKey: string;
  comments: HunkComment[];
  composing: boolean;
  onOpenCompose: () => void;
  onCancelCompose: () => void;
  onSubmit: (text: string, kind: 'note' | 'ask') => void;
  onReply: (parentId: string, text: string) => void;
  onToggleResolve: (commentId: string) => void;
  isDark: boolean;
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  void hunkKey;
  const [text, setText] = useState('');
  const [kind, setKind] = useState<'note' | 'ask'>('note');
  const muted = isDark ? 'text-white/55' : 'text-black/55';
  const faint = isDark ? 'text-white/35' : 'text-black/40';
  const border = isDark ? 'border-white/[0.06]' : 'border-black/[0.06]';
  const surface = isDark ? 'bg-white/[0.02]' : 'bg-black/[0.015]';

  const hasAny = comments.length > 0 || composing;
  if (!hasAny) {
    return (
      <div className={`flex items-center justify-end px-2 py-1 border-t ${border} ${surface}`}>
        <button
          type="button"
          onClick={onOpenCompose}
          className={`flex items-center gap-1 text-[10px] font-mono opacity-60 hover:opacity-100 transition-opacity ${muted}`}
          title={t('comment.addNote')}
        >
          <Plus className="w-2.5 h-2.5" />
          <MessageSquare className="w-2.5 h-2.5" />
        </button>
      </div>
    );
  }

  return (
    <div className={`border-t ${border} ${surface}`}>
      {comments.length > 0 && (
        <>
          <div className={`px-2 pt-1.5 pb-0.5 text-[9px] font-bold uppercase tracking-[0.18em] ${faint}`}>
            {t('comment.header', { count: comments.length })}
          </div>
          <div className="px-2 pb-1.5 space-y-1.5">
            {comments.map((c) => (
              <CommentNode
                key={c.id}
                comment={c}
                onReply={(replyText) => { onReply(c.id, replyText); }}
                onToggleResolve={() => { onToggleResolve(c.id); }}
                isDark={isDark}
                t={t}
              />
            ))}
          </div>
        </>
      )}
      {composing ? (
        <div className={`px-2 pb-2 ${comments.length === 0 ? 'pt-2' : ''}`}>
          <div className={`rounded-md border ${border} ${isDark ? 'bg-[#11141a]' : 'bg-white'} overflow-hidden`}>
            <textarea
              autoFocus
              value={text}
              onChange={(e) => { setText(e.target.value); }}
              placeholder={t('comment.placeholder')}
              rows={2}
              className={`w-full px-2 py-1.5 bg-transparent outline-none resize-none text-[11px] leading-relaxed ${
                isDark ? 'text-white/85 placeholder:text-white/30' : 'text-black/85 placeholder:text-black/35'
              }`}
              spellCheck={false}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return;
                if (e.key === 'Escape') { e.preventDefault(); onCancelCompose(); setText(''); return; }
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  onSubmit(text, kind); setText('');
                }
              }}
            />
            <div className={`flex items-center justify-between px-1.5 py-1 border-t ${border}`}>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => { setKind('note'); }}
                  aria-pressed={kind === 'note'}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                    kind === 'note'
                      ? (isDark ? 'bg-white/[0.08] text-white/85' : 'bg-black/[0.06] text-black/85')
                      : (isDark ? 'text-white/40 hover:text-white/70' : 'text-black/40 hover:text-black/70')
                  }`}
                >
                  <MessageSquare className="w-2.5 h-2.5" />
                  {t('comment.kindNote')}
                </button>
                <button
                  type="button"
                  onClick={() => { setKind('ask'); }}
                  aria-pressed={kind === 'ask'}
                  style={kind === 'ask'
                    ? { background: 'color-mix(in srgb, var(--intent-warn-vivid) 15%, transparent)', color: 'var(--intent-warn-fg)' }
                    : undefined}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                    kind === 'ask'
                      ? ''
                      : (isDark ? 'text-white/40 hover:text-white/70' : 'text-black/40 hover:text-black/70')
                  }`}
                >
                  <HelpCircle className="w-2.5 h-2.5" />
                  {t('comment.kindAsk')}
                </button>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => { onCancelCompose(); setText(''); }}
                  className={`px-1.5 py-0.5 rounded text-[10px] ${muted} hover:opacity-100 opacity-70`}
                >
                  {t('comment.cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => { onSubmit(text, kind); setText(''); }}
                  disabled={!text.trim()}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                    text.trim()
                      ? (isDark ? 'bg-white text-black hover:bg-white/90' : 'bg-black text-white hover:bg-black/90')
                      : (isDark ? 'bg-white/[0.05] text-white/30 cursor-not-allowed' : 'bg-black/[0.04] text-black/30 cursor-not-allowed')
                  }`}
                >
                  {t('comment.submit')}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className={`flex items-center justify-end px-2 py-1 border-t ${border}`}>
          <button
            type="button"
            onClick={onOpenCompose}
            className={`flex items-center gap-1 text-[10px] font-mono opacity-60 hover:opacity-100 transition-opacity ${muted}`}
            title={t('comment.addNote')}
          >
            <Plus className="w-2.5 h-2.5" />
            <MessageSquare className="w-2.5 h-2.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// Single comment node — handles its own reply composer + resolve toggle.
// Recursive: replies render as a nested CommentNode tree (one level deep
// in practice, since real review threads rarely go deeper).
function CommentNode({
  comment, onReply, onToggleResolve, isDark, t, depth = 0,
}: {
  comment: HunkComment;
  onReply: (text: string) => void;
  onToggleResolve: () => void;
  isDark: boolean;
  t: (k: string, opts?: Record<string, unknown>) => string;
  depth?: number;
}) {
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const muted = isDark ? 'text-white/55' : 'text-black/55';
  const faint = isDark ? 'text-white/35' : 'text-black/40';
  const border = isDark ? 'border-white/[0.06]' : 'border-black/[0.06]';
  const isAgent = comment.author === 'agent';
  const cardBg = comment.resolved
    ? (isDark ? 'bg-white/[0.015] opacity-60' : 'bg-black/[0.01] opacity-60')
    : (isDark ? 'bg-white/[0.025]' : 'bg-white');
  // Avatar tone: agent is the same neutral as everywhere else; "ask"
  // user comments get amber to nudge the eye toward unanswered questions.
  const avatarStyle: React.CSSProperties | undefined = !isAgent && comment.kind === 'ask'
    ? { background: 'color-mix(in srgb, var(--intent-warn-vivid) 15%, transparent)', color: 'var(--intent-warn-fg)' }
    : undefined;
  const avatarTone = isAgent
    ? (isDark ? 'bg-white/[0.08] text-white/70' : 'bg-black/[0.06] text-black/70')
    : comment.kind === 'ask'
      ? ''
      : (isDark ? 'bg-white/[0.05] text-white/55' : 'bg-black/[0.04] text-black/55');
  const Icon = isAgent ? Sparkles : comment.kind === 'ask' ? HelpCircle : MessageSquare;

  return (
    <div className={depth > 0 ? `pl-3 ml-3 border-l ${border}` : ''}>
      <div
        className={`flex items-start gap-2 px-2 py-1.5 rounded-md text-[11px] leading-relaxed border ${border} ${cardBg}`}
      >
        <span
          style={avatarStyle}
          className={`shrink-0 mt-0.5 inline-flex items-center justify-center w-4 h-4 rounded-md ${avatarTone}`}
          title={
            isAgent ? t('reply.agentLabel')
            : comment.kind === 'ask' ? t('comment.kindAsk')
            : t('comment.kindNote')
          }
        >
          <Icon className="w-2.5 h-2.5" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            <span className={`text-[10px] font-mono ${muted}`}>
              {isAgent ? t('reply.agentLabel') : t('reply.userLabel')}
            </span>
            <span className={`text-[9px] font-mono ${faint}`}>{comment.at}</span>
            {comment.resolved && (
              <span
                style={{ background: 'var(--intent-success-bg)', color: 'var(--intent-success-fg)' }}
                className="text-[9px] font-mono px-1.5 py-px rounded"
              >
                {t('reply.resolved')}
              </span>
            )}
          </div>
          <div className={`whitespace-pre-wrap break-words ${isDark ? 'text-white/80' : 'text-black/80'}`}>
            {comment.text}
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            {!replying && depth === 0 && (
              <button
                type="button"
                onClick={() => { setReplying(true); }}
                className={`text-[10px] font-mono opacity-70 hover:opacity-100 transition-opacity ${muted}`}
              >
                ↩ {t('reply.openCompose')}
              </button>
            )}
            {depth === 0 && (
              <button
                type="button"
                onClick={onToggleResolve}
                className={`text-[10px] font-mono opacity-70 hover:opacity-100 transition-opacity ${muted}`}
              >
                {comment.resolved ? t('reply.reopen') : t('reply.resolve')}
              </button>
            )}
          </div>
        </div>
      </div>

      {replying && (
        <div className="mt-1 ml-6">
          <div className={`rounded-md border ${border} ${isDark ? 'bg-[#11141a]' : 'bg-white'} overflow-hidden`}>
            <textarea
              autoFocus
              value={replyText}
              onChange={(e) => { setReplyText(e.target.value); }}
              placeholder={t('reply.placeholder')}
              rows={2}
              className={`w-full px-2 py-1.5 bg-transparent outline-none resize-none text-[11px] leading-relaxed ${
                isDark ? 'text-white/85 placeholder:text-white/30' : 'text-black/85 placeholder:text-black/35'
              }`}
              spellCheck={false}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return;
                if (e.key === 'Escape') { e.preventDefault(); setReplying(false); setReplyText(''); return; }
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  if (replyText.trim()) { onReply(replyText); setReplyText(''); setReplying(false); }
                }
              }}
            />
            <div className={`flex items-center justify-end gap-1 px-1.5 py-1 border-t ${border}`}>
              <button
                type="button"
                onClick={() => { setReplying(false); setReplyText(''); }}
                className={`px-1.5 py-0.5 rounded text-[10px] ${muted} opacity-70`}
              >
                {t('comment.cancel')}
              </button>
              <button
                type="button"
                onClick={() => { if (replyText.trim()) { onReply(replyText); setReplyText(''); setReplying(false); } }}
                disabled={!replyText.trim()}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                  replyText.trim()
                    ? (isDark ? 'bg-white text-black hover:bg-white/90' : 'bg-black text-white hover:bg-black/90')
                    : (isDark ? 'bg-white/[0.05] text-white/30 cursor-not-allowed' : 'bg-black/[0.04] text-black/30 cursor-not-allowed')
                }`}
              >
                {t('reply.submit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-1 space-y-1">
          {comment.replies.map((r) => (
            <CommentNode
              key={r.id}
              comment={r}
              onReply={() => { /* nested replies collapse to flat for v1 */ }}
              onToggleResolve={() => { /* only top-level can be resolved */ }}
              isDark={isDark}
              t={t}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Unified hunk: classic single-column diff with +/- gutter. Each line
// hovers an inline-edit affordance at its right edge so the user can
// rewrite a *specific* line without nuking the whole diff. Real impl
// would dispatch the rewrite back to the agent; the demo just dispatches
// a window event the parent (CodingStage) listens for.
function UnifiedHunkBody({ hunk, isDark }: { hunk: CodingDiffHunk; isDark: boolean }) {
  return (
    <div className="font-mono text-[11px] leading-[1.55]">
      {hunk.lines.map((line, j) => (
        <DiffLine key={j} line={line} isDark={isDark} />
      ))}
    </div>
  );
}

// Split (side-by-side): build pseudo-rows by pairing adjacent del/add
// lines. Anything unpaired (pure context, lone del or add) takes a
// single side and leaves the other blank. Real GitHub-style splitter
// uses LCS; for the demo this naive pairing is good enough.
function SplitHunkBody({ hunk, isDark }: { hunk: CodingDiffHunk; isDark: boolean }) {
  const rows = useMemo(() => buildSplitRows(hunk.lines), [hunk.lines]);
  const divider = isDark ? 'border-white/[0.06]' : 'border-black/[0.06]';
  return (
    <div className={`grid grid-cols-2 divide-x ${divider} font-mono text-[11px] leading-[1.55]`}>
      <div>
        {rows.map((r, i) => (
          <DiffSplitCell key={`L${i}`} side="left" line={r.left} isDark={isDark} />
        ))}
      </div>
      <div>
        {rows.map((r, i) => (
          <DiffSplitCell key={`R${i}`} side="right" line={r.right} isDark={isDark} />
        ))}
      </div>
    </div>
  );
}

type SplitRow = {
  left:  CodingDiffHunk['lines'][number] | null;  // del or ctx
  right: CodingDiffHunk['lines'][number] | null;  // add or ctx
};
function buildSplitRows(lines: CodingDiffHunk['lines']): SplitRow[] {
  const rows: SplitRow[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.kind === 'ctx') {
      rows.push({ left: line, right: line });
      i += 1;
      continue;
    }
    if (line.kind === 'del') {
      // Pair runs of consecutive dels with the following adds 1:1.
      const dels: CodingDiffHunk['lines'] = [];
      while (i < lines.length && lines[i].kind === 'del') { dels.push(lines[i]); i += 1; }
      const adds: CodingDiffHunk['lines'] = [];
      while (i < lines.length && lines[i].kind === 'add') { adds.push(lines[i]); i += 1; }
      const pairCount = Math.max(dels.length, adds.length);
      for (let p = 0; p < pairCount; p++) {
        rows.push({ left: dels[p] ?? null, right: adds[p] ?? null });
      }
      continue;
    }
    // Pure add (no preceding del to pair).
    if (line.kind === 'add') {
      rows.push({ left: null, right: line });
      i += 1;
      continue;
    }
    i += 1;
  }
  return rows;
}

function DiffSplitCell({
  side, line, isDark,
}: {
  side: 'left' | 'right';
  line: CodingDiffHunk['lines'][number] | null;
  isDark: boolean;
}) {
  if (line == null) {
    return <div className={`px-2 py-px ${isDark ? 'bg-white/[0.015]' : 'bg-black/[0.015]'}`}>&nbsp;</div>;
  }
  return <DiffLine line={line} isDark={isDark} sideHint={side} />;
}

// Single diff line with hover inline-edit affordance. `sideHint` is
// only used for split-view to suppress the gutter glyph on context rows
// since the equality is already obvious from alignment.
function DiffLine({
  line, isDark, sideHint,
}: {
  line: CodingDiffHunk['lines'][number];
  isDark: boolean;
  sideHint?: 'left' | 'right';
}) {
  const { t } = useTranslation('coding');
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  void sideHint;
  const toneStyle: React.CSSProperties | undefined =
    line.kind === 'add'
      ? { background: 'color-mix(in srgb, var(--intent-success-vivid) 8%, transparent)', color: 'var(--intent-success-fg)' }
      : line.kind === 'del'
      ? { background: 'color-mix(in srgb, var(--intent-danger-vivid) 8%, transparent)', color: 'var(--intent-danger-fg)' }
      : undefined;
  const tone = line.kind === 'add' || line.kind === 'del'
    ? ''
    : (isDark ? 'text-white/55' : 'text-black/55');
  const gutterStyle: React.CSSProperties | undefined =
    line.kind === 'add' ? { color: 'var(--intent-success-vivid)' }
    : line.kind === 'del' ? { color: 'var(--intent-danger-vivid)' }
    : undefined;
  const gutterTone = line.kind === 'add' || line.kind === 'del'
    ? ''
    : (isDark ? 'text-white/30' : 'text-black/30');

  function dispatchRewrite() {
    if (!text.trim()) return;
    window.dispatchEvent(new CustomEvent('coding:line-rewrite', {
      detail: { original: line.text, instruction: text.trim() },
    }));
    setEditing(false);
    setText('');
  }

  return (
    <div style={toneStyle} className={`group/line relative px-2 py-px whitespace-pre ${tone}`}>
      <span style={gutterStyle} className={`select-none mr-2 inline-block w-3 ${gutterTone}`}>
        {line.kind === 'add' ? '+' : line.kind === 'del' ? '−' : ' '}
      </span>
      {line.text}
      {/* Hover affordance — sits flush to the right edge so it doesn't
          shift the line text. Only meaningful for non-blank lines. */}
      {line.text.length > 0 && !editing && (
        <button
          type="button"
          onClick={() => { setEditing(true); }}
          title={t('lineEdit.rewrite')}
          aria-label={t('lineEdit.rewrite')}
          className={`absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/line:opacity-100 transition-opacity p-0.5 rounded ${
            isDark ? 'bg-[#11141a] text-white/55 hover:text-white border border-white/[0.10]' : 'bg-white text-black/55 hover:text-black border border-black/[0.10]'
          }`}
        >
          <Wand2 className="w-2.5 h-2.5" />
        </button>
      )}
      {editing && (
        <div className={`mt-1 flex items-center gap-1 px-1.5 py-1 rounded ${
          isDark ? 'bg-[#11141a] border border-white/[0.10]' : 'bg-white border border-black/[0.10]'
        }`}>
          <Wand2 className={`w-2.5 h-2.5 shrink-0 ${isDark ? 'text-white/45' : 'text-black/45'}`} />
          <input
            autoFocus
            value={text}
            onChange={(e) => { setText(e.target.value); }}
            placeholder={t('lineEdit.placeholder')}
            spellCheck={false}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return;
              if (e.key === 'Escape') { e.preventDefault(); setEditing(false); setText(''); return; }
              if (e.key === 'Enter') { e.preventDefault(); dispatchRewrite(); }
            }}
            className={`flex-1 bg-transparent outline-none text-[11px] ${
              isDark ? 'text-white/85 placeholder:text-white/30' : 'text-black/85 placeholder:text-black/35'
            }`}
          />
          <button
            type="button"
            onClick={() => { setEditing(false); setText(''); }}
            className={`px-1.5 py-0.5 rounded text-[10px] ${isDark ? 'text-white/55' : 'text-black/55'}`}
          >
            {t('lineEdit.cancel')}
          </button>
          <button
            type="button"
            onClick={dispatchRewrite}
            disabled={!text.trim()}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
              text.trim()
                ? (isDark ? 'bg-white text-black hover:bg-white/90' : 'bg-black text-white hover:bg-black/90')
                : (isDark ? 'bg-white/[0.05] text-white/30 cursor-not-allowed' : 'bg-black/[0.04] text-black/30 cursor-not-allowed')
            }`}
          >
            {t('lineEdit.submit')}
          </button>
        </div>
      )}
    </div>
  );
}

// Compact preview card emitted by `/diff <ref>`. Lets the user orient
// before asking follow-up questions about a branch/ref's diff.
// Working-tree drift badge. State-coloured chip that surfaces what kind
// of drift was detected and how to resolve it. Colour mapping follows
// the same lineage as VCS UIs: amber overlap (review), sky shifted
// (auto-rebase OK), rose gone (file deleted).
function DriftBadge({
  drift, isDark, t,
}: {
  drift: NonNullable<CodingFileChange['drift']>;
  isDark: boolean;
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  void isDark;
  const toneStyle: React.CSSProperties =
    drift.state === 'overlap' ? {
        background: 'var(--intent-warn-bg)',
        color: 'var(--intent-warn-fg)',
        borderColor: 'color-mix(in srgb, var(--intent-warn-vivid) 30%, transparent)',
      }
    : drift.state === 'gone'  ? {
        background: 'var(--intent-danger-bg)',
        color: 'var(--intent-danger-fg)',
        borderColor: 'color-mix(in srgb, var(--intent-danger-vivid) 30%, transparent)',
      }
    : {
        background: 'var(--intent-info-bg)',
        color: 'var(--fg-link)',
        borderColor: 'color-mix(in srgb, var(--intent-info-fg) 30%, transparent)',
      };
  const glyph =
    drift.state === 'overlap' ? '⚠'
    : drift.state === 'gone'  ? '✕'
    : '⊙';
  const label =
    drift.state === 'overlap' ? t('drift.fileOverlap')
    : drift.state === 'gone'  ? t('drift.fileGone')
    : t('drift.fileShifted');
  // Format relative time for tooltip. We compute against `now` carried
  // in state so render is pure (the lint rule rejects Date.now in
  // render); the timestamp ticks in an effect once a minute.
  const [now, setNow] = useState<number>(0);
  /* eslint-disable react-hooks/set-state-in-effect --
   * Mirroring the wall clock into render state. Documented pattern. */
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => { setNow(Date.now()); }, 60_000);
    return () => { window.clearInterval(id); };
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */
  const ms = drift.workingShaLastTouchedAtMs;
  const ago = ms != null && now > 0
    ? `${Math.max(1, Math.round((now - ms) / 60_000))}m`
    : '';
  return (
    <span
      style={toneStyle}
      className="shrink-0 inline-flex items-center gap-1 px-1.5 py-px rounded-md text-[9px] font-mono border"
      title={ago ? `${label} · ${t('drift.lastTouched', { ago })}` : label}
    >
      <span aria-hidden>{glyph}</span>
      {label}
    </span>
  );
}

function DiffPreviewBlockView({ block, isDark }: { block: DiffPreviewBlock; isDark: boolean }) {
  const { t } = useTranslation('coding');
  const card = isDark ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-white border-black/[0.08]';
  const headerBorder = isDark ? 'border-white/[0.06]' : 'border-black/[0.05]';
  const muted = isDark ? 'text-white/55' : 'text-black/55';
  const faint = isDark ? 'text-white/35' : 'text-black/40';
  const primary = isDark ? 'text-white/85' : 'text-black/85';
  return (
    <div className={`rounded-lg border overflow-hidden ${card}`}>
      <div className={`flex items-center gap-2 px-3 py-2 border-b ${headerBorder}`}>
        <GitCompareArrows className={`w-3 h-3 ${muted}`} />
        <span className={`text-[10px] font-bold uppercase tracking-[0.18em] ${faint}`}>
          {t('diffPreview.label')}
        </span>
        <span className={`text-[12px] font-mono ${primary}`}>{block.ref}</span>
        <span className={faint}>←</span>
        <span className={`text-[11px] font-mono ${muted}`}>{block.base}</span>
        <div className="flex-1" />
        <span className={`text-[10px] font-mono ${faint}`}>
          {t('diffPreview.summary', { added: block.added, removed: block.removed, files: block.files })}
        </span>
      </div>
      <div className={`px-3 py-2 text-[12px] leading-relaxed ${primary}`}>
        {block.summary}
      </div>
      <div className={`flex items-center justify-end gap-1 px-2 py-1.5 border-t ${headerBorder} ${
        isDark ? 'bg-white/[0.015]' : 'bg-black/[0.015]'
      }`}>
        <button
          type="button"
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
            isDark ? 'text-white/55 hover:text-white hover:bg-white/[0.06]' : 'text-black/55 hover:text-black hover:bg-black/[0.06]'
          }`}
        >
          <Sparkles className="w-2.5 h-2.5" />
          {t('diffPreview.askAbout')}
        </button>
        <button
          type="button"
          style={{
            color: 'var(--intent-success-fg)',
            background: 'var(--intent-success-bg)',
            border: '1px solid color-mix(in srgb, var(--intent-success-vivid) 20%, transparent)',
          }}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors"
        >
          <ExternalLink className="w-2.5 h-2.5" />
          {t('diffPreview.openInPr')}
        </button>
      </div>
    </div>
  );
}

// Tiny visual bar showing add/remove ratio. Caps at 5 segments total.
function DiffBar({ added, removed, isDark }: { added: number; removed: number; isDark: boolean }) {
  const total = added + removed;
  if (total === 0) return null;
  const segs = 5;
  const a = Math.round((added / total) * segs);
  const d = segs - a;
  const idle = isDark ? 'bg-white/[0.10]' : 'bg-black/[0.08]';
  return (
    <div className="flex items-center gap-px ml-1">
      {Array.from({ length: a }).map((_, i) => (
        <span
          key={`a${i}`}
          style={{ background: 'color-mix(in srgb, var(--intent-success-vivid) 80%, transparent)' }}
          className="w-1 h-1.5 rounded-sm"
        />
      ))}
      {Array.from({ length: d }).map((_, i) => (
        <span
          key={`d${i}`}
          style={i < removed ? { background: 'color-mix(in srgb, var(--intent-danger-vivid) 70%, transparent)' } : undefined}
          className={`w-1 h-1.5 rounded-sm ${i < removed ? '' : idle}`}
        />
      ))}
    </div>
  );
}
