type Tone = 'default' | 'success' | 'warn' | 'danger';

// Tone → color token. Record map keeps the tile open to new tones (OCP).
const TONE_COLOR: Record<Tone, string> = {
  success: 'var(--intent-success-fg)',
  warn: 'var(--intent-warn-fg)',
  danger: 'var(--intent-danger-fg)',
  default: 'var(--fg-strong)',
};

export function SummaryTile({
  label, value, tone,
}: { label: string; value: number; tone: Tone }) {
  const color = TONE_COLOR[tone];
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-1"
      style={{
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-default)',
      }}
    >
      <span className="text-xs uppercase tracking-eyebrow font-semibold" style={{ color: 'var(--fg-subtle)' }}>
        {label}
      </span>
      <span className="text-3xl font-semibold tabular-nums tracking-tight" style={{ color }}>
        {value}
      </span>
    </div>
  );
}
