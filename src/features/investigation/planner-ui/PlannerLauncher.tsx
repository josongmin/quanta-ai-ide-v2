import type { CSSProperties } from 'react';
import { GitBranch } from 'lucide-react';

type Props = {
  onRun: () => void;
  running: boolean;
};

export function PlannerLauncher({ onRun, running }: Props) {
  const disabled = running;
  const style: CSSProperties = {
    background: disabled ? 'var(--bg-surface-muted)' : 'var(--bg-active)',
    color: disabled ? 'var(--fg-muted)' : 'var(--fg-strong)',
    border: '1px solid var(--border-default)',
    opacity: disabled ? 0.6 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={disabled ? undefined : onRun}
      style={style}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium"
      title={running ? 'Reflection loop running…' : 'Run a multi-hop reflection over the gathered evidence'}
    >
      <GitBranch size={12} aria-hidden="true" />
      <span>{running ? 'Reflecting…' : 'Run reflection loop'}</span>
    </button>
  );
}
