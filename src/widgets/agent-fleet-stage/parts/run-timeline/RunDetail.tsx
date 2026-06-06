import {
  ChevronRight, CircleDot, CheckCircle2, FileText, GitPullRequest, Hand, Sparkles, XCircle,
} from 'lucide-react';
import type { Run, RunCandidate, RunStep, TranslateFn } from '../types';

export function RunDetail({
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

// Step lifecycle → glyph. State-only, so it lives at module scope.
const STEP_ICON: Record<RunStep['state'], typeof CircleDot> = {
  ok: CheckCircle2,
  fail: XCircle,
  gated: Hand,
  running: CircleDot,
  pending: ChevronRight,
  skipped: ChevronRight,
};

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

  const Icon = STEP_ICON[step.state] ?? ChevronRight;

  // Tone depends on theme (running tier), so it stays inline.
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
