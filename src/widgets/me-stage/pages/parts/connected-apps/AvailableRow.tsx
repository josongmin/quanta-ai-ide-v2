import { Plus } from 'lucide-react';
import { Button } from '@shared/ui/forms';
import type { AVAILABLE_INTEGRATIONS } from './types';

// ─────────────────────────────────────────────────────────────────────────
// Available integrations

export function AvailableRow({ item }: { item: typeof AVAILABLE_INTEGRATIONS[number] }) {
  const Icon = item.icon;
  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors"
      style={{
        background: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-muted)',
      }}
    >
      <span
        className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
        style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-muted)' }}
      >
        <Icon className="w-3.5 h-3.5" />
      </span>
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>
          {item.name}
        </span>
        <span className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
          {item.blurb}
        </span>
      </div>
      <Button leading={<Plus className="w-3 h-3" />}>
        Connect
      </Button>
    </div>
  );
}
