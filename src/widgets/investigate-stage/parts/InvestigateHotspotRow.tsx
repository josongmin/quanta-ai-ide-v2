import type { CSSProperties } from 'react';
import { Sparkles } from 'lucide-react';
import type { HotspotEntry } from '@entities/hotspot';
import type { InvestigationTarget } from '@features/investigation';

type Props = {
  entry: HotspotEntry;
  label: string;
  onInvestigate: (target: InvestigationTarget) => void;
};

export function InvestigateHotspotRow({ entry, label, onInvestigate }: Props) {
  const rowStyle: CSSProperties = {
    background: 'var(--bg-surface-muted)',
    borderColor: 'var(--border-default)',
    color: 'var(--fg-default)',
  };
  const scoreStyle: CSSProperties = {
    color: 'var(--fg-subtle)',
    fontSize: '10px',
  };
  const btnStyle: CSSProperties = {
    background: 'var(--bg-surface-strong)',
    color: 'var(--fg-strong)',
    borderColor: 'var(--border-default)',
    fontSize: '10px',
  };

  const handleClick = () => {
    const id = `file:${String(entry.fileId)}`;
    onInvestigate({
      kind: 'file',
      id,
      label,
      subtitle: `hotspot score ${entry.score.toFixed(2)}`,
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
        title={label}
      >
        {label}
      </span>
      <span style={scoreStyle} className="font-mono tabular-nums">
        {entry.score.toFixed(2)}
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

export default InvestigateHotspotRow;
