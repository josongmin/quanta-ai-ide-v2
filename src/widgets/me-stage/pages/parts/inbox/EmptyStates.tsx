import { Inbox } from 'lucide-react';
import type { Filter } from './types';

export function EmptyHint({ q, filter }: { q: string; filter: Filter }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 px-4 text-center">
      <Inbox className="w-6 h-6" style={{ color: 'var(--fg-subtle)' }} />
      <span className="text-base font-semibold" style={{ color: 'var(--fg-strong)' }}>
        {q ? `No matches for "${q}"` : `Your ${filter} list is clear`}
      </span>
      <span className="text-sm" style={{ color: 'var(--fg-subtle)' }}>
        {q ? 'Try a different keyword or change the filter.' : 'Nothing waiting on you. Take a break.'}
      </span>
    </div>
  );
}

export function DetailEmpty() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2 px-6 text-center">
      <Inbox className="w-7 h-7" style={{ color: 'var(--fg-subtle)' }} />
      <span className="text-base font-semibold" style={{ color: 'var(--fg-strong)' }}>
        Pick something to read
      </span>
      <span className="text-sm max-w-[280px]" style={{ color: 'var(--fg-muted)' }}>
        Click any item on the left to open it here. Use <kbd className="px-1 rounded font-mono text-xs" style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-muted)' }}>j</kbd> / <kbd className="px-1 rounded font-mono text-xs" style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-muted)' }}>k</kbd> to navigate.
      </span>
    </div>
  );
}
