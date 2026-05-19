import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { EvidenceItem } from '@entities/investigation';
import { EvidenceCard } from '../../evidence';

export function AllEvidenceSection({
  evidence,
  pickedId,
  onPick,
}: {
  evidence: EvidenceItem[];
  pickedId: string | null;
  onPick: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(true);
  if (evidence.length === 0) return null;
  return (
    <div
      className="py-3"
      role="region"
      aria-label="All evidence"
      style={{ borderTop: '1px solid var(--border-default)' }}
    >
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); }}
        className="flex items-center gap-1.5 mb-2"
        style={{
          color: 'var(--fg-subtle)',
          fontSize: '10px',
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
        }}
        aria-expanded={open}
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span className="font-mono uppercase tracking-wider">
          All evidence ({evidence.length})
        </span>
      </button>
      {open ? (
        <div className="flex flex-col gap-1.5">
          {evidence.map((ev) => (
            <div
              key={ev.id}
              onClick={() => { onPick(ev.id === pickedId ? null : ev.id); }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onPick(ev.id === pickedId ? null : ev.id);
                }
              }}
              style={{
                outline: ev.id === pickedId
                  ? '2px solid var(--intent-success-vivid)'
                  : 'none',
                outlineOffset: ev.id === pickedId ? '-2px' : 0,
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              <EvidenceCard
                evidence={ev}
                expanded={ev.id === pickedId}
                onToggle={() => { onPick(ev.id === pickedId ? null : ev.id); }}
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
