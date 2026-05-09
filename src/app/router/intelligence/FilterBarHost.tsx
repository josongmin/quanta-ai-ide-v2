import { ResizeHandle } from '@shared/ui';
import { FilterBar } from '@features/filter-files';
import { useStack } from '@features/inspect-target';
import { LEFT_PANEL } from './panelLayout';

type Props = {
  width: number;
  onWidthChange: (next: number) => void;
  isDark: boolean;
};

export default function FilterBarHost({ width, onWidthChange, isDark }: Props) {
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
        isDark={isDark}
        ariaLabel="Resize left panel"
      />
    </div>
  );
}
