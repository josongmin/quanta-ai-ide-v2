// Extracted verbatim from Composer.tsx — byte-for-byte. A separate
// filename (not the pre-existing orphan composer/Kbd.tsx, which uses a
// different visual treatment) so Composer's rendered output is unchanged.
export function Kbd({ isDark, children }: { isDark: boolean; children: React.ReactNode }) {
  void isDark;
  return (
    <kbd className="px-1 h-4 inline-flex items-center justify-center rounded-md bg-[color:var(--bg-elevated)]">
      {children}
    </kbd>
  );
}
