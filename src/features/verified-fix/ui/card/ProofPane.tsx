import { AlertTriangle, AlertOctagon } from 'lucide-react';
import type {
  CandidateFix, CounterEvidence, ProofObligation, ValidationRun,
} from '../../model/types';
import { DANGER, WARN, NEUTRAL, mix } from './tokens';
import { PaneHeader, SubHeader, obligationVisual } from './shared';

export function ProofPane({
  candidate, validations,
}: { candidate: CandidateFix; validations: ValidationRun[] }) {
  // Use the most recent validation's obligations if present, else the
  // candidate's own (pending) ones. This way the panel lights up live as
  // attempts complete.
  const obligations = validations.length > 0
    ? validations[validations.length - 1].obligations
    : candidate.obligations;
  return (
    <div className="px-4 py-3 border-b border-[var(--border-muted)]">
      <PaneHeader label="Coverage of risk" />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <SubHeader label="Proof obligations" tone="ok" />
          <div className="space-y-1">
            {obligations.map((o) => <ObligationRow key={o.id} o={o} />)}
          </div>
        </div>
        <div>
          <SubHeader label="Counter-evidence" tone="warn" />
          <div className="space-y-1">
            {candidate.counterEvidence.map((c) => <CounterRow key={c.id} c={c} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

function ObligationRow({ o }: { o: ProofObligation }) {
  const { color, Icon, label } = obligationVisual(o.status);
  return (
    <div
      className="flex items-start gap-2 px-2 py-1.5 rounded-md"
      style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-muted)' }}
    >
      <Icon className="w-3 h-3 shrink-0 mt-0.5" style={{ color }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold text-[var(--fg-default)] truncate">{o.label}</span>
          <span
            className="text-[8px] font-mono uppercase tracking-[var(--track-eyebrow)] shrink-0"
            style={{ color }}
          >
            {label}
          </span>
        </div>
        <div className="text-[9px] text-[var(--fg-subtle)] mt-0.5 leading-snug">{o.detail}</div>
      </div>
    </div>
  );
}

function CounterRow({ c }: { c: CounterEvidence }) {
  const color = c.severity === 'block' ? DANGER : c.severity === 'concern' ? WARN : NEUTRAL;
  const Icon = c.severity === 'block' ? AlertOctagon : AlertTriangle;
  return (
    <div
      className="flex items-start gap-2 px-2 py-1.5 rounded-md"
      style={{ background: mix(color, 5), border: `1px solid ${mix(color, 20)}` }}
    >
      <Icon className="w-3 h-3 shrink-0 mt-0.5" style={{ color }} />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-semibold text-[var(--fg-default)] leading-snug">{c.label}</div>
        <div className="text-[9px] text-[var(--fg-subtle)] mt-0.5 leading-snug">{c.detail}</div>
      </div>
    </div>
  );
}
