import { useMemo } from 'react';
import {
  AlertTriangle, CheckCircle2, ChevronRight, CircleDot, Eye, FileText, GitPullRequest,
  Hand, MoreHorizontal, Pause, Play, Shield, Sparkles, XCircle, Zap,
} from 'lucide-react';
import type { Routine, Run, RunCandidate, RunStatus, RunStep } from './types';
import { relativeFromMs, runsForRoutine } from './data';

type TranslateFn = (k: string, opts?: Record<string, unknown>) => string;

export function RunTimeline({
  routine,
  runs,
  activeRunId,
  onSelectRun,
  onApproveGate,
  onAdoptCandidate,
  onEditRoutine,
  isDark,
  t,
}: {
  routine: Routine | null;
  runs: Run[];
  activeRunId: string | null;
  onSelectRun: (id: string) => void;
  onApproveGate: (runId: string, stepId: string) => void;
  onAdoptCandidate: (runId: string, candidateId: string) => void;
  onEditRoutine: () => void;
  isDark: boolean;
  t: TranslateFn;
}) {
  const border = isDark ? 'border-white/[0.06]' : 'border-black/[0.06]';
  const heading = isDark ? 'text-white/85' : 'text-black/85';
  const muted = isDark ? 'text-white/55' : 'text-black/55';
  const faint = isDark ? 'text-white/30' : 'text-black/40';

  const activeRun = useMemo(
    () => runs.find((r) => r.id === activeRunId) ?? runs[0],
    [runs, activeRunId],
  );

  if (!routine) {
    return (
      <section className="flex-1 min-w-0 flex items-center justify-center">
        <div className={`text-center ${muted}`}>
          <div className={`text-[14px] font-semibold ${heading} mb-1`}>{t('empty.title')}</div>
          <div className="text-[12px] max-w-[320px]">{t('empty.subtitle')}</div>
        </div>
      </section>
    );
  }

  return (
    <section className="flex-1 min-w-0 flex flex-col">
      <div className={`shrink-0 h-12 flex items-center justify-between px-5 border-b ${border}`}>
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-[12px] font-semibold truncate ${heading}`}>{routine.name}</span>
          <span className={faint}>·</span>
          <StatusPill status={routine.status} isDark={isDark} t={t} />
          <span className={faint}>·</span>
          <TrustChip level={routine.trustLevel} isDark={isDark} t={t} />
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onEditRoutine}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono transition-colors ${
              isDark ? 'text-white/55 hover:text-white hover:bg-white/[0.05]' : 'text-black/55 hover:text-black hover:bg-black/[0.05]'
            }`}
          >
            {t('editor.open')}
          </button>
          <button
            type="button"
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono transition-colors ${
              isDark ? 'text-white/55 hover:text-white hover:bg-white/[0.05]' : 'text-black/55 hover:text-black hover:bg-black/[0.05]'
            }`}
          >
            {routine.status === 'active' ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {routine.status === 'active' ? t('actions.pause') : t('actions.resume')}
          </button>
          <button
            type="button"
            aria-label="More"
            className={`p-1 rounded-md transition-colors ${
              isDark ? 'text-white/40 hover:text-white/85 hover:bg-white/[0.05]' : 'text-black/40 hover:text-black/85 hover:bg-black/[0.05]'
            }`}
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto scrollbar-thin">
        <div className="max-w-[840px] mx-auto px-6 py-6 space-y-5">
          <RoutineSummary routine={routine} isDark={isDark} t={t} />

          <div>
            <div className={`mb-2 text-[10px] font-bold uppercase tracking-[0.18em] ${faint}`}>
              {t('run.header')}
            </div>
            {runs.length === 0 ? (
              <div className={`px-3 py-6 text-center text-[11px] ${muted}`}>
                {t('run.empty')}
              </div>
            ) : (
              <div className="space-y-1.5">
                {runs.map((run) => (
                  <RunRow
                    key={run.id}
                    run={run}
                    active={run.id === activeRun?.id}
                    onClick={() => { onSelectRun(run.id); }}
                    isDark={isDark}
                    t={t}
                  />
                ))}
              </div>
            )}
          </div>

          {activeRun && (
            <RunDetail
              run={activeRun}
              onApproveGate={(stepId) => { onApproveGate(activeRun.id, stepId); }}
              onAdoptCandidate={(cId) => { onAdoptCandidate(activeRun.id, cId); }}
              isDark={isDark}
              t={t}
            />
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Routine summary card ─────────────────────────────────────────────────

function RoutineSummary({
  routine, isDark, t,
}: {
  routine: Routine;
  isDark: boolean;
  t: TranslateFn;
}) {
  const heading = isDark ? 'text-white/85' : 'text-black/85';
  const muted = isDark ? 'text-white/55' : 'text-black/55';
  const faint = isDark ? 'text-white/35' : 'text-black/40';
  const card = isDark ? 'bg-white/[0.025] border-white/[0.06]' : 'bg-black/[0.02] border-black/[0.06]';

  const m = routine.metrics;
  return (
    <div className={`rounded-lg border ${card} px-4 py-3`}>
      <div className={`text-[12px] leading-relaxed ${heading} mb-2`}>{routine.description}</div>
      <div className="grid grid-cols-4 gap-3">
        <Stat label={t('metrics.successRate')} value={`${Math.round(m.successRate * 100)}%`} isDark={isDark} />
        <Stat label={t('metrics.merged')} value={String(m.prsMerged30d)} isDark={isDark} />
        <Stat label={t('metrics.netLoc')} value={(m.netLocDelta > 0 ? '+' : '') + String(m.netLocDelta)} isDark={isDark} />
        <Stat label={t('metrics.spent')} value={`$${m.spentUsd.toFixed(2)}`} isDark={isDark} />
      </div>
      <div className={`mt-2 text-[9px] font-bold uppercase tracking-[0.18em] ${faint}`}>
        {t('metrics.thirtyDay')}
      </div>
      <div className={`mt-2 flex flex-wrap gap-1.5 text-[10px] font-mono ${muted}`}>
        <Pill text={t('rail.memoryItems', { n: routine.memoryItemCount })} isDark={isDark} />
        <Pill text={t('rail.metricSaved', { h: m.reviewHoursSaved.toFixed(1) })} isDark={isDark} />
        <Pill text={`reviewer Δ ${m.reviewerTouches.toFixed(1)}`} isDark={isDark} />
      </div>
    </div>
  );
}

function Stat({ label, value, isDark }: { label: string; value: string; isDark: boolean }) {
  const muted = isDark ? 'text-white/45' : 'text-black/55';
  const heading = isDark ? 'text-white/85' : 'text-black/85';
  return (
    <div>
      <div className={`text-[9px] font-bold uppercase tracking-[0.18em] ${muted}`}>{label}</div>
      <div className={`text-[14px] font-mono tabular-nums ${heading}`}>{value}</div>
    </div>
  );
}

function Pill({ text, isDark }: { text: string; isDark: boolean }) {
  const tone = isDark ? 'bg-white/[0.04] text-white/65' : 'bg-black/[0.04] text-black/65';
  return <span className={`inline-flex items-center px-1.5 py-px rounded-md ${tone}`}>{text}</span>;
}

// ─── Run row ──────────────────────────────────────────────────────────────

function RunRow({
  run, active, onClick, isDark, t,
}: {
  run: Run;
  active: boolean;
  onClick: () => void;
  isDark: boolean;
  t: TranslateFn;
}) {
  const heading = isDark ? 'text-white/85' : 'text-black/85';
  const muted = isDark ? 'text-white/55' : 'text-black/55';
  const faint = isDark ? 'text-white/30' : 'text-black/40';
  const baseTone = isDark
    ? (active ? 'bg-white/[0.06] border-white/[0.10]' : 'border-white/[0.06] hover:bg-white/[0.03]')
    : (active ? 'bg-black/[0.04] border-black/[0.10]' : 'border-black/[0.06] hover:bg-black/[0.02]');

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-md border transition-colors ${baseTone}`}
    >
      <div className="flex items-center gap-2 mb-0.5">
        <RunStatusBadge status={run.status} isDark={isDark} t={t} />
        <span className={`text-[12px] font-mono ${heading}`}>{run.id}</span>
        <span className={`text-[10px] font-mono ${faint} ml-auto`}>
          {t('run.started', { when: relativeFromMs(run.startedAtMs) })}
        </span>
      </div>
      <div className={`flex items-center gap-2 text-[10px] font-mono ${muted}`}>
        <span className="truncate">{run.triggeredBy}</span>
        <span className={faint}>·</span>
        <span>${run.costUsd.toFixed(2)}</span>
        {run.blastRadius && (
          <>
            <span className={faint}>·</span>
            <BlastChip tier={run.blastRadius} isDark={isDark} t={t} compact />
          </>
        )}
        {run.output && (
          <>
            <span className={faint}>·</span>
            <span className={muted}>
              {run.output.kind === 'pr' ? `PR #${run.output.number}`
                : run.output.kind === 'issue' ? `Issue #${run.output.number}`
                : run.output.title}
            </span>
          </>
        )}
      </div>
    </button>
  );
}

// ─── Run detail (steps + candidates) ──────────────────────────────────────

function RunDetail({
  run, onApproveGate, onAdoptCandidate, isDark, t,
}: {
  run: Run;
  onApproveGate: (stepId: string) => void;
  onAdoptCandidate: (cId: string) => void;
  isDark: boolean;
  t: TranslateFn;
}) {
  const heading = isDark ? 'text-white/85' : 'text-black/85';
  const muted = isDark ? 'text-white/55' : 'text-black/55';
  const faint = isDark ? 'text-white/30' : 'text-black/40';
  const card = isDark ? 'bg-white/[0.025] border-white/[0.06]' : 'bg-black/[0.02] border-black/[0.06]';

  return (
    <div className={`rounded-lg border ${card} px-4 py-3`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`text-[10px] font-bold uppercase tracking-[0.18em] ${faint}`}>
          {t('run.details')} · {run.id}
        </div>
        <div className={`flex items-center gap-2 text-[10px] font-mono ${muted}`}>
          <span>{t('run.trustEffective', { n: run.effectiveTrust })}</span>
          {run.selfConfidence != null && (
            <>
              <span className={faint}>·</span>
              <span>{t('run.selfEval', { pct: Math.round(run.selfConfidence * 100) })}</span>
            </>
          )}
        </div>
      </div>

      <ol className="space-y-1">
        {run.steps.map((step) => (
          <StepRow
            key={step.id}
            step={step}
            isDark={isDark}
            t={t}
            onApprove={() => { onApproveGate(step.id); }}
          />
        ))}
      </ol>

      {run.candidates && run.candidates.length > 1 && (
        <div className="mt-3">
          <div className={`mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] ${faint}`}>
            {t('run.candidates')}
          </div>
          <div className="space-y-1">
            {run.candidates.map((c) => (
              <CandidateRow
                key={c.id}
                cand={c}
                onAdopt={() => { onAdoptCandidate(c.id); }}
                isDark={isDark}
                t={t}
              />
            ))}
          </div>
        </div>
      )}

      {run.output && (
        <div className={`mt-3 flex items-center gap-2 text-[11px] ${heading}`}>
          {run.output.kind === 'pr' ? <GitPullRequest className="w-3.5 h-3.5" />
            : run.output.kind === 'issue' ? <CircleDot className="w-3.5 h-3.5" />
            : <FileText className="w-3.5 h-3.5" />}
          <span className="truncate flex-1">
            {run.output.kind === 'pr' ? `#${run.output.number} · ${run.output.title}`
              : run.output.kind === 'issue' ? `#${run.output.number} · ${run.output.title}`
              : run.output.title}
          </span>
          {run.output.kind === 'pr' && (
            <span className={`text-[10px] font-mono ${muted}`}>
              +{run.output.added} -{run.output.removed} · {run.output.files} files
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function StepRow({
  step, isDark, t, onApprove,
}: {
  step: RunStep;
  isDark: boolean;
  t: TranslateFn;
  onApprove: () => void;
}) {
  const muted = isDark ? 'text-white/55' : 'text-black/55';
  const heading = isDark ? 'text-white/85' : 'text-black/85';
  const faint = isDark ? 'text-white/30' : 'text-black/40';

  const Icon =
    step.state === 'ok' ? CheckCircle2
    : step.state === 'fail' ? XCircle
    : step.state === 'gated' ? Hand
    : step.state === 'running' ? CircleDot
    : ChevronRight;

  const iconTone =
    step.state === 'ok' ? 'text-[color:var(--intent-success-fg)]'
    : step.state === 'fail' ? 'text-[color:var(--intent-danger-fg)]'
    : step.state === 'gated' ? 'text-[color:var(--intent-warn-fg)]'
    : step.state === 'running' ? (isDark ? 'text-white/85' : 'text-black/85')
    : faint;

  return (
    <li className="flex items-center gap-2 text-[11px]">
      <Icon className={`w-3 h-3 shrink-0 ${iconTone} ${step.state === 'running' ? 'animate-pulse' : ''}`} />
      <span className={`shrink-0 inline-flex items-center px-1 py-px rounded-sm text-[9px] font-bold uppercase tracking-[0.18em] ${
        isDark ? 'bg-white/[0.04] text-white/55' : 'bg-black/[0.04] text-black/55'
      }`}>
        {t(`stepPhase.${step.phase}`)}
      </span>
      <span className={`flex-1 truncate ${heading}`}>{step.label}</span>
      {step.note && (
        <span className={`shrink-0 text-[10px] font-mono ${muted} truncate max-w-[280px]`} title={step.note}>
          {step.note}
        </span>
      )}
      {step.durationMs != null && (
        <span className={`shrink-0 text-[10px] font-mono ${faint} tabular-nums`}>
          {step.durationMs >= 1000 ? `${(step.durationMs / 1000).toFixed(1)}s` : `${step.durationMs}ms`}
        </span>
      )}
      {step.state === 'gated' && (
        <button
          type="button"
          onClick={onApprove}
          className="shrink-0 ml-1 px-2 py-0.5 rounded-md text-[10px] font-mono border transition-colors border-[color:var(--intent-warn-fg)] bg-[color:var(--intent-warn-bg)] text-[color:var(--intent-warn-fg)] hover:bg-[color:var(--intent-warn-bg)]"
        >
          {t('run.approveGate')}
        </button>
      )}
    </li>
  );
}

function CandidateRow({
  cand, onAdopt, isDark, t,
}: {
  cand: RunCandidate;
  onAdopt: () => void;
  isDark: boolean;
  t: TranslateFn;
}) {
  const heading = isDark ? 'text-white/85' : 'text-black/85';
  const muted = isDark ? 'text-white/55' : 'text-black/55';
  const faint = isDark ? 'text-white/30' : 'text-black/40';
  const tone = cand.selected
    ? 'border-[color:var(--intent-success-fg)] bg-[color:var(--intent-success-bg)]'
    : (isDark ? 'border-white/[0.06]' : 'border-black/[0.06]');

  return (
    <div className={`flex items-center gap-2 px-2 py-1.5 rounded-md border ${tone}`}>
      {cand.selected ? (
        <Sparkles className="w-3 h-3 shrink-0 text-[color:var(--intent-success-fg)]" />
      ) : (
        <CircleDot className={`w-3 h-3 shrink-0 ${faint}`} />
      )}
      <div className="flex-1 min-w-0">
        <div className={`text-[11px] truncate ${heading}`}>{cand.approach}</div>
        <div className={`text-[10px] font-mono ${muted}`}>
          {cand.model} · {t('run.selfEval', { pct: Math.round(cand.selfEval * 100) })} · ${cand.costUsd.toFixed(2)}
        </div>
      </div>
      {!cand.selected && (
        <button
          type="button"
          onClick={onAdopt}
          className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-mono transition-colors ${
            isDark ? 'text-white/55 hover:text-white hover:bg-white/[0.05]' : 'text-black/55 hover:text-black hover:bg-black/[0.05]'
          }`}
        >
          {t('run.candidateAdopt')}
        </button>
      )}
      {cand.selected && (
        <span className="shrink-0 text-[10px] font-mono text-[color:var(--intent-success-fg)]">
          {t('run.candidateWinner')}
        </span>
      )}
    </div>
  );
}

// ─── Small chips ──────────────────────────────────────────────────────────

function StatusPill({ status, isDark, t }: { status: 'active' | 'paused' | 'draft'; isDark: boolean; t: TranslateFn }) {
  const tone =
    status === 'active' ? 'border-[color:var(--intent-success-fg)] bg-[color:var(--intent-success-bg)] text-[color:var(--intent-success-fg)]'
    : status === 'paused' ? 'border-[color:var(--intent-warn-fg)] bg-[color:var(--intent-warn-bg)] text-[color:var(--intent-warn-fg)]'
    : (isDark ? 'border-white/[0.10] bg-white/[0.04] text-white/55' : 'border-black/[0.10] bg-black/[0.04] text-black/55');
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-px rounded-full text-[10px] font-bold uppercase tracking-[0.18em] border ${tone}`}>
      {t(`status.${status}`)}
    </span>
  );
}

function TrustChip({ level, isDark, t }: { level: 1 | 2 | 3 | 4 | 5; isDark: boolean; t: TranslateFn }) {
  const tone = isDark ? 'bg-white/[0.04] text-white/65 border-white/[0.10]' : 'bg-black/[0.04] text-black/65 border-black/[0.10]';
  return (
    <span
      className={`flex items-center gap-1 px-1.5 py-px rounded-md text-[9px] font-mono border ${tone}`}
      title={t('trust.tooltip')}
    >
      <Shield className="w-2.5 h-2.5" />
      {t('trust.level', { n: level })}
    </span>
  );
}

function BlastChip({ tier, isDark, t, compact = false }: {
  tier: 'safe' | 'review' | 'blast-radius';
  isDark: boolean;
  t: TranslateFn;
  compact?: boolean;
}) {
  const tone =
    tier === 'safe' ? 'border-[color:var(--intent-success-fg)] bg-[color:var(--intent-success-bg)] text-[color:var(--intent-success-fg)]'
    : tier === 'review' ? (isDark ? 'border-white/[0.10] bg-white/[0.04] text-white/55' : 'border-black/[0.10] bg-black/[0.04] text-black/55')
    : 'border-[color:var(--intent-danger-fg)] bg-[color:var(--intent-danger-bg)] text-[color:var(--intent-danger-fg)]';
  const Icon = tier === 'safe' ? Shield : tier === 'review' ? Eye : AlertTriangle;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-px rounded-md text-[9px] font-mono border ${tone}`}>
      <Icon className="w-2.5 h-2.5" />
      {!compact && t(`run.br.${tier}`)}
      {compact && t(`run.br.${tier}`)}
    </span>
  );
}

function RunStatusBadge({ status, isDark, t }: { status: RunStatus; isDark: boolean; t: TranslateFn }) {
  const map: Record<RunStatus, { tone: string; Icon: typeof CircleDot }> = {
    queued:           { tone: isDark ? 'text-white/55 border-white/[0.10] bg-white/[0.04]' : 'text-black/55 border-black/[0.10] bg-black/[0.04]', Icon: ChevronRight },
    running:          { tone: 'text-[color:var(--intent-success-fg)] border-[color:var(--intent-success-fg)] bg-[color:var(--intent-success-bg)]', Icon: Zap },
    'awaiting-human': { tone: 'text-[color:var(--intent-warn-fg)] border-[color:var(--intent-warn-fg)] bg-[color:var(--intent-warn-bg)]', Icon: Hand },
    merged:           { tone: 'text-[color:var(--intent-success-fg)] border-[color:var(--intent-success-fg)] bg-[color:var(--intent-success-bg)]', Icon: GitPullRequest },
    closed:           { tone: isDark ? 'text-white/55 border-white/[0.10] bg-white/[0.04]' : 'text-black/55 border-black/[0.10] bg-black/[0.04]', Icon: CheckCircle2 },
    failed:           { tone: 'text-[color:var(--intent-danger-fg)] border-[color:var(--intent-danger-fg)] bg-[color:var(--intent-danger-bg)]', Icon: XCircle },
    cancelled:        { tone: isDark ? 'text-white/45 border-white/[0.10] bg-white/[0.04]' : 'text-black/45 border-black/[0.10] bg-black/[0.04]', Icon: Pause },
  };
  const { tone, Icon } = map[status];
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-px rounded-full text-[9px] font-bold uppercase tracking-[0.18em] border ${tone}`}>
      <Icon className={`w-2.5 h-2.5 ${status === 'running' ? 'animate-pulse' : ''}`} />
      {t(`runStatus.${status}`)}
    </span>
  );
}

// Helper export so other modules can re-derive runs for a routine without
// importing data.ts directly.
export function pickRunsFor(routineId: string): Run[] {
  return runsForRoutine(routineId);
}
