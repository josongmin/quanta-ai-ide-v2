import {
  ChevronRight, CircleDot, CheckCircle2, FileText, GitPullRequest, Hand, Sparkles, XCircle,
} from 'lucide-react';
import type { Run, RunCandidate, RunStep, TranslateFn } from '../types';

export function RunDetail({
  run, onApproveGate, onAdoptCandidate, t,
}: {
  run: Run;
  onApproveGate: (stepId: string) => void;
  onAdoptCandidate: (cId: string) => void;
  t: TranslateFn;
}) {
  const heading = 'text-[var(--fg-default)]';
  const muted = 'text-[var(--fg-muted)]';
  const faint = 'text-[var(--fg-subtle)]';
  const card = 'bg-[var(--bg-surface-muted)] border-[var(--border-default)]';

  return (
    <div className={`rounded-lg border ${card} px-4 py-3`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`text-xs font-bold uppercase tracking-eyebrow ${faint}`}>
          {t('run.details')} · {run.id}
        </div>
        <div className={`flex items-center gap-2 text-xs font-mono ${muted}`}>
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
            t={t}
            onApprove={() => { onApproveGate(step.id); }}
          />
        ))}
      </ol>

      {run.candidates && run.candidates.length > 1 && (
        <div className="mt-3">
          <div className={`mb-1.5 text-xs font-bold uppercase tracking-eyebrow ${faint}`}>
            {t('run.candidates')}
          </div>
          <div className="space-y-1">
            {run.candidates.map((c) => (
              <CandidateRow
                key={c.id}
                cand={c}
                onAdopt={() => { onAdoptCandidate(c.id); }}
                t={t}
              />
            ))}
          </div>
        </div>
      )}

      {run.output && (
        <div className={`mt-3 flex items-center gap-2 text-sm ${heading}`}>
          {run.output.kind === 'pr' ? <GitPullRequest className="w-3.5 h-3.5" />
            : run.output.kind === 'issue' ? <CircleDot className="w-3.5 h-3.5" />
            : <FileText className="w-3.5 h-3.5" />}
          <span className="truncate flex-1">
            {run.output.kind === 'pr' ? `#${run.output.number} · ${run.output.title}`
              : run.output.kind === 'issue' ? `#${run.output.number} · ${run.output.title}`
              : run.output.title}
          </span>
          {run.output.kind === 'pr' && (
            <span className={`text-xs font-mono ${muted}`}>
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
  step, t, onApprove,
}: {
  step: RunStep;
  t: TranslateFn;
  onApprove: () => void;
}) {
  const muted = 'text-[var(--fg-muted)]';
  const heading = 'text-[var(--fg-default)]';
  const faint = 'text-[var(--fg-subtle)]';

  const Icon = STEP_ICON[step.state] ?? ChevronRight;

  // Tone depends on theme (running tier), so it stays inline.
  const iconTone =
    step.state === 'ok' ? 'text-[color:var(--intent-success-fg)]'
    : step.state === 'fail' ? 'text-[color:var(--intent-danger-fg)]'
    : step.state === 'gated' ? 'text-[color:var(--intent-warn-fg)]'
    : step.state === 'running' ? 'text-[var(--fg-default)]'
    : faint;

  return (
    <li className="flex items-center gap-2 text-sm">
      <Icon className={`w-3 h-3 shrink-0 ${iconTone} ${step.state === 'running' ? 'animate-pulse' : ''}`} />
      <span className={`shrink-0 inline-flex items-center px-1 py-px rounded-sm text-2xs font-bold uppercase tracking-eyebrow bg-[var(--bg-hover)] text-[var(--fg-muted)]`}>
        {t(`stepPhase.${step.phase}`)}
      </span>
      <span className={`flex-1 truncate ${heading}`}>{step.label}</span>
      {step.note && (
        <span className={`shrink-0 text-xs font-mono ${muted} truncate max-w-[280px]`} title={step.note}>
          {step.note}
        </span>
      )}
      {step.durationMs != null && (
        <span className={`shrink-0 text-xs font-mono ${faint} tabular-nums`}>
          {step.durationMs >= 1000 ? `${(step.durationMs / 1000).toFixed(1)}s` : `${step.durationMs}ms`}
        </span>
      )}
      {step.state === 'gated' && (
        <button
          type="button"
          onClick={onApprove}
          className="shrink-0 ml-1 px-2 py-0.5 rounded-md text-xs font-mono border transition-colors border-[color:var(--intent-warn-fg)] bg-[color:var(--intent-warn-bg)] text-[color:var(--intent-warn-fg)] hover:bg-[color:var(--intent-warn-bg)]"
        >
          {t('run.approveGate')}
        </button>
      )}
    </li>
  );
}

function CandidateRow({
  cand, onAdopt, t,
}: {
  cand: RunCandidate;
  onAdopt: () => void;
  t: TranslateFn;
}) {
  const heading = 'text-[var(--fg-default)]';
  const muted = 'text-[var(--fg-muted)]';
  const faint = 'text-[var(--fg-subtle)]';
  const tone = cand.selected
    ? 'border-[color:var(--intent-success-fg)] bg-[color:var(--intent-success-bg)]'
    : 'border-[var(--border-default)]';

  return (
    <div className={`flex items-center gap-2 px-2 py-1.5 rounded-md border ${tone}`}>
      {cand.selected ? (
        <Sparkles className="w-3 h-3 shrink-0 text-[color:var(--intent-success-fg)]" />
      ) : (
        <CircleDot className={`w-3 h-3 shrink-0 ${faint}`} />
      )}
      <div className="flex-1 min-w-0">
        <div className={`text-sm truncate ${heading}`}>{cand.approach}</div>
        <div className={`text-xs font-mono ${muted}`}>
          {cand.model} · {t('run.selfEval', { pct: Math.round(cand.selfEval * 100) })} · ${cand.costUsd.toFixed(2)}
        </div>
      </div>
      {!cand.selected && (
        <button
          type="button"
          onClick={onAdopt}
          className={`shrink-0 px-2 py-0.5 rounded-md text-xs font-mono transition-colors text-[var(--fg-muted)] hover:text-[var(--fg-strong)] hover:bg-[var(--bg-elevated)]`}
        >
          {t('run.candidateAdopt')}
        </button>
      )}
      {cand.selected && (
        <span className="shrink-0 text-xs font-mono text-[color:var(--intent-success-fg)]">
          {t('run.candidateWinner')}
        </span>
      )}
    </div>
  );
}
