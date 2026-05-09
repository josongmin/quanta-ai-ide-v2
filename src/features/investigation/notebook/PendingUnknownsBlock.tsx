import { useMemo } from 'react';
import type { NotebookEntry, UnknownTag as UnknownTagType } from '@entities/investigation';
import { UnknownTag } from '../evidence';

type Props = {
  entry: NotebookEntry;
  onResolveUnknown: (label: string) => void;
};

export function PendingUnknownsBlock({ entry, onResolveUnknown }: Props) {
  const aggregated = useMemo<UnknownTagType[]>(() => {
    const seen = new Set<string>();
    const out: UnknownTagType[] = [];
    for (const q of entry.questions) {
      if (q.status !== 'answered' || !q.answer) continue;
      for (const u of q.answer.unknowns) {
        if (seen.has(u.label)) continue;
        seen.add(u.label);
        out.push(u);
      }
    }
    return out;
  }, [entry.questions]);

  if (aggregated.length === 0) {
    return (
      <div style={{ color: 'var(--fg-subtle)', fontSize: '11px' }}>
        No outstanding unknowns.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {aggregated.map((u) => (
        <button
          key={u.id}
          type="button"
          onClick={() => onResolveUnknown(u.label)}
          title={`Click to follow up: ${u.reason}`}
          className="appearance-none p-0 border-0 bg-transparent"
          style={{ cursor: 'pointer' }}
        >
          <UnknownTag tag={u} />
        </button>
      ))}
    </div>
  );
}

export default PendingUnknownsBlock;
