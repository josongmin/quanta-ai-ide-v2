import { GlassCard, EmptyHint } from '@shared/ui';
import {
  findPerson,
  type Person,
  type RefactorStack,
} from '@entities/ownership';
import { BlinkingCursor, PhaseLabel, RevealedBlock, StrategyPill } from './primitives';
import { StepReveal } from './StepReveal';
import { MERGE_STRATEGY_LABEL } from './types';

export function PlanBody({
  stack,
  revealed,
  personIndex,
}: {
  stack: RefactorStack;
  revealed: number;
  personIndex: Map<string, Person>;
}) {
  const advice = stack.mergeStrategyAdvice;
  const stepsRevealedCount = Math.max(0, Math.min(stack.steps.length, revealed - 2));
  const rationaleStillWriting = revealed === 1;

  return (
    <div className="px-5 py-4 space-y-4 overflow-y-auto">
      {/* Phase 1: Reasoning */}
      <RevealedBlock shown={revealed >= 1}>
        <GlassCard tone="inner" className="px-3 py-2.5">
          <PhaseLabel>Reasoning</PhaseLabel>
          <p
            className="text-[12.5px] leading-snug"
            style={{ color: 'var(--fg-default)' }}
          >
            {stack.rationale}
            {rationaleStillWriting && <BlinkingCursor />}
          </p>
        </GlassCard>
      </RevealedBlock>

      {/* Phase 2: Strategy decision */}
      <RevealedBlock shown={revealed >= 2}>
        <GlassCard tone="inner" className="px-3 py-2.5 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <PhaseLabel>Merge strategy</PhaseLabel>
            <StrategyPill strategy={advice.strategy} />
          </div>
          <p
            className="text-[12px] leading-snug"
            style={{ color: 'var(--fg-default)' }}
          >
            {advice.reason}
          </p>
          {advice.alternative && (
            <p
              className="text-[11px] leading-snug italic"
              style={{ color: 'var(--fg-subtle)' }}
            >
              Considered alternative:{' '}
              <span
                className="not-italic font-black uppercase tracking-[0.18em]"
                style={{ color: 'var(--fg-muted)' }}
              >
                {MERGE_STRATEGY_LABEL[advice.alternative.strategy]}
              </span>{' '}
              — {advice.alternative.reason}
            </p>
          )}
        </GlassCard>
      </RevealedBlock>

      {/* Phase 3: Steps */}
      {stack.steps.length === 0 ? (
        <RevealedBlock shown={revealed >= 2}>
          <EmptyHint text="No steps planned for this stack." />
        </RevealedBlock>
      ) : (
        <div>
          <RevealedBlock shown={revealed >= 2}>
            <PhaseLabel>Stack steps</PhaseLabel>
          </RevealedBlock>
          <ol className="space-y-2 list-none">
            {stack.steps.slice(0, stepsRevealedCount).map((step, idx) => {
              const reviewer =
                personIndex.get(step.suggestedReviewerId) ??
                findPerson(step.suggestedReviewerId);
              return (
                <li key={step.id}>
                  <RevealedBlock shown>
                    <StepReveal step={step} index={idx} reviewer={reviewer} />
                  </RevealedBlock>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
