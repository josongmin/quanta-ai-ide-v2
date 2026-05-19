import { Filter, Inbox, ListFilter, User } from 'lucide-react';
import type { QueueScope } from '../LeftQueue';

// ─────────────────────────────────────────────────────────────────────────
// 3. ScopeStrip — 3-way (전체 / 내 작업 / 보관) with leading filter glyph.
// ─────────────────────────────────────────────────────────────────────────

export function ScopeStrip({
  scope, onChange,
}: { scope: QueueScope; onChange: (s: QueueScope) => void }) {
  const items: { key: QueueScope; label: string; icon: typeof Inbox }[] = [
    { key: 'all',      label: '전체',    icon: Inbox },
    { key: 'mine',     label: '내 작업', icon: User },
    { key: 'archived', label: '보관',    icon: Filter },
  ];
  return (
    <div className="shrink-0 px-3 pb-2 flex items-center gap-3">
      <ListFilter className="w-3.5 h-3.5 text-[var(--fg-subtle)] shrink-0" strokeWidth={2} />
      <div role="tablist" aria-label="필터" className="flex items-center gap-4">
        {items.map((it) => {
          const active = scope === it.key;
          return (
            <button
              key={it.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => { onChange(it.key); }}
              className={`relative pb-1.5 text-[var(--fs-md)] font-medium tracking-tight transition-colors ${
                active ? 'text-[var(--fg-strong)]' : 'text-[var(--fg-muted)] hover:text-[var(--fg-default)]'
              }`}
            >
              {it.label}
              {active && (
                <span
                  aria-hidden
                  className="absolute left-0 right-0 -bottom-px h-px bg-[var(--fg-strong)]"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
