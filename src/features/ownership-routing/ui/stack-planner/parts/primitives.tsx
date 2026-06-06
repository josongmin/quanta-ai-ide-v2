import type { MergeStrategy, Person, RiskBadge } from '@entities/ownership';
import { createAvatarStyle, riskTone } from '../../../lib';

export const MERGE_STRATEGY_SHORT: Record<MergeStrategy, string> = {
  'split-now': 'SPLIT NOW',
  'keep-as-one': 'KEEP AS ONE',
  'land-bottom-up': 'LAND BOTTOM-UP',
  parallelizable: 'PARALLELIZABLE',
  'risky-serial': 'RISKY SERIAL',
};

export function PersonAvatar({
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
        ...createAvatarStyle(person, size),
        fontSize,
      }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

export function MergeStrategyPill({ strategy }: { strategy: MergeStrategy }) {
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

export function RiskBadgePill({ risk }: { risk: RiskBadge }) {
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
