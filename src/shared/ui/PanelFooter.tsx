// Sticky footer strip for inspector panels. Theme-agnostic via semantic
// tokens — no `isDark` prop required.
export function PanelFooter({
  text,
  // `isDark` retained for call-site compatibility; styling is now token-driven.
  isDark: _isDark,
}: { text: string; isDark?: boolean }) {
  return (
    <footer
      className="shrink-0 px-5 py-2.5 border-t text-[9px] font-mono uppercase tracking-[0.18em]"
      style={{
        borderColor: 'var(--border-muted)',
        color: 'var(--fg-subtle)',
      }}
    >
      {text}
    </footer>
  );
}
