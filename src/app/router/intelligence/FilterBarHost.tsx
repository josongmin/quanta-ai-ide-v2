import { ResizeHandle } from '@shared/ui';
import { FilterBar } from '@features/filter-files';
// Deep-import: the inspect-target barrel re-exports FocusScanStack (which
// in turn drags Treemap/CycleGraph/FolderBody/etc.), so going through it
// here pulls that whole viz tree into the initial chunk.
import { useStack } from '@features/inspect-target';
import { LEFT_PANEL } from '@shared/lib/panelLayout';

type Props = {
  width: number;
  onWidthChange: (next: number) => void;
};

export default function FilterBarHost({ width, onWidthChange }: Props) {
  const { open, activeKey } = useStack();

  return (
    <div className="relative h-full" style={{ width }}>
      <FilterBar
        onOpenFolder={(path) => { open({ kind: 'folder', path }); }}
        onOpenFile={(id) => { open({ kind: 'file', id }); }}
        activeKey={activeKey}
      />
      <ResizeHandle
        side="right"
        width={width}
        min={LEFT_PANEL.min}
        max={LEFT_PANEL.max}
        defaultWidth={LEFT_PANEL.defaultWidth}
        onChange={onWidthChange}
        ariaLabel="Resize left panel"
      />
    </div>
  );
}
