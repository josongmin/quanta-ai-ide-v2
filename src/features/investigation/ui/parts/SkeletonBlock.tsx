export function SkeletonBlock() {
  return (
    <div
      className="h-12 rounded-md border animate-pulse"
      style={{
        background: 'var(--bg-surface-muted)',
        borderColor: 'var(--border-muted)',
      }}
    />
  );
}
