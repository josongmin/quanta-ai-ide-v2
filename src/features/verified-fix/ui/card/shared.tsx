import { Check, AlertTriangle, Hourglass, X as XIcon } from 'lucide-react';
import type { ProofObligation } from '../../model/types';
import { SUCCESS, DANGER, WARN, INFO } from './tokens';

export function PaneHeader({ label }: { label: string }) {
  return (
    <div className="text-[9px] font-black uppercase tracking-[var(--track-eyebrow)] text-[var(--fg-subtle)] mb-2">
      {label}
    </div>
  );
}

export function SubHeader({ label, tone }: { label: string; tone: 'ok' | 'warn' }) {
  const color = tone === 'ok' ? SUCCESS : WARN;
  return (
    <div
      className="text-[8px] font-mono uppercase tracking-[var(--track-eyebrow)] mb-1.5 flex items-center gap-1"
      style={{ color }}
    >
      <span className="w-1 h-1 rounded-full" style={{ background: color }} />
      {label}
    </div>
  );
}

export function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[8px] font-mono uppercase tracking-[var(--track-eyebrow)] text-[var(--fg-subtle)] mb-0.5">{label}</div>
      <div className="text-[10px] text-[var(--fg-default)] leading-snug">{value}</div>
    </div>
  );
}

type ObligationVisual = { color: string; Icon: typeof Check; label: string };

// status → { color, icon, label } lookup. Replaces the prior switch so a
// new status is one table entry (Open/Closed). Colors are unchanged from
// the switch: pass/fail/partial reuse the severity tones, unknown stays on
// the info token, pending on `--fg-subtle`.
const OBLIGATION_VISUAL: Record<ProofObligation['status'], ObligationVisual> = {
  pass:    { color: SUCCESS, Icon: Check, label: 'pass' },
  fail:    { color: DANGER, Icon: XIcon, label: 'fail' },
  partial: { color: WARN, Icon: AlertTriangle, label: 'partial' },
  unknown: { color: INFO, Icon: AlertTriangle, label: 'unknown' },
  pending: { color: 'var(--fg-subtle)', Icon: Hourglass, label: 'pending' },
};

export function obligationVisual(s: ProofObligation['status']): ObligationVisual {
  return OBLIGATION_VISUAL[s] ?? OBLIGATION_VISUAL.pending;
}
