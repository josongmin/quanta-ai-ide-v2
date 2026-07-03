import type { Category } from './types';

type Chip = 'All' | Category;
type ChipTone = 'success' | 'info' | 'warn' | 'neutral';

const CHIP_TONE: Record<Chip, ChipTone> = {
  New:      'success',
  Improved: 'info',
  Fixed:    'warn',
  All:      'neutral',
};

const ACTIVE_BG: Record<ChipTone, string> = {
  success: 'var(--intent-success-bg)',
  info:    'var(--intent-info-bg)',
  warn:    'var(--intent-warn-bg)',
  neutral: 'var(--bg-active)',
};

const ACTIVE_FG: Record<ChipTone, string> = {
  success: 'var(--intent-success-fg)',
  info:    'var(--intent-info-fg)',
  warn:    'var(--intent-warn-fg)',
  neutral: 'var(--fg-strong)',
};

const ACTIVE_BORDER: Record<ChipTone, string> = {
  success: 'var(--intent-success-fg)',
  info:    'var(--intent-info-fg)',
  warn:    'var(--intent-warn-fg)',
  neutral: 'var(--border-default)',
};

export function FilterChips({
  filter, counts, onChange,
}: {
  filter: Chip;
  counts: Record<Chip, number>;
  onChange: (c: Chip) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 mb-8">
      {(['All', 'New', 'Improved', 'Fixed'] as const).map((c) => {
        const active = filter === c;
        const tone = CHIP_TONE[c];
        return (
          <button
            key={c}
            type="button"
            onClick={() => { onChange(c); }}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-base font-semibold transition-colors"
            style={{
              background: active ? ACTIVE_BG[tone] : 'var(--bg-canvas)',
              color: active ? ACTIVE_FG[tone] : 'var(--fg-muted)',
              border: `1px solid ${active ? ACTIVE_BORDER[tone] : 'var(--border-default)'}`,
            }}
          >
            {c}
            <span
              className="text-xs tabular-nums px-1.5 rounded"
              style={{
                background: active ? 'color-mix(in srgb, currentColor 16%, transparent)' : 'var(--bg-surface-muted)',
                color: 'inherit',
              }}
            >
              {counts[c]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
