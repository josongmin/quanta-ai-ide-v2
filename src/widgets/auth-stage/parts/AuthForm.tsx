import { forwardRef, type ReactNode, type InputHTMLAttributes } from 'react';
import { Link } from '@tanstack/react-router';

// Tight form primitives used across the auth pages. They all collapse to
// the same input height (h-9), border treatment, and label rhythm so
// every page reads as one family.

type FieldProps = {
  label: string;
  hint?: string;
  hintTo?: string;       // when set, hint becomes a router Link
  trailing?: ReactNode;
  error?: string;
} & InputHTMLAttributes<HTMLInputElement>;

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, hint, hintTo, trailing, error, ...rest }, ref,
) {
  return (
    <label className="flex flex-col gap-1.5">
      <span
        className="text-xs uppercase tracking-eyebrow font-medium flex items-center justify-between"
        style={{ color: 'var(--fg-subtle)' }}
      >
        <span>{label}</span>
        {hint && (hintTo
          ? (
            <Link to={hintTo as never} className="lowercase tracking-normal" style={{ color: 'var(--fg-link)' }}>
              {hint}
            </Link>
          )
          : (
            <button type="button" className="lowercase tracking-normal bg-transparent border-0 p-0 cursor-pointer" style={{ color: 'var(--fg-link)', font: 'inherit' }}>
              {hint}
            </button>
          )
        )}
      </span>
      <div
        className="flex items-center h-9 rounded-md transition-colors"
        style={{
          background: 'var(--bg-surface-muted)',
          border: `1px solid ${error ? 'var(--intent-danger-fg)' : 'var(--border-default)'}`,
        }}
      >
        <input
          ref={ref}
          {...rest}
          className="flex-1 bg-transparent outline-none px-3 text-base tabular-nums"
          style={{ color: 'var(--fg-strong)' }}
        />
        {trailing && <div className="pr-2">{trailing}</div>}
      </div>
      {error && (
        <span className="text-sm" style={{ color: 'var(--intent-danger-fg)' }}>
          {error}
        </span>
      )}
    </label>
  );
});

type ButtonProps = {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  full?: boolean;
  type?: 'submit' | 'button';
  onClick?: () => void;
  leading?: ReactNode;
  disabled?: boolean;
};

export function Button({
  children, variant = 'primary', full = true, type = 'button',
  onClick, leading, disabled,
}: ButtonProps) {
  const base = `inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-md text-base font-semibold tracking-tight transition-colors ${full ? 'w-full' : ''}`;

  const styles =
    variant === 'primary'
      ? { background: 'var(--fg-strong)', color: 'var(--bg-canvas)', border: '1px solid transparent' }
      : variant === 'secondary'
        ? { background: 'var(--bg-surface-muted)', color: 'var(--fg-strong)', border: '1px solid var(--border-default)' }
        : { background: 'transparent', color: 'var(--fg-default)', border: '1px solid transparent' };

  return (
    <button
      // eslint-disable-next-line react/button-has-type -- type is typed as 'submit' | 'button' literal union
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={base}
      style={{ ...styles, opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
      onMouseEnter={(e) => {
        if (disabled) return;
        if (variant === 'secondary') e.currentTarget.style.background = 'var(--bg-active)';
        else if (variant === 'ghost') e.currentTarget.style.background = 'var(--bg-hover)';
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        if (variant === 'secondary') e.currentTarget.style.background = 'var(--bg-surface-muted)';
        else if (variant === 'ghost') e.currentTarget.style.background = 'transparent';
      }}
    >
      {leading}
      {children}
    </button>
  );
}

export function HRule({ label = 'or' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-xs uppercase tracking-eyebrow"
      style={{ color: 'var(--fg-subtle)' }}
    >
      <span className="flex-1 h-px" style={{ background: 'var(--border-muted)' }} />
      <span>{label}</span>
      <span className="flex-1 h-px" style={{ background: 'var(--border-muted)' }} />
    </div>
  );
}

