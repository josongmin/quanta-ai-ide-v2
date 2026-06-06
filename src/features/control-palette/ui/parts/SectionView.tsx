import type { Command } from '../../model/types';
import type { Skin } from '../../lib/paletteSkin';
import { CommandRow } from './CommandRow';

export function SectionView({
  title, items, cursor, flatBaseIndex, onHover, onRun, skin,
}: {
  title: string;
  items: Command[];
  cursor: number;
  flatBaseIndex: number;
  onHover: (index: number) => void;
  onRun: (cmd: Command) => void;
  skin: Skin;
}) {
  return (
    <div className="mb-1.5 last:mb-0">
      <div
        className="px-3.5 pt-2 pb-1 text-[9px] font-black uppercase tracking-[0.18em]"
        style={{ color: skin.sectionLabel }}
      >
        {title}
      </div>
      {items.map((cmd, i) => {
        const flatIndex = flatBaseIndex + i;
        const active = flatIndex === cursor;
        return (
          <CommandRow
            key={cmd.id}
            cmd={cmd}
            active={active}
            flatIndex={flatIndex}
            onHover={() => { onHover(flatIndex); }}
            onRun={() => { onRun(cmd); }}
            skin={skin}
          />
        );
      })}
    </div>
  );
}
