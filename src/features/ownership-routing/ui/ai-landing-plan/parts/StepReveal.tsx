import { GlassCard } from '@shared/ui';
import type { Person, StackStep, StackStepKind } from '@entities/ownership';
import { KindPill, ReviewerChip, RiskPill, StepNumber } from './primitives';
import { WHY_REVIEWER_BY_KIND } from './types';

function WhyReviewer({ kind }: { kind: StackStepKind }) {
  return (
    <p
      className="text-[10.5px] leading-snug italic"
      style={{ color: 'var(--fg-muted)' }}
    >
      <span
        className="not-italic font-black uppercase tracking-[0.22em] mr-1"
        style={{ color: 'var(--fg-subtle)', fontSize: '8.5px' }}
      >
        Why
      </span>
      {WHY_REVIEWER_BY_KIND[kind]}
    </p>
  );
}

export function StepReveal({
  step,
  index,
  reviewer,
}: {
  step: StackStep;
  index: number;
  reviewer: Person | undefined;
}) {
  return (
    <GlassCard tone="inner" className="px-3 py-2.5">
      <div className="grid grid-cols-[24px_1fr] gap-2.5 items-start">
        <StepNumber n={index + 1} />
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <KindPill kind={step.kind} />
              <h4
                className="text-base font-semibold leading-snug truncate"
                style={{ color: 'var(--fg-strong)' }}
              >
                {step.title}
              </h4>
            </div>
            <RiskPill risk={step.blastRadius} />
          </div>
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <ReviewerChip person={reviewer} />
            <span
              className="text-2xs font-mono tabular-nums shrink-0"
              style={{ color: 'var(--fg-subtle)' }}
            >
              ~{step.estimatedDiffLines} LOC
            </span>
          </div>
          <WhyReviewer kind={step.kind} />
        </div>
      </div>
    </GlassCard>
  );
}
