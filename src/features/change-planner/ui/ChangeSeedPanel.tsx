// ChangeSeedPanel — picker for the change seed.
//
// Renders the available seeds grouped by kind (file, symbol, route, api,
// config_key) so the user immediately sees what kind of change they're about
// to model. No left-edge stripes per the team-wide convention; the active
// seed is shown via background tone + bold label.

import { FileCode2, Hash, Route, Plug, Flag } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ChangeSeed, SeedKind } from '../model/types';

type Props = {
  seeds: ChangeSeed[];
  selectedId?: string;
  onSelect: (id: string) => void;
}

const KIND_LABEL: Record<SeedKind, string> = {
  file: 'Files',
  symbol: 'Symbols',
  route: 'Routes',
  api: 'APIs',
  config_key: 'Config keys',
};

// Canonical display order. Files first because they're the most common
// seed kind, config last because it's the rarest.
const KIND_ORDER: SeedKind[] = ['file', 'symbol', 'api', 'route', 'config_key'];

const KIND_ICON_MAP: Record<SeedKind, LucideIcon> = {
  file: FileCode2,
  symbol: Hash,
  route: Route,
  api: Plug,
  config_key: Flag,
};

function KindIcon({ kind }: { kind: SeedKind }) {
  const Icon = KIND_ICON_MAP[kind];
  return <Icon className="w-2.5 h-2.5" />;
}

export function ChangeSeedPanel({ seeds, selectedId, onSelect }: Props) {
  const grouped = new Map<SeedKind, ChangeSeed[]>();
  for (const s of seeds) {
    const existing = grouped.get(s.kind) ?? [];
    existing.push(s);
    grouped.set(s.kind, existing);
  }

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        background: 'var(--bg-surface-muted)',
        borderColor: 'var(--border-default)',
      }}
    >
      <div
        className="px-3 py-2.5 text-[9px] font-black uppercase tracking-[0.18em]"
        style={{ color: 'var(--fg-subtle)' }}
      >
        Change seeds
      </div>

      <div className="px-2 pb-2 space-y-2">
        {KIND_ORDER.map((kind) => {
          const list = grouped.get(kind);
          if (!list || list.length === 0) return null;
          return (
            <div key={kind} className="space-y-1">
              <div
                className="flex items-center gap-1 px-1 text-[8.5px] font-black uppercase tracking-[0.16em]"
                style={{ color: 'var(--fg-subtle)' }}
              >
                <KindIcon kind={kind} />
                <span>{KIND_LABEL[kind]}</span>
              </div>
              <ul className="space-y-0.5">
                {list.map((seed) => {
                  const isActive = seed.id === selectedId;
                  return (
                    <li key={seed.id}>
                      <button
                        type="button"
                        onClick={() => { onSelect(seed.id); }}
                        aria-pressed={isActive}
                        className="w-full text-left px-2 py-1.5 rounded-md text-[10px] transition-colors hover-surface"
                        style={{
                          background: isActive
                            ? 'var(--bg-elevated)'
                            : 'transparent',
                          color: isActive
                            ? 'var(--fg-default)'
                            : 'var(--fg-muted)',
                          fontWeight: isActive ? 700 : 500,
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate">{seed.label}</span>
                          <span
                            className="text-[8.5px] font-mono opacity-70 shrink-0"
                            style={{ color: 'var(--fg-subtle)' }}
                          >
                            {seed.targetId}
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
