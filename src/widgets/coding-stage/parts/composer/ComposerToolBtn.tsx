// Extracted verbatim from Composer.tsx — byte-for-byte. A separate
// filename (not the pre-existing orphan composer/ToolBtn.tsx, which uses
// a different visual treatment) so Composer's rendered output is
// unchanged.
export function ToolBtn({
  icon: Icon, title, onClick, disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  // Buttons without an onClick are demo-only. We mark them aria-disabled
  // and disable the cursor so users get truthful affordance instead of a
  // dead click.
  const interactive = !!onClick && !disabled;
  return (
    <button type="button"
      title={disabled ? `${title} · demo only` : title}
      aria-label={title}
      aria-disabled={!interactive}
      onClick={interactive ? onClick : undefined}
      tabIndex={interactive ? 0 : -1}
      className={`p-1.5 rounded-md transition-colors ${
        interactive
          ? 'text-[color:var(--fg-subtle)] hover:text-[color:var(--fg-strong)] hover:bg-[color:var(--bg-hover)] cursor-pointer'
          : 'text-[color:var(--fg-subtle)] opacity-50 cursor-not-allowed'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}
