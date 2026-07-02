export function KeyChip({ combo, conflict, customized }: { combo: string; conflict: boolean; customized: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-0.5 h-7 px-2 rounded text-[11px] font-mono tabular-nums shrink-0"
      style={{
        background: conflict ? 'var(--intent-warn-bg)' : customized ? 'color-mix(in srgb, var(--fg-accent) 14%, transparent)' : 'var(--bg-surface-muted)',
        color: conflict ? 'var(--intent-warn-fg)' : customized ? 'var(--fg-accent)' : 'var(--fg-default)',
        border: `1px solid ${conflict ? 'var(--intent-warn-fg)' : customized ? 'var(--fg-accent)' : 'var(--border-muted)'}`,
        minWidth: 60,
        justifyContent: 'center',
      }}
    >
      {combo}
    </span>
  );
}
