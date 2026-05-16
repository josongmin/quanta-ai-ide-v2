export function Kbd({ isDark, children }: { isDark: boolean; children: React.ReactNode }) {
  void isDark;
  return (
    <kbd className={`px-1 h-4 inline-flex items-center justify-center rounded-md bg-[var(--bg-elevated)]`}>
      {children}
    </kbd>
  );
}
