import { StatusDot } from '@shared/ui';

export function DotPill({
  tone, label, title,
}: { tone: string; label: string; title: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 h-5 rounded-full text-xs font-mono tabular-nums"
      style={{
        background: `color-mix(in srgb, ${tone} 10%, transparent)`,
        border: `1px solid color-mix(in srgb, ${tone} 33%, transparent)`,
        color: tone,
      }}
      title={title}
    >
      <StatusDot color={tone} size="xs" />
      {label}
    </span>
  );
}
