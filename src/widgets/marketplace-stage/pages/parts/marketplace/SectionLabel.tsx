export function SectionLabel({
  icon: Icon, label, hint,
}: { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; label: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between mt-12 mb-4">
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5" style={{ color: 'var(--fg-accent)' }} />
        <h2 className="text-[12px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
          {label}
        </h2>
      </div>
      {hint && (
        <span className="text-[11px]" style={{ color: 'var(--fg-subtle)' }}>{hint}</span>
      )}
    </div>
  );
}
