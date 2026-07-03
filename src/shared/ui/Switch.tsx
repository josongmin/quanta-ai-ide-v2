import type { CSSProperties } from 'react';

// Static track/thumb styling hoisted to module scope so it isn't reallocated on
// every render. Only the prop/state-dependent bits (track background, cursor,
// opacity; thumb transform) are merged in inline below.
const TRACK_STYLE_BASE: CSSProperties = Object.freeze({
  width: 36,
  height: 20,
  borderRadius: 'var(--radius-pill)',
  position: 'relative',
  transition: 'background-color 160ms ease',
  border: 'none',
  padding: 0,
  display: 'inline-block',
  flexShrink: 0,
});
const THUMB_STYLE_BASE: CSSProperties = Object.freeze({
  position: 'absolute',
  top: 2,
  left: 2,
  width: 16,
  height: 16,
  borderRadius: '50%',
  background: 'var(--fg-on-accent)',
  transition: 'transform 160ms ease',
  boxShadow: 'var(--shadow-sm)',
});

type Props = {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  /**
   * Visible text for the toggle. When provided, renders a row with the
   * label on the left and the toggle on the right; the same string is used
   * as `aria-label`. When omitted, renders just the toggle (callers are
   * expected to provide their own labelling).
   */
  label?: string;
  /** Emphasises the label as a section-primary toggle. */
  primary?: boolean;
};

export function Switch({ checked, onChange, disabled, label, primary }: Props) {
  const trackStyle: CSSProperties = {
    ...TRACK_STYLE_BASE,
    background: checked ? 'var(--intent-success-vivid)' : 'var(--bg-active)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  };
  const thumbStyle: CSSProperties = {
    ...THUMB_STYLE_BASE,
    transform: checked ? 'translateX(16px)' : 'translateX(0)',
  };

  const button = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => { if (!disabled) onChange(!checked); }}
      style={trackStyle}
    >
      <span style={thumbStyle} />
    </button>
  );

  if (!label) return button;

  return (
    <label
      className={`flex items-center justify-between gap-3 text-sm cursor-pointer select-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      <span
        className={primary ? 'font-bold' : ''}
        style={{ color: 'var(--fg-default)' }}
      >
        {label}
      </span>
      {button}
    </label>
  );
}
