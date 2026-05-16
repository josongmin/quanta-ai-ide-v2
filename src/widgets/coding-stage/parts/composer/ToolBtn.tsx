export function ToolBtn({
  icon: Icon, title, isDark, onClick, disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  isDark: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  void isDark;
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
          ? ('text-[var(--fg-muted)] hover:text-[var(--fg-strong)] hover:[background:var(--bg-hover)] cursor-pointer')
          : ('text-[var(--fg-subtle)] cursor-not-allowed')
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}
