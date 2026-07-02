import {
  ShieldCheck, FileCode, GitPullRequestArrow, RotateCcw, Hourglass, ArrowRight,
} from 'lucide-react';
import type { CandidateFix, FixCase } from '../../model/types';
import { ACCENT, SUCCESS, WARN, DANGER, mix } from './tokens';
import { PaneHeader, Field } from './shared';

export function DeliveryPane({
  draft, stage, candidate, onValidate,
}: {
  draft: FixCase['draft'];
  stage: FixCase['loop']['currentStage'];
  candidate: CandidateFix;
  onValidate: () => void;
}) {
  const validating = stage === 'validate' || stage === 'critique';
  const canValidate = !validating && stage !== 'done' && stage !== 'aborted';

  return (
    <div className="px-4 py-3">
      <PaneHeader label="Delivery" />
      {draft === null ? (
        <div
          className="rounded-md px-3 py-3 flex items-center gap-3"
          style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-muted)' }}
        >
          <Hourglass className="w-3.5 h-3.5 text-[var(--fg-subtle)]" />
          <div className="flex-1 min-w-0 text-[10px] text-[var(--fg-muted)] leading-snug">
            {validating
              ? 'Running proof obligations against the selected candidate.'
              : 'Validation has not run yet. Proofs are pending.'}
          </div>
          <button
            type="button"
            onClick={onValidate}
            disabled={!canValidate}
            className="inline-flex items-center gap-1 h-7 px-3 rounded text-[10px] font-bold uppercase tracking-[var(--track-eyebrow)] transition-colors disabled:opacity-50"
            style={{
              background: canValidate ? mix(ACCENT, 18) : 'var(--bg-surface-muted)',
              color: canValidate ? ACCENT : 'var(--fg-subtle)',
              border: `1px solid ${mix(ACCENT, 33)}`,
            }}
          >
            {validating ? <RotateCcw className="w-2.5 h-2.5 animate-spin" /> : <ShieldCheck className="w-2.5 h-2.5" />}
            {validating ? 'Validating' : 'Run validation'}
          </button>
        </div>
      ) : (
        <DraftPackage candidate={candidate} draft={draft} />
      )}
    </div>
  );
}

function DraftPackage({
  candidate, draft,
}: { candidate: CandidateFix; draft: NonNullable<FixCase['draft']> }) {
  const gateColor = draft.gateDecision === 'auto-submit' ? SUCCESS
    : draft.gateDecision === 'needs-review' ? WARN : DANGER;
  const gateLabel = draft.gateDecision === 'auto-submit' ? 'Auto-submit eligible'
    : draft.gateDecision === 'needs-review' ? 'Needs reviewer sign-off' : 'Human checkpoint';
  return (
    <div
      className="rounded-md overflow-hidden"
      style={{ background: 'var(--bg-surface-muted)', border: `1px solid ${mix(gateColor, 33)}` }}
    >
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ background: mix(gateColor, 6), borderBottom: `1px solid ${mix(gateColor, 20)}` }}
      >
        <GitPullRequestArrow className="w-3.5 h-3.5" style={{ color: gateColor }} />
        <span className="text-[10px] font-black uppercase tracking-[var(--track-eyebrow)]" style={{ color: gateColor }}>
          {gateLabel}
        </span>
        <span className="ml-auto text-[9px] font-mono text-[var(--fg-subtle)]">{candidate.patchKind}</span>
      </div>
      <div className="px-3 py-3 space-y-2">
        <Field label="Title" value={draft.title} />
        <Field label="Why" value={draft.whyThisFix} />
        <Field label="Validation" value={draft.validationSummary} />
        {draft.remainingUnknowns.length > 0 && (
          <Field label="Unknowns" value={draft.remainingUnknowns.join(' · ')} />
        )}
        <Field label="Reviewer" value={draft.reviewerSuggestion} />
        <div className="pt-1.5 mt-1 border-t border-[var(--border-muted)] text-[9px] text-[var(--fg-subtle)] leading-snug">
          <span className="text-[var(--fg-subtle)] mr-1">gate —</span>{draft.gateReason}
        </div>
      </div>
      <div className="px-3 py-2 flex items-center gap-2 border-t border-[var(--border-muted)]">
        <button
          type="button"
          disabled={draft.gateDecision !== 'auto-submit'}
          className="inline-flex items-center gap-1 h-6 px-2.5 rounded text-[10px] font-bold uppercase tracking-[var(--track-eyebrow)] disabled:opacity-50"
          style={{
            background: mix(SUCCESS, 18),
            color: SUCCESS,
            border: `1px solid ${mix(SUCCESS, 33)}`,
          }}
        >
          <ArrowRight className="w-2.5 h-2.5" />
          Open draft PR
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1 h-6 px-2.5 rounded text-[10px] font-bold uppercase tracking-[var(--track-eyebrow)] text-[var(--fg-default)] hover:text-[var(--fg-strong)]"
          style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-default)' }}
        >
          <FileCode className="w-2.5 h-2.5" />
          Open evidence
        </button>
      </div>
    </div>
  );
}
