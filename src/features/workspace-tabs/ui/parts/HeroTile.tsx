import { FolderClosed } from 'lucide-react';
import type { TabKind } from '@shared/config/workspaceTabs';
import type { useWorkspaceTabsRegistry } from '../../model/RegistryContext';
import { HERO_COPY } from './addTabData';

export function HeroTile({
  kind,
  onPick,
  tabRegistry,
}: {
  kind: TabKind;
  onPick: (k: TabKind) => void;
  tabRegistry: ReturnType<typeof useWorkspaceTabsRegistry>;
}) {
  const def = tabRegistry[kind];
  const copy = HERO_COPY[kind] ?? { title: def.label, sub: def.description };
  return (
    <button
      type="button"
      onClick={() => { onPick(kind); }}
      className="text-left rounded-lg p-3 transition-colors hover:[background:var(--bg-hover)]"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
      }}
    >
      <div
        className="w-7 h-7 rounded-md inline-flex items-center justify-center mb-2.5"
        style={{
          background: 'var(--bg-surface-muted)',
          border: '1px solid var(--border-muted)',
          color: 'var(--fg-default)',
        }}
      >
        <FolderClosed className="w-3.5 h-3.5" />
      </div>
      <div
        className="text-[12px] font-semibold mb-0.5"
        style={{ color: 'var(--fg-default)' }}
      >
        {copy.title}
      </div>
      <div
        className="text-[10px] leading-[1.4]"
        style={{ color: 'var(--fg-muted)' }}
      >
        {copy.sub}
      </div>
    </button>
  );
}
