import { Check, AlertTriangle, ShieldAlert } from 'lucide-react';
import type { PasswordReport } from '../lib/passwordRules';

const STRENGTH_FG: Record<PasswordReport['score'], string> = {
  0: 'var(--fg-subtle)',
  1: 'var(--intent-danger-fg)',
  2: 'var(--intent-warn-fg)',
  3: 'var(--fg-accent)',
  4: 'var(--intent-success-fg)',
};

export function PasswordStrengthPanel({ report }: { report: PasswordReport }) {
  return (
    <div className="flex flex-col gap-2.5">
      <Meter score={report.score} />

      <div className="flex items-baseline justify-between text-[10px] tabular-nums">
        <span style={{ color: STRENGTH_FG[report.score] }}>
          {report.label}
        </span>
        <span style={{ color: 'var(--fg-subtle)' }}>
          Time to crack: <span style={{ color: 'var(--fg-default)' }}>{report.estimateGuesses}</span>
        </span>
      </div>

      {report.breached && <BreachWarning />}

      <RuleList rules={report.rules} />
    </div>
  );
}

function Meter({ score }: { score: PasswordReport['score'] }) {
  return (
    <div className="grid grid-cols-4 gap-1">
      {[1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="h-[3px] rounded-full transition-colors"
          style={{
            background: i <= score ? STRENGTH_FG[score] : 'var(--border-muted)',
            transition: 'background 240ms ease',
          }}
        />
      ))}
    </div>
  );
}

function BreachWarning() {
  return (
    <div
      className="flex items-start gap-2 px-2.5 py-2 rounded-md text-[11px] leading-snug onb-stagger"
      style={{
        background: 'var(--intent-danger-bg)',
        border: '1px solid var(--intent-danger-fg)',
      }}
      role="alert"
    >
      <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'var(--intent-danger-fg)' }} />
      <div className="flex flex-col gap-0.5">
        <span className="font-semibold" style={{ color: 'var(--fg-strong)' }}>
          This password has appeared in known breaches.
        </span>
        <span style={{ color: 'var(--fg-muted)' }}>
          Choose a different password — even if you use it elsewhere, attackers already have it.
        </span>
      </div>
    </div>
  );
}

function RuleList({ rules }: { rules: PasswordReport['rules'] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
      {rules.map((r) => (
        <li
          key={r.id}
          className="flex items-center gap-1.5 text-[10px] transition-colors"
          style={{ color: r.pass ? 'var(--intent-success-fg)' : 'var(--fg-subtle)' }}
        >
          {r.pass
            ? <Check className="w-3 h-3 shrink-0 onb-tick" key={`${r.id}-yes`} />
            : <AlertTriangle className="w-3 h-3 shrink-0" />}
          <span style={{ color: r.pass ? 'var(--fg-default)' : 'var(--fg-subtle)' }}>
            {r.label}
          </span>
        </li>
      ))}
    </ul>
  );
}
