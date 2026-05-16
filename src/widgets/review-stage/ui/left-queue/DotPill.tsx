// Tiny status pill used in the project header for critical/attention dot counts.

export function DotPill({
  tone, label, title,
}: { tone: string; label: string; title: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 h-5 rounded-full text-[10px] font-mono tabular-nums"
      style={{
        background: `${tone}1a`,
        border: `1px solid ${tone}55`,
        color: tone,
      }}
      title={title}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: tone }} />
      {label}
    </span>
  );
}
