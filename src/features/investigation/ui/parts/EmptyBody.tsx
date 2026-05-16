import { Sparkles } from 'lucide-react';
import { FIXTURE_TARGETS, type InvestigationTarget } from '@entities/investigation';
import { FixtureRow } from './FixtureRow';

const KIND_GROUP_LABEL: Record<InvestigationTarget['kind'], string> = {
  file: 'Files',
  symbol: 'Symbols',
  incident: 'Incidents',
};

const KIND_ORDER: InvestigationTarget['kind'][] = ['file', 'symbol', 'incident'];

export function EmptyBody({ onPick }: { onPick: (target: InvestigationTarget) => void }) {
  const grouped = KIND_ORDER
    .map((kind) => ({
      kind,
      items: FIXTURE_TARGETS.filter((t) => t.kind === kind),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="flex flex-col items-stretch text-left gap-3 py-2">
      <div className="flex flex-col items-center text-center gap-2 py-4">
        <Sparkles
          className="w-7 h-7"
          style={{ color: 'var(--intent-success-vivid)' }}
        />
        <div>
          <div
            className="text-[12px] font-bold"
            style={{ color: 'var(--fg-default)' }}
          >
            No investigation in progress
          </div>
          <div
            className="text-[10px] mt-1"
            style={{ color: 'var(--fg-subtle)' }}
          >
            Pick a demo target — files, symbols, or incidents.
          </div>
        </div>
      </div>
      {grouped.map(({ kind, items }) => (
        <div key={kind}>
          <div
            className="text-[9px] font-black uppercase tracking-[0.18em] mb-1 px-0.5 flex items-center justify-between"
            style={{ color: 'var(--fg-muted)' }}
          >
            <span>{KIND_GROUP_LABEL[kind]}</span>
            <span style={{ color: 'var(--fg-subtle)' }}>{items.length.toString()}</span>
          </div>
          <div className="flex flex-col">
            {items.map((t) => (
              <FixtureRow key={t.id} target={t} onClick={() => { onPick(t); }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
