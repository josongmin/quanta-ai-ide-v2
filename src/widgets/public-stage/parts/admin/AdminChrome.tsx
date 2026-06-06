// Section chrome + stat band for the Super-admin page.

export function SectionDivider() {
  return (
    <div
      aria-hidden
      className="my-10 h-px w-full"
      style={{ background: 'var(--border-muted)' }}
    />
  );
}

export function SectionHeader({
  eyebrow, title, hint,
}: { eyebrow: string; title: string; hint: string }) {
  return (
    <header className="flex flex-col gap-1 mb-4">
      <span
        className="text-[10px] uppercase tracking-[0.14em] font-semibold"
        style={{ color: 'var(--fg-subtle)' }}
      >
        {eyebrow}
      </span>
      <h2 className="text-[15px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
        {title}
      </h2>
      <p className="text-[12px] leading-snug max-w-[640px]" style={{ color: 'var(--fg-muted)' }}>
        {hint}
      </p>
    </header>
  );
}

export function Stat({
  label, value, tone, last = false,
}: { label: string; value: string; tone?: 'warn'; last?: boolean }) {
  const valueColor = tone === 'warn' ? 'var(--intent-warn-fg)' : 'var(--fg-strong)';
  return (
    <div
      className="flex flex-col gap-1 px-4 py-3"
      style={{ borderRight: last ? 'none' : '1px solid var(--border-muted)' }}
    >
      <span
        className="text-[10px] uppercase tracking-[0.14em] font-semibold"
        style={{ color: 'var(--fg-subtle)' }}
      >
        {label}
      </span>
      <span className="text-[20px] font-semibold tabular-nums" style={{ color: valueColor }}>
        {value}
      </span>
    </div>
  );
}
