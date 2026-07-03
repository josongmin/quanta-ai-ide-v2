// Backup code — formatted xxxx-xxxx-xxxx with auto dashes.

export function BackupInput({
  value, onChange, error,
}: { value: string; onChange: (v: string) => void; error: boolean }) {
  // Strip non-alphanum, lowercase, slice to 12, then re-insert dashes.
  const handle = (raw: string) => {
    const clean = raw.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 12);
    const out =
      clean.length <= 4 ? clean
      : clean.length <= 8 ? `${clean.slice(0, 4)}-${clean.slice(4)}`
      : `${clean.slice(0, 4)}-${clean.slice(4, 8)}-${clean.slice(8)}`;
    onChange(out);
  };

  return (
    <div className="flex flex-col gap-2">
      <span
        className="text-xs uppercase tracking-eyebrow font-medium"
        style={{ color: 'var(--fg-subtle)' }}
      >
        Backup code
      </span>
      <input
        type="text"
        autoComplete="one-time-code"
        autoFocus
        placeholder="xxxx-xxxx-xxxx"
        value={value}
        onChange={(e) => { handle(e.target.value); }}
        className="h-10 px-3 rounded-md text-[15px] font-mono tabular-nums tracking-wider outline-none transition-colors"
        style={{
          background: 'var(--bg-surface-muted)',
          border: `1px solid ${error ? 'var(--intent-danger-fg)' : 'var(--border-default)'}`,
          color: 'var(--fg-strong)',
        }}
      />
      <p className="text-xs" style={{ color: 'var(--fg-subtle)' }}>
        Each backup code can only be used once. Find them in your authenticator settings.
      </p>
    </div>
  );
}
