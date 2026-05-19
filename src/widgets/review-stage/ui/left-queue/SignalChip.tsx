import { Check, Loader2, X } from 'lucide-react';
import type { summariseChecks } from '@entities/pr';

// ── SignalChip / CiChip ─────────────────────────────────────────────────
// Token-light signal chips. We deliberately don't use a coloured pill
// background — Cleveland & McGill (1984): a single-icon-+-number is
// faster to read than a tinted pill, and the colour comes from the
// glyph itself. Pill-with-tinted-bg is reserved for the verdict rail.
export function SignalChip({
  tone, icon, label, title,
}: {
  tone: string;
  icon: React.ReactNode;
  label: string;
  title: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 font-mono tabular-nums"
      style={{ color: tone }}
      title={title}
    >
      {icon}
      {label}
    </span>
  );
}

export function CiChip({
  state, ci,
}: {
  state: 'pass' | 'fail' | 'running';
  ci: ReturnType<typeof summariseChecks>;
}) {
  if (state === 'fail') {
    return (
      <SignalChip
        tone="var(--intent-danger-fg)"
        icon={<X className="w-2.5 h-2.5" strokeWidth={3} />}
        label={`${String(ci.required.failed)} CI`}
        title={`${String(ci.required.failed)} required check${ci.required.failed === 1 ? '' : 's'} failing`}
      />
    );
  }
  if (state === 'running') {
    return (
      <span
        className="inline-flex items-center gap-1 font-mono tabular-nums"
        style={{ color: 'var(--intent-info-fg)' }}
        title={`${String(ci.required.pending)} check${ci.required.pending === 1 ? '' : 's'} running`}
      >
        <Loader2 className="w-2.5 h-2.5 animate-spin" strokeWidth={2.5} />
        CI
      </span>
    );
  }
  // pass — render as a soft check, not a chip, since a green pass
  // is the default expectation and shouldn't compete for attention.
  return (
    <span
      className="inline-flex items-center gap-1 font-mono tabular-nums"
      style={{ color: 'var(--intent-success-fg)' }}
      title="all required checks passing"
    >
      <Check className="w-2.5 h-2.5" strokeWidth={2.5} />
    </span>
  );
}
