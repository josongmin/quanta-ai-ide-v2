import { useMemo } from 'react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { GlassCard, SectionHeader, EmptyHint } from '@shared/ui';
import type { Person, PersonId, RefactorStack } from '@entities/ownership';
import {
  MERGE_STRATEGY_SHORT_KEY,
  PlanMeta,
  RationaleStrip,
  SplitConfidenceBasis,
  MergeStrategyCard,
  StepGroup,
  FooterActions,
} from './stack-planner/parts';

export type StackPlannerProps = {
  stack: RefactorStack | undefined;
  people: Person[];
  onPlanRefactor?: () => void;
}

export function StackPlanner({ stack, people, onPlanRefactor }: StackPlannerProps): JSX.Element {
  const { t } = useTranslation('ownership');
  const personIndex = useMemo(() => {
    const m = new Map<PersonId, Person>();
    for (const p of people) m.set(p.id, p);
    return m;
  }, [people]);

  if (!stack) {
    return (
      <GlassCard className="px-3.5 py-3">
        <SectionHeader title={t('stack.title')} />
        <EmptyHint text={t('stack.empty')} />
      </GlassCard>
    );
  }

  const badge = t(MERGE_STRATEGY_SHORT_KEY[stack.mergeStrategy]);

  return (
    <GlassCard className="px-3.5 py-3 space-y-3.5">
      <SectionHeader title={t('stack.title')} badge={badge} />

      <RationaleStrip text={stack.rationale} />

      <div
        className="h-px w-full"
        style={{ background: 'var(--border-muted)' }}
      />

      <PlanMeta stack={stack} />

      <SplitConfidenceBasis basis={stack.splitConfidenceBasis} />

      <MergeStrategyCard advice={stack.mergeStrategyAdvice} />

      <div
        className="h-px w-full"
        style={{ background: 'var(--border-muted)' }}
      />

      <StepGroup steps={stack.steps} personIndex={personIndex} />

      <div
        className="h-px w-full"
        style={{ background: 'var(--border-muted)' }}
      />

      <FooterActions onPlanRefactor={onPlanRefactor} />
    </GlassCard>
  );
}
