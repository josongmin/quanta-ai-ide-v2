import type { CSSProperties } from 'react';

type Option<T extends string | number> = { value: T; label: string };

type Props<T extends string | number> = {
  value: T;
  onChange: (v: T) => void;
  options: Option<T>[];
  size?: 'sm' | 'md';
  disabled?: boolean;
};

export function SegmentedControl<T extends string | number>({
  value, onChange, options, size = 'md', disabled,
}: Props<T>) {
  const groupStyle: CSSProperties = {
    display: 'inline-flex',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    background: 'var(--bg-surface-muted)',
    overflow: 'hidden',
    opacity: disabled ? 0.5 : 1,
  };
  const paddingY = size === 'sm' ? 'var(--space-0-5)' : 'var(--space-1)';
  const paddingX = size === 'sm' ? 'var(--space-2)' : 'var(--space-3)';
  const fs = size === 'sm' ? 'var(--fs-2xs)' : 'var(--fs-xs)';

  return (
    <div role="radiogroup" style={groupStyle}>
      {options.map((opt, idx) => {
        const active = opt.value === value;
        const buttonStyle: CSSProperties = {
          padding: `${paddingY} ${paddingX}`,
          fontSize: fs,
          fontWeight: 'var(--fw-bold)',
          background: active ? 'var(--bg-active)' : 'transparent',
          color: active ? 'var(--fg-strong)' : 'var(--fg-muted)',
          borderLeft: idx === 0 ? 'none' : '1px solid var(--border-default)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'background-color 120ms ease, color 120ms ease',
          outline: 'none',
        };
        return (
          <button
            key={String(opt.value)}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => { if (!disabled) onChange(opt.value); }}
            style={buttonStyle}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
