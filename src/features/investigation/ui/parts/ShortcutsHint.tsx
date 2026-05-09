export function ShortcutsHint() {
  return (
    <span
      className="font-mono truncate"
      style={{
        fontSize: 9,
        color: 'var(--fg-subtle)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        minWidth: 0,
      }}
      aria-hidden="true"
    >
      ESC close · n toggle mode · j/k navigate · ⌘R regenerate
    </span>
  );
}
