import { useMemo } from 'react';
import { EmptyHint } from '@shared/ui';
import type {
  OwnershipLayer as OwnershipLayerKind,
  OwnershipScore,
  Person,
  PersonId,
} from '@entities/ownership';
import { PersonAvatar } from './primitives';

const LAYER_ORDER: OwnershipLayerKind[] = [
  'declared',
  'historical',
  'expertise',
  'impact',
];

export function OwnershipLayer({
  scores,
  resolve,
}: {
  scores: OwnershipScore[];
  resolve: (id: PersonId) => Person | undefined;
}) {
  const grouped = useMemo(() => {
    const map = new Map<OwnershipLayerKind, OwnershipScore[]>();
    for (const s of scores) {
      const list = map.get(s.layer) ?? [];
      list.push(s);
      map.set(s.layer, list);
    }
    for (const [k, list] of map) {
      list.sort((a, b) => b.weight - a.weight);
      map.set(k, list);
    }
    return map;
  }, [scores]);
  const layers = LAYER_ORDER.filter((l) => grouped.has(l));

  if (layers.length === 0) {
    return <EmptyHint text="No ownership signals recorded." />;
  }

  return (
    <div className="space-y-2.5">
      {layers.map((layer) => {
        const items = grouped.get(layer) ?? [];
        return (
          <div key={layer}>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-2xs font-black uppercase tracking-eyebrow"
                style={{ color: 'var(--fg-muted)' }}
              >
                {layer}
              </span>
              <span
                className="flex-1 h-px"
                style={{ background: 'var(--border-muted)' }}
              />
              <span
                className="text-2xs font-mono tabular-nums"
                style={{ color: 'var(--fg-subtle)' }}
              >
                {items.length}
              </span>
            </div>
            <ul className="space-y-1">
              {items.map((item, idx) => {
                const person = resolve(item.personId);
                const pct = Math.round(item.weight * 100);
                return (
                  <li
                    key={`${item.personId}-${layer}-${idx}`}
                    className="flex items-center gap-2 min-w-0"
                  >
                    <PersonAvatar person={person} size={18} />
                    <span
                      className="text-sm font-semibold truncate shrink-0 max-w-[110px]"
                      style={{ color: 'var(--fg-default)' }}
                    >
                      {person?.name ?? 'Unknown'}
                    </span>
                    <span
                      className="text-xs font-mono tabular-nums shrink-0"
                      style={{ color: 'var(--fg-subtle)' }}
                    >
                      {pct}%
                    </span>
                    <span
                      className="text-xs truncate flex-1 min-w-0"
                      style={{ color: 'var(--fg-muted)' }}
                      title={item.reason}
                    >
                      {item.reason}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
