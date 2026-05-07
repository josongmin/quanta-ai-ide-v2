export function StackedRatioBar({
  segments, total,
  // `isDark` retained for call-site compatibility; styling is now token-driven.
  isDark: _isDark,
}: {
  isDark?: boolean;
  segments: { key: string; n: number; hue: string }[];
  total: number;
}) {
  const safe = Math.max(1, total);
  return (
    <div
      className="flex w-full h-2 rounded-full overflow-hidden"
      style={{ background: 'var(--bg-surface-muted)' }}
    >
      {segments.map((s) => (
        <div
          key={s.key}
          style={{ width: `${(s.n / safe) * 100}%`, background: s.hue }}
          className="h-full"
          title={`${s.key}: ${s.n}`}
        />
      ))}
    </div>
  );
}
