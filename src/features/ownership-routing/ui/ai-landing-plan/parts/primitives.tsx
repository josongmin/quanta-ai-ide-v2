import { useTranslation } from 'react-i18next';
import type { MergeStrategy, Person, RiskBadge, StackStepKind } from '@entities/ownership';
import { PersonAvatar, riskTone } from '../../../lib';
import { KIND_KEY, MERGE_STRATEGY_KEY } from './types';

export { PersonAvatar };

export function BlinkingCursor() {
  return (
    <span
      aria-hidden="true"
      className="inline-block align-baseline ml-[2px]"
      style={{
        width: 6,
        height: 12,
        background: 'var(--fg-default)',
        animation: 'ailp-blink 900ms steps(2, end) infinite',
        verticalAlign: '-1px',
      }}
    />
  );
}

export function RevealedBlock({
  shown,
  children,
  delayMs = 0,
}: {
  shown: boolean;
  children: React.ReactNode;
  delayMs?: number;
}) {
  if (!shown) return null;
  return (
    <div
      style={{
        animation: `ailp-fade-in 320ms ease-out ${delayMs}ms both`,
      }}
    >
      {children}
    </div>
  );
}

export function PhaseLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-2xs font-black uppercase tracking-[0.22em] mb-1.5"
      style={{ color: 'var(--fg-subtle)' }}
    >
      {children}
    </div>
  );
}

export function StrategyPill({ strategy }: { strategy: MergeStrategy }) {
  const { t } = useTranslation('ownership');
  return (
    <span
      className="inline-flex items-center px-2 py-1 rounded-md text-xs font-black uppercase tracking-eyebrow"
      style={{
        background: 'var(--bg-surface-muted)',
        color: 'var(--fg-strong)',
        border: '1px solid var(--border-default)',
      }}
    >
      {t(MERGE_STRATEGY_KEY[strategy])}
    </span>
  );
}

export function RiskPill({ risk }: { risk: RiskBadge }) {
  const { t } = useTranslation('ownership');
  const tone = riskTone(risk);
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded-md text-2xs font-black uppercase tracking-eyebrow shrink-0"
      style={{
        background: tone.bg,
        color: tone.fg,
        border: '1px solid color-mix(in srgb, currentColor 28%, transparent)',
      }}
    >
      {t(tone.labelKey)}
    </span>
  );
}

export function KindPill({ kind }: { kind: StackStepKind }) {
  const { t } = useTranslation('ownership');
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded-md text-2xs font-black uppercase tracking-[0.22em]"
      style={{
        background: 'var(--bg-surface-muted)',
        color: 'var(--fg-muted)',
        border: '1px solid var(--border-muted)',
      }}
    >
      {t(KIND_KEY[kind])}
    </span>
  );
}

export function ReviewerChip({ person }: { person: Person | undefined }) {
  const { t } = useTranslation('ownership');
  if (!person) {
    return (
      <div className="flex items-center gap-1.5 min-w-0">
        <PersonAvatar person={undefined} size={22} />
        <span className="text-xs italic" style={{ color: 'var(--fg-subtle)' }}>
          {t('plan.unassigned')}
        </span>
      </div>
    );
  }
  return (
    <div
      className="flex items-center gap-1.5 min-w-0"
      title={`${person.name} · ${person.team}`}
    >
      <PersonAvatar person={person} size={22} />
      <div className="min-w-0 flex flex-col leading-tight">
        <span
          className="text-sm font-semibold truncate"
          style={{ color: person.active ? 'var(--fg-default)' : 'var(--fg-muted)' }}
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

export function StepNumber({ n }: { n: number }) {
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

export function GeneratedPill() {
  const { t } = useTranslation('ownership');
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-2xs font-black uppercase tracking-[0.22em]"
      style={{
        background: 'var(--bg-surface-muted)',
        color: 'var(--fg-muted)',
        border: '1px solid var(--border-muted)',
      }}
    >
      <span
        aria-hidden
        className="inline-block w-1 h-1 rounded-full"
        style={{ background: 'var(--fg-muted)' }}
      />
      {t('plan.generated')}
    </span>
  );
}

export function FooterButton({
  label,
  onClick,
  primary = false,
}: {
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-bold uppercase tracking-[0.16em] transition-colors"
      style={{
        background: primary ? 'var(--bg-active)' : 'transparent',
        color: primary ? 'var(--fg-strong)' : 'var(--fg-default)',
        border: '1px solid var(--border-default)',
      }}
      onMouseEnter={(e) => {
        if (!primary) e.currentTarget.style.background = 'var(--bg-hover)';
      }}
      onMouseLeave={(e) => {
        if (!primary) e.currentTarget.style.background = 'transparent';
      }}
    >
      {label}
    </button>
  );
}
