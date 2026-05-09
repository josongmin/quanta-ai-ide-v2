import type { CSSProperties } from 'react';
import { Sparkles } from 'lucide-react';
import type { Suspect } from '@entities/suspect';
import type { InvestigationTarget } from '@features/investigation';

type Props = {
  incidentId: string;
  topSuspect: Suspect | null;
  onInvestigate: (target: InvestigationTarget) => void;
};

export function InvestigateIncidentRow({ incidentId, topSuspect, onInvestigate }: Props) {
  const rowStyle: CSSProperties = {
    background: 'var(--bg-surface-muted)',
    borderColor: 'var(--border-default)',
    color: 'var(--fg-default)',
  };
  const subStyle: CSSProperties = {
    color: 'var(--fg-subtle)',
    fontSize: '10px',
  };
  const btnStyle: CSSProperties = {
    background: 'var(--bg-surface-strong)',
    color: 'var(--fg-strong)',
    borderColor: 'var(--border-default)',
    fontSize: '10px',
  };

  const subtitle = topSuspect
    ? `suspect: ${topSuspect.commitSha.slice(0, 8)}`
    : 'no suspects yet';

  const handleClick = () => {
    onInvestigate({
      kind: 'incident',
      id: `inc:${incidentId}`,
      label: incidentId,
      subtitle,
    });
  };

  return (
    <div
      className="flex items-center gap-2 px-2 py-1.5 rounded-md border"
      style={rowStyle}
    >
      <span
        className="flex-1 truncate font-mono"
        style={{ fontSize: '11px', color: 'var(--fg-default)' }}
        title={incidentId}
      >
        {incidentId}
      </span>
      <span style={subStyle} className="font-mono truncate">
        {subtitle}
      </span>
      <button
        type="button"
        onClick={handleClick}
        style={btnStyle}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border font-bold uppercase tracking-[0.12em] hover:[background:var(--bg-hover)]"
      >
        <Sparkles size={10} aria-hidden="true" />
        Investigate
      </button>
    </div>
  );
}

export default InvestigateIncidentRow;
