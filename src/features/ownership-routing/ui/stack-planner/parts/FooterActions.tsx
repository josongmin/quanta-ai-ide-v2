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
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold uppercase tracking-[0.16em] transition-colors disabled:cursor-not-allowed"
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
          className="text-2xs font-mono uppercase tracking-eyebrow"
          style={{ color: 'var(--fg-subtle)' }}
        >
          {hint}
        </span>
      )}
    </button>
  );
}

export function FooterActions({ onPlanRefactor }: { onPlanRefactor?: () => void }) {
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
          console.warn('[StackPlanner] export clicked');
        }}
      />
    </div>
  );
}
