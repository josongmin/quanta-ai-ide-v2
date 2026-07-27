import { useTranslation } from 'react-i18next';
import { GlassCard, EmptyHint } from '@shared/ui';
import type {
  Person,
  PersonId,
  StackStep,
  StackStepKind,
} from '@entities/ownership';
import { PersonAvatar, RiskBadgePill } from './primitives';

const KIND_KEY: Record<StackStepKind, `kind.${StackStepKind}`> = {
  prep: 'kind.prep',
  adapter: 'kind.adapter',
  migration: 'kind.migration',
  cleanup: 'kind.cleanup',
  gate: 'kind.gate',
};

function KindLabel({ kind }: { kind: StackStepKind }) {
  const { t } = useTranslation('ownership');
  return (
    <span
      className="inline-flex items-center text-2xs font-black uppercase tracking-[0.22em]"
      style={{ color: 'var(--fg-subtle)' }}
    >
      {t(KIND_KEY[kind])}
    </span>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full shrink-0 text-sm font-black tabular-nums"
      style={{
        width: 24,
        height: 24,
        background: 'var(--bg-surface-muted)',
        color: 'var(--fg-default)',
        border: '1px solid var(--border-default)',
      }}
      aria-hidden
    >
      {n}
    </span>
  );
}

function CheckPill({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded-md text-2xs font-mono uppercase tracking-eyebrow"
      style={{
        background: 'var(--bg-surface-muted)',
        color: 'var(--fg-muted)',
        border: '1px solid var(--border-muted)',
      }}
    >
      {label}
    </span>
  );
}

function ExitCriteria({ items }: { items: string[] }) {
  const { t } = useTranslation('ownership');
  if (items.length === 0) return null;
  return (
    <div className="mb-2">
      <div
        className="text-2xs font-black uppercase tracking-[0.22em] mb-1"
        style={{ color: 'var(--fg-subtle)' }}
      >
        {t('stack.exitCriteria')}
      </div>
      <ul className="space-y-0.5">
        {items.map((c, i) => (
          <li
            key={i}
            className="flex items-start gap-1.5 text-[10.5px] leading-snug"
            style={{ color: 'var(--fg-default)' }}
          >
            <span
              className="inline-block mt-[5px] w-1 h-1 rounded-full shrink-0"
              style={{ background: 'var(--fg-muted)' }}
              aria-hidden
            />
            <span className="flex-1 min-w-0">{c}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TouchedModules({ modules }: { modules: string[] }) {
  const { t } = useTranslation('ownership');
  if (modules.length === 0) return null;
  const visible = modules.slice(0, 3);
  const extra = modules.length - visible.length;
  return (
    <ul className="space-y-0.5">
      {visible.map((m) => (
        <li
          key={m}
          className="text-xs font-mono leading-tight truncate"
          style={{ color: 'var(--fg-default)' }}
          title={m}
        >
          {m}
        </li>
      ))}
      {extra > 0 && (
        <li
          className="text-xs font-mono leading-tight"
          style={{ color: 'var(--fg-subtle)' }}
        >
          {t('stack.moreModules', { count: extra })}
        </li>
      )}
    </ul>
  );
}

function ReviewerChip({ person }: { person: Person | undefined }) {
  const { t } = useTranslation('ownership');
  if (!person) {
    return (
      <div className="flex items-center gap-1.5 min-w-0">
        <PersonAvatar person={undefined} size={20} />
        <span
          className="text-xs italic truncate"
          style={{ color: 'var(--fg-subtle)' }}
        >
          {t('stack.unassigned')}
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 min-w-0" title={`${person.name} · ${person.team}`}>
      <PersonAvatar person={person} size={20} />
      <div className="min-w-0 flex flex-col leading-tight">
        <span
          className="text-sm font-semibold truncate"
          style={{
            color: person.active ? 'var(--fg-default)' : 'var(--fg-muted)',
          }}
        >
          {person.name}
        </span>
        <span
          className="text-2xs font-mono truncate"
          style={{ color: 'var(--fg-subtle)' }}
        >
          {person.team}
        </span>
      </div>
    </div>
  );
}

function StepCard({
  step,
  index,
  isLast,
  reviewer,
}: {
  step: StackStep;
  index: number;
  isLast: boolean;
  reviewer: Person | undefined;
}) {
  const { t } = useTranslation('ownership');
  return (
    <li className="relative">
      <div className="grid grid-cols-[24px_1fr] gap-2.5 items-start">
        <div className="flex flex-col items-center self-stretch">
          <StepNumber n={index + 1} />
          {!isLast && (
            <span
              className="flex-1 w-px mt-1"
              style={{ background: 'var(--border-muted)', minHeight: 16 }}
              aria-hidden
            />
          )}
        </div>
        <GlassCard
          tone="inner"
          className="px-3 py-2.5 transition-colors hover:[background:var(--bg-hover)]"
        >
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <KindLabel kind={step.kind} />
              <span
                className="w-1 h-1 rounded-full"
                style={{ background: 'var(--border-default)' }}
                aria-hidden
              />
              <span
                className="text-2xs font-mono tabular-nums"
                style={{ color: 'var(--fg-subtle)' }}
              >
                {t('stack.locSuffix', { lines: step.estimatedDiffLines })}
              </span>
            </div>
            <RiskBadgePill risk={step.blastRadius} />
          </div>

          <h4
            className="text-[12.5px] font-semibold leading-snug mb-1"
            style={{ color: 'var(--fg-strong)' }}
          >
            {step.title}
          </h4>

          <p
            className="text-sm leading-snug mb-2"
            style={{ color: 'var(--fg-muted)' }}
          >
            {step.goal}
          </p>

          <ExitCriteria items={step.exitCriteria} />

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2.5 items-end">
            <div className="min-w-0 space-y-2">
              <TouchedModules modules={step.touchedModules} />
              {step.requiredChecks.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  {step.requiredChecks.map((c) => (
                    <CheckPill key={c} label={c} />
                  ))}
                </div>
              )}
            </div>
            <div className="shrink-0 max-w-[160px]">
              <div
                className="text-2xs font-black uppercase tracking-[0.22em] mb-0.5"
                style={{ color: 'var(--fg-subtle)' }}
              >
                {t('stack.reviewer')}
              </div>
              <ReviewerChip person={reviewer} />
            </div>
          </div>
        </GlassCard>
      </div>
    </li>
  );
}

export function StepGroup({
  steps,
  personIndex,
}: {
  steps: StackStep[];
  personIndex: Map<PersonId, Person>;
}) {
  const { t } = useTranslation('ownership');
  if (steps.length === 0) {
    return <EmptyHint text={t('stack.stepsEmpty')} />;
  }
  return (
    <ol className="space-y-2 list-none">
      {steps.map((step, idx) => (
        <StepCard
          key={step.id}
          step={step}
          index={idx}
          isLast={idx === steps.length - 1}
          reviewer={personIndex.get(step.suggestedReviewerId)}
        />
      ))}
    </ol>
  );
}
