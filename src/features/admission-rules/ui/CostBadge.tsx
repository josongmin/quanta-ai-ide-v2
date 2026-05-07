import { useTheme } from '@shared/theme';
import { COST_HINT, type CostClass } from '@entities/admission';
import { COST_TEXT } from './sourceStyle';

// Cost is rendered as plain monospace text. We reserve colour for severity,
// so cost has to communicate through type weight + a thin border instead
// of pulling another hue into the palette.

export function CostBadge({ cost }: { cost: CostClass }) {
  const { isDark } = useTheme();
  const heavy = cost === 'slow' || cost === 'background';
  return (
    <span
      title={COST_HINT[cost]}
      className={`inline-flex items-center px-1.5 py-px rounded-md font-mono text-[10px] uppercase tracking-[0.18em] ${
        isDark
          ? `${heavy ? 'text-white/70' : 'text-white/55'} bg-white/[0.04]`
          : `${heavy ? 'text-black/70' : 'text-black/55'} bg-black/[0.04]`
      }`}
    >
      {COST_TEXT[cost]}
    </span>
  );
}
