// Inline empty-state hint. Theme-agnostic — uses semantic foreground tokens
// emitted by `applyTokens`, so the same component reads correctly in both
// dark and light modes.
export function EmptyHint({
  text,
  // `isDark` retained for call-site compatibility; styling is now token-driven.
  isDark: _isDark,
}: { text: string; isDark?: boolean }) {
  return (
    <div className="text-[10px] italic text-fg-subtle">
      {text}
    </div>
  );
}
