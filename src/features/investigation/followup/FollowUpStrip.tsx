import type { CSSProperties } from 'react';
import type { FollowUp } from './buildFollowUps';

type Props = {
  followups: FollowUp[];
  onPick: (f: FollowUp) => void;
};

export function FollowUpStrip({ followups, onPick }: Props) {
  if (followups.length === 0) return null;

  const chipStyle: CSSProperties = {
    background: 'var(--bg-surface)',
    borderColor: 'var(--border-default)',
    color: 'var(--fg-default)',
    maxWidth: 240,
    cursor: 'pointer',
  };

  return (
    <div className="flex flex-col gap-1">
      <div
        className="font-mono uppercase tracking-wider"
        style={{ color: 'var(--fg-subtle)', fontSize: '10px' }}
      >
        Follow up
      </div>
      <div className="flex flex-wrap gap-2">
        {followups.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => { onPick(f); }}
            style={chipStyle}
            className="border rounded-md px-2 py-1 flex flex-col items-start gap-0.5 text-left"
            title={f.question}
          >
            <span
              className="truncate"
              style={{ fontSize: '11px', maxWidth: 220 }}
            >
              {f.question}
            </span>
            <span
              className="font-mono"
              style={{ color: 'var(--fg-subtle)', fontSize: '10px' }}
            >
              from {f.reason}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
