import type { ReactNode, InputHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { Check } from 'lucide-react';

// Settings primitives, distinct from the AuthForm set: these target a
// horizontal "label on left / control on right" rhythm because settings
// pages are dense and benefit from per-row stacking instead of vertical
// label+input pairs.

export function Section({
  title, hint, children, right,
}: { title: string; hint?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 py-6 first:pt-0">
      <header className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-[12px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
            {title}
          </h2>
          {hint && (
            <p className="text-[11px] leading-snug" style={{ color: 'var(--fg-subtle)' }}>
              {hint}
            </p>
          )}
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </header>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

export function Divider() {
  return (
    <div aria-hidden className="h-px w-full" style={{ background: 'var(--border-muted)' }} />
  );
}

// Two-column row: left side = label + sub, right side = control.
export function Row({
  label, sub, children, danger = false,
}: { label: string; sub?: ReactNode; children: ReactNode; danger?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-6 py-3"
      style={{ borderTop: '1px solid var(--border-muted)' }}
    >
      <div className="flex flex-col gap-1 min-w-0 flex-1 max-w-[420px]">
        <span
          className="text-[12px] font-medium"
          style={{ color: danger ? 'var(--intent-danger-fg)' : 'var(--fg-strong)' }}
        >
          {label}
        </span>
        {sub && (
          <span className="text-[11px] leading-snug" style={{ color: 'var(--fg-subtle)' }}>
            {sub}
          </span>
        )}
      </div>
      <div className="shrink-0 flex items-center gap-2">{children}</div>
    </div>
  );
}

// Inline labeled field with optional hint + error.
type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  trailing?: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>;

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, hint, error, trailing, ...rest }, ref,
) {
  return (
    <label className="flex flex-col gap-1.5">
      <span
        className="text-[10px] uppercase tracking-[0.14em] font-medium flex items-center justify-between"
        style={{ color: 'var(--fg-subtle)' }}
      >
        <span>{label}</span>
        {hint && <span className="lowercase tracking-normal">{hint}</span>}
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
          className="flex-1 bg-transparent outline-none px-3 text-[12px] tabular-nums"
          style={{ color: 'var(--fg-strong)' }}
        />
        {trailing && <div className="pr-2">{trailing}</div>}
      </div>
      {error && (
        <span className="text-[11px]" style={{ color: 'var(--intent-danger-fg)' }}>
          {error}
        </span>
      )}
    </label>
  );
});

export function Textarea({
  label, value, onChange, placeholder, maxLength, rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span
        className="text-[10px] uppercase tracking-[0.14em] font-medium flex items-center justify-between"
        style={{ color: 'var(--fg-subtle)' }}
      >
        <span>{label}</span>
        {maxLength && (
          <span className="lowercase tracking-normal tabular-nums">
            {value.length} / {maxLength}
          </span>
        )}
      </span>
      <textarea
        value={value}
        onChange={(e) => { onChange(e.target.value); }}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        className="w-full rounded-md p-2.5 text-[12px] outline-none resize-none transition-colors"
        style={{
          background: 'var(--bg-surface-muted)',
          border: '1px solid var(--border-default)',
          color: 'var(--fg-strong)',
          fontFamily: 'inherit',
        }}
      />
    </label>
  );
}

// iOS-style toggle. Used for boolean settings everywhere.
export function Toggle({
  checked, onChange, disabled = false, label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => { onChange(!checked); }}
      className="relative w-9 h-5 rounded-full transition-colors shrink-0"
      style={{
        background: checked ? 'var(--brand-vivid)' : 'var(--bg-surface-muted)',
        border: `1px solid ${checked ? 'var(--brand-vivid)' : 'var(--border-default)'}`,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <span
        className="absolute rounded-full transition-transform"
        style={{
          top: 2,
          left: 0,
          width: 14,
          height: 14,
          background: checked ? 'var(--bg-canvas)' : 'var(--fg-muted)',
          transform: `translateX(${checked ? '18px' : '2px'})`,
          boxShadow: 'var(--shadow-sm)',
        }}
      />
    </button>
  );
}

// Checkbox primitive — rectangular, used for checklists like notification matrix.
export function Checkbox({
  checked, onChange, label, disabled = false,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => { onChange(!checked); }}
      className="w-4 h-4 rounded shrink-0 inline-flex items-center justify-center transition-colors"
      style={{
        background: checked ? 'var(--brand-vivid)' : 'transparent',
        border: `1.5px solid ${checked ? 'var(--brand-vivid)' : 'var(--border-strong)'}`,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {checked && <Check className="w-2.5 h-2.5" style={{ color: 'var(--bg-canvas)' }} />}
    </button>
  );
}

// Select wrapper with consistent styling.
export function Select<T extends string>({
  value, onChange, options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string; sub?: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => { onChange(e.target.value as T); }}
      className="h-8 rounded-md px-2.5 text-[12px] outline-none cursor-pointer"
      style={{
        background: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-default)',
        color: 'var(--fg-strong)',
        minWidth: 120,
      }}
    >
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}{o.sub && ` · ${o.sub}`}
        </option>
      ))}
    </select>
  );
}

// Compact Button used inline. Bigger version exists in AuthForm; this one
// is sized for settings rows.
type ButtonProps = {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
  leading?: ReactNode;
};

export function Button({
  children, variant = 'secondary', size = 'sm', onClick, disabled, type = 'button', leading,
}: ButtonProps) {
  const h = size === 'md' ? 'h-9' : 'h-7';
  const px = size === 'md' ? 'px-3' : 'px-2.5';
  const fs = size === 'md' ? 'text-[12px]' : 'text-[11px]';

  const styles = (() => {
    switch (variant) {
      case 'primary': return { background: 'var(--fg-strong)',          color: 'var(--bg-canvas)',       border: '1px solid transparent' };
      case 'danger':  return { background: 'var(--intent-danger-fg)',    color: 'var(--bg-canvas)',       border: '1px solid transparent' };
      case 'ghost':   return { background: 'transparent',                color: 'var(--fg-muted)',         border: '1px solid transparent' };
      default:        return { background: 'var(--bg-surface-muted)',    color: 'var(--fg-default)',       border: '1px solid var(--border-default)' };
    }
  })();

  return (
    <button
      // eslint-disable-next-line react/button-has-type
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 ${h} ${px} ${fs} rounded-md font-medium transition-colors`}
      style={{ ...styles, opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
      onMouseEnter={(e) => {
        if (disabled) return;
        if (variant === 'secondary') e.currentTarget.style.background = 'var(--bg-active)';
        if (variant === 'ghost')     e.currentTarget.style.background = 'var(--bg-hover)';
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        if (variant === 'secondary') e.currentTarget.style.background = 'var(--bg-surface-muted)';
        if (variant === 'ghost')     e.currentTarget.style.background = 'transparent';
      }}
    >
      {leading}
      {children}
    </button>
  );
}

// Fixed-position save bar at the bottom. Appears (slides up) only when the
// page has dirty edits. Dismiss = Discard.
export function SaveBar({
  visible, dirty, onSave, onDiscard, savingState,
}: {
  visible: boolean;
  dirty: boolean;
  onSave: () => void;
  onDiscard: () => void;
  savingState: 'idle' | 'saving' | 'saved';
}) {
  if (!visible) return null;
  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-30 onb-stagger"
      style={{
        bottom: 'calc(var(--app-statusbar-h, 24px) + 16px)',
        pointerEvents: dirty ? 'auto' : 'none',
      }}
    >
      <div
        className="flex items-center gap-3 px-3 py-2 rounded-md"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <span
          className="text-[11px] font-medium"
          style={{ color: dirty ? 'var(--fg-strong)' : 'var(--fg-muted)' }}
        >
          {savingState === 'saving' ? 'Saving…'
            : savingState === 'saved' ? 'Saved'
            : dirty ? 'You have unsaved changes' : 'No changes'}
        </span>
        <Button variant="ghost" size="sm" onClick={onDiscard} disabled={!dirty || savingState !== 'idle'}>
          Discard
        </Button>
        <Button variant="primary" size="sm" onClick={onSave} disabled={!dirty || savingState !== 'idle'}>
          Save changes
        </Button>
      </div>
    </div>
  );
}
