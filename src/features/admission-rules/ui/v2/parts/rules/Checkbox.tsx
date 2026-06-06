import type { V2Theme } from '../tokens';

// Tri-state checkbox used by the rule table header (select-all, with an
// indeterminate dash) and per-row select toggles.
export function Checkbox({
  checked, indeterminate, t,
}: { checked: boolean; indeterminate?: boolean; t: V2Theme }) {
  return (
    <span
      className="inline-flex w-3.5 h-3.5 items-center justify-center rounded-md transition-colors"
      style={{
        background: checked || indeterminate ? t.accent : 'transparent',
        border: `1px solid ${checked || indeterminate ? t.accent : t.textFaint}`,
      }}
    >
      {checked && (
        <svg viewBox="0 0 12 12" className="w-2.5 h-2.5" fill="none" stroke={t.page} strokeWidth={2.4}>
          <path d="M2 6.5 L5 9.5 L10 3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {indeterminate && !checked && (
        <span className="block w-2 h-[2px]" style={{ background: t.page }} />
      )}
    </span>
  );
}
