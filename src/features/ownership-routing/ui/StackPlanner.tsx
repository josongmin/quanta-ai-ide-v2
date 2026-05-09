import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { GlassCard, SectionHeader, EmptyHint } from '@shared/ui';
import type {
  MergeStrategy,
  MergeStrategyAdvice,
  Person,
  PersonId,
  RefactorStack,
  RiskBadge,
  StackStep,
  StackStepKind,
} from '@entities/ownership';

export interface StackPlannerProps {
  stack: RefactorStack | undefined;
  people: Person[];
  onPlanRefactor?: () => void;
}

const MERGE_STRATEGY_SHORT: Record<MergeStrategy, string> = {
  'split-now': 'SPLIT NOW',
  'keep-as-one': 'KEEP AS ONE',
  'land-bottom-up': 'LAND BOTTOM-UP',
  parallelizable: 'PARALLELIZABLE',
  'risky-serial': 'RISKY SERIAL',
};

const KIND_LABEL: Record<StackStepKind, string> = {
  prep: 'PREP',
  adapter: 'ADAPTER',
  migration: 'MIGRATION',
  cleanup: 'CLEANUP',
  gate: 'GATE',
};

interface RiskTone {
  fg: string;
  bg: string;
  label: string;
}

function riskTone(risk: RiskBadge): RiskTone {
  if (risk === 'low') {
    return {
      fg: 'var(--intent-success-fg)',
      bg: 'var(--intent-success-bg)',
      label: 'LOW RISK',
    };
  }
  if (risk === 'medium') {
    return {
      fg: 'var(--intent-warn-fg)',
      bg: 'var(--intent-warn-bg)',
      label: 'MED RISK',
    };
  }
  return {
    fg: 'var(--intent-danger-fg)',
    bg: 'var(--intent-danger-bg)',
    label: 'HIGH RISK',
  };
}

function avatarStyle(person: Person | undefined, size: number): CSSProperties {
  if (!person) {
    return {
      width: size,
      height: size,
      background: 'var(--bg-surface-muted)',
      border: '1px solid var(--border-muted)',
      color: 'var(--fg-subtle)',
    };
  }
  const stale = !person.active;
  const sat = stale ? 14 : 58;
  const lightDark = stale ? 36 : 44;
  return {
    width: size,
    height: size,
    background: `hsl(${person.avatarHue} ${sat}% ${lightDark}% / ${stale ? 0.55 : 0.92})`,
    border: '1px solid var(--border-muted)',
    color: 'rgba(255,255,255,0.94)',
  };
}

function PersonAvatar({
  person,
  size,
}: {
  person: Person | undefined;
  size: number;
}) {
  const initials = person?.initials ?? '??';
  const fontSize = Math.max(8, Math.round(size * 0.42));
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-bold tracking-[0.04em] shrink-0"
      style={{
        ...avatarStyle(person, size),
        fontSize,
      }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

function AiPill() {
  return (
    <span
      className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-[0.22em] shrink-0"
      style={{
        background: 'var(--bg-surface-muted)',
        color: 'var(--fg-muted)',
        border: '1px solid var(--border-muted)',
      }}
    >
      AI
    </span>
  );
}

function RationaleStrip({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <AiPill />
      <p
        className="text-[12px] leading-snug italic line-clamp-2"
        style={{
          color: 'var(--fg-muted)',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
        title={text}
      >
        {text}
      </p>
    </div>
  );
}

function MergeStrategyPill({ strategy }: { strategy: MergeStrategy }) {
  return (
    <span
      className="inline-flex items-center px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-[0.18em]"
      style={{
        background: 'var(--bg-surface-muted)',
        color: 'var(--fg-default)',
        border: '1px solid var(--border-muted)',
      }}
    >
      {MERGE_STRATEGY_SHORT[strategy]}
    </span>
  );
}

function MetaCell({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string;
  sublabel?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span
        className="text-[9px] font-black uppercase tracking-[0.18em] truncate"
        style={{ color: 'var(--fg-muted)' }}
      >
        {label}
      </span>
      <div className="flex items-baseline gap-1 min-w-0">
        <span
          className="text-[14px] font-bold tabular-nums leading-none truncate"
          style={{ color: 'var(--fg-strong)' }}
        >
          {value}
        </span>
        {sublabel && (
          <span
            className="text-[10px] tabular-nums leading-none"
            style={{ color: 'var(--fg-subtle)' }}
          >
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}

function PlanMeta({ stack }: { stack: RefactorStack }) {
  const confidencePct = Math.round(stack.splitConfidence * 100);
  const confidenceColor =
    stack.splitConfidence >= 0.7
      ? 'var(--intent-success-fg)'
      : stack.splitConfidence >= 0.4
        ? 'var(--intent-warn-fg)'
        : 'var(--intent-danger-fg)';
  return (
    <div className="flex items-stretch gap-3 flex-wrap">
      <MergeStrategyPill strategy={stack.mergeStrategy} />
      <span
        className="self-stretch w-px"
        style={{ background: 'var(--border-muted)' }}
        aria-hidden
      />
      <MetaCell
        label="Estimate"
        value={`~${stack.totalEstimatedDays}`}
        sublabel={stack.totalEstimatedDays === 1 ? 'day' : 'days'}
      />
      <MetaCell
        label="Steps"
        value={String(stack.steps.length)}
        sublabel={stack.steps.length === 1 ? 'step' : 'steps'}
      />
      <span
        className="self-stretch w-px"
        style={{ background: 'var(--border-muted)' }}
        aria-hidden
      />
      <div
        className="flex flex-col gap-0.5 min-w-0"
        title={`Confidence in this split shape — based on: ${stack.splitConfidenceBasis.join(' · ')}`}
      >
        <span
          className="text-[9px] font-black uppercase tracking-[0.18em]"
          style={{ color: 'var(--fg-muted)' }}
        >
          Split confidence
        </span>
        <div className="flex items-baseline gap-1">
          <span
            className="text-[14px] font-bold tabular-nums leading-none"
            style={{ color: confidenceColor }}
          >
            {confidencePct}
          </span>
          <span
            className="text-[10px] tabular-nums leading-none"
            style={{ color: 'var(--fg-subtle)' }}
          >
            %
          </span>
        </div>
      </div>
    </div>
  );
}

function SplitConfidenceBasis({ basis }: { basis: string[] }) {
  if (basis.length === 0) return null;
  return (
    <div>
      <div
        className="text-[8px] font-black uppercase tracking-[0.22em] mb-1"
        style={{ color: 'var(--fg-subtle)' }}
      >
        Why this confidence
      </div>
      <ul className="space-y-0.5">
        {basis.map((b, i) => (
          <li
            key={i}
            className="flex items-start gap-1.5 text-[11px] leading-snug"
            style={{ color: 'var(--fg-muted)' }}
          >
            <span
              className="inline-block mt-[5px] w-1 h-1 rounded-full shrink-0"
              style={{ background: 'var(--fg-subtle)' }}
              aria-hidden
            />
            <span className="flex-1 min-w-0">{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MergeStrategyCard({ advice }: { advice: MergeStrategyAdvice }) {
  return (
    <div
      className="rounded-lg px-3 py-2.5 border space-y-2"
      style={{
        background: 'var(--bg-surface-muted)',
        borderColor: 'var(--border-muted)',
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="text-[8px] font-black uppercase tracking-[0.22em]"
          style={{ color: 'var(--fg-subtle)' }}
        >
          Merge strategy
        </span>
        <span className="flex-1 h-px" style={{ background: 'var(--border-muted)' }} />
        <MergeStrategyPill strategy={advice.strategy} />
      </div>
      <p
        className="text-[11px] leading-snug"
        style={{ color: 'var(--fg-default)' }}
      >
        {advice.reason}
      </p>
      {advice.alternative && (
        <div
          className="rounded-md px-2.5 py-2 border-l-0 border"
          style={{
            background: 'var(--bg-elevated)',
            borderColor: 'var(--border-muted)',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[8px] font-black uppercase tracking-[0.22em]"
              style={{ color: 'var(--fg-subtle)' }}
            >
              Alternative
            </span>
            <span
              className="text-[8px] font-black uppercase tracking-[0.18em] px-1.5 py-0.5 rounded-md"
              style={{
                background: 'var(--bg-surface-muted)',
                color: 'var(--fg-muted)',
                border: '1px solid var(--border-muted)',
              }}
            >
              {MERGE_STRATEGY_SHORT[advice.alternative.strategy]}
            </span>
          </div>
          <p
            className="text-[10.5px] leading-snug italic"
            style={{ color: 'var(--fg-muted)' }}
          >
            {advice.alternative.reason}
          </p>
        </div>
      )}
    </div>
  );
}

function ExitCriteria({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mb-2">
      <div
        className="text-[8px] font-black uppercase tracking-[0.22em] mb-1"
        style={{ color: 'var(--fg-subtle)' }}
      >
        Exit criteria
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

function RiskBadgePill({ risk }: { risk: RiskBadge }) {
  const tone = riskTone(risk);
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-[0.18em] shrink-0"
      style={{
        background: tone.bg,
        color: tone.fg,
        border: '1px solid color-mix(in srgb, currentColor 28%, transparent)',
      }}
    >
      {tone.label}
    </span>
  );
}

function KindLabel({ kind }: { kind: StackStepKind }) {
  return (
    <span
      className="inline-flex items-center text-[9px] font-black uppercase tracking-[0.22em]"
      style={{ color: 'var(--fg-subtle)' }}
    >
      {KIND_LABEL[kind]}
    </span>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full shrink-0 text-[11px] font-black tabular-nums"
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
      className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-mono uppercase tracking-[0.14em]"
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

function TouchedModules({ modules }: { modules: string[] }) {
  if (modules.length === 0) return null;
  const visible = modules.slice(0, 3);
  const extra = modules.length - visible.length;
  return (
    <ul className="space-y-0.5">
      {visible.map((m) => (
        <li
          key={m}
          className="text-[10px] font-mono leading-tight truncate"
          style={{ color: 'var(--fg-default)' }}
          title={m}
        >
          {m}
        </li>
      ))}
      {extra > 0 && (
        <li
          className="text-[10px] font-mono leading-tight"
          style={{ color: 'var(--fg-subtle)' }}
        >
          +{extra} more
        </li>
      )}
    </ul>
  );
}

function ReviewerChip({ person }: { person: Person | undefined }) {
  if (!person) {
    return (
      <div className="flex items-center gap-1.5 min-w-0">
        <PersonAvatar person={undefined} size={20} />
        <span
          className="text-[10px] italic truncate"
          style={{ color: 'var(--fg-subtle)' }}
        >
          unassigned
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 min-w-0" title={`${person.name} · ${person.team}`}>
      <PersonAvatar person={person} size={20} />
      <div className="min-w-0 flex flex-col leading-tight">
        <span
          className="text-[11px] font-semibold truncate"
          style={{
            color: person.active ? 'var(--fg-default)' : 'var(--fg-muted)',
          }}
        >
          {person.name}
        </span>
        <span
          className="text-[9px] font-mono truncate"
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
                className="text-[9px] font-mono tabular-nums"
                style={{ color: 'var(--fg-subtle)' }}
              >
                ~{step.estimatedDiffLines} LOC
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
            className="text-[11px] leading-snug mb-2"
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
                className="text-[8px] font-black uppercase tracking-[0.22em] mb-0.5"
                style={{ color: 'var(--fg-subtle)' }}
              >
                Reviewer
              </div>
              <ReviewerChip person={reviewer} />
            </div>
          </div>
        </GlassCard>
      </div>
    </li>
  );
}

function FooterButton({
  label,
  onClick,
  hint,
  disabled = false,
  tooltip,
}: {
  label: string;
  onClick?: () => void;
  hint?: string;
  disabled?: boolean;
  tooltip?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-[0.16em] transition-colors disabled:cursor-not-allowed"
      style={{
        background: 'transparent',
        color: disabled ? 'var(--fg-subtle)' : 'var(--fg-default)',
        border: '1px solid var(--border-default)',
        opacity: disabled ? 0.65 : 1,
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.background = 'var(--bg-hover)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      <span>{label}</span>
      {hint && (
        <span
          className="text-[8px] font-mono uppercase tracking-[0.18em]"
          style={{ color: 'var(--fg-subtle)' }}
        >
          {hint}
        </span>
      )}
    </button>
  );
}

function FooterActions({ onPlanRefactor }: { onPlanRefactor?: () => void }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap pt-1">
      <FooterButton
        label="Reorder"
        hint="soon"
        disabled
        tooltip="Step reordering ships in Phase 2 — current order is the recommended sequence based on coupling cluster + blast radius"
      />
      <FooterButton
        label="Plan with AI"
        onClick={onPlanRefactor}
      />
      <FooterButton
        label="Export"
        onClick={() => {
          console.log('[StackPlanner] export clicked');
        }}
      />
    </div>
  );
}

export function StackPlanner({ stack, people, onPlanRefactor }: StackPlannerProps): JSX.Element {
  const personIndex = useMemo(() => {
    const m = new Map<PersonId, Person>();
    for (const p of people) m.set(p.id, p);
    return m;
  }, [people]);

  if (!stack) {
    return (
      <GlassCard className="px-3.5 py-3">
        <SectionHeader title="Refactor Stack" />
        <EmptyHint text="No refactor stack for this zone — pick a zone with a planned stack." />
      </GlassCard>
    );
  }

  const badge = MERGE_STRATEGY_SHORT[stack.mergeStrategy];

  return (
    <GlassCard className="px-3.5 py-3 space-y-3.5">
      <SectionHeader title="Refactor Stack" badge={badge} />

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

      {stack.steps.length === 0 ? (
        <EmptyHint text="No steps planned yet for this stack." />
      ) : (
        <ol className="space-y-2 list-none">
          {stack.steps.map((step, idx) => (
            <StepCard
              key={step.id}
              step={step}
              index={idx}
              isLast={idx === stack.steps.length - 1}
              reviewer={personIndex.get(step.suggestedReviewerId)}
            />
          ))}
        </ol>
      )}

      <div
        className="h-px w-full"
        style={{ background: 'var(--border-muted)' }}
      />

      <FooterActions onPlanRefactor={onPlanRefactor} />
    </GlassCard>
  );
}
