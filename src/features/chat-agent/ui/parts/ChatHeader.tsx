import { X, Plus } from 'lucide-react';
import type { Session, TFn } from './types';

// Header — p0 brand on the left, tab strip inline, close on the right
export function ChatHeader({
  sessions,
  activeId,
  onSelect,
  onAddSession,
  onCloseSession,
  onClose,
  t,
}: {
  sessions: Session[];
  activeId: number;
  onSelect: (id: number) => void;
  onAddSession: () => void;
  onCloseSession: (id: number) => void;
  onClose: () => void;
  t: TFn;
}) {
  return (
    <header
      className="shrink-0 flex items-stretch border-b"
      style={{ height: 32, borderColor: 'var(--border-default)' }}
    >
      <div className="shrink-0 flex items-center pl-3 pr-3">
        <span
          className="font-mono font-black tracking-tight text-[12px] leading-none"
          style={{ color: 'var(--fg-strong)' }}
        >
          p0
        </span>
      </div>

      {/* Inline tab strip */}
      <div className="flex-1 min-w-0 overflow-x-auto scrollbar-hide">
        <div className="flex items-stretch min-w-max h-full">
          {sessions.map((s) => {
            const a = s.id === activeId;
            return (
              <div
                key={s.id}
                role="tab"
                aria-selected={a}
                tabIndex={0}
                className="group relative flex items-center gap-1.5 px-2.5 text-[11px] font-bold cursor-pointer transition-colors whitespace-nowrap"
                style={{ color: a ? 'var(--fg-strong)' : 'var(--fg-subtle)' }}
                onClick={() => { onSelect(s.id); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(s.id);
                  }
                }}
              >
                <span className="max-w-[160px] truncate">{s.title}</span>
                {s.pending && (
                  <span
                    className="w-1 h-1 rounded-full animate-pulse shrink-0"
                    style={{ background: 'var(--intent-success-vivid)' }}
                  />
                )}
                <button type="button"
                  onClick={(e) => { e.stopPropagation(); onCloseSession(s.id); }}
                  className="ml-0.5 p-0.5 rounded-md transition-colors hover-surface"
                  style={{ color: 'var(--fg-subtle)', opacity: 0.7 }}
                  title={t('tabs.closeTitle')}
                  aria-label={t('tabs.closeAria')}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
                {a && (
                  <span
                    className="absolute left-2 right-2 bottom-0 h-[2px]"
                    style={{ background: 'var(--intent-success-vivid)' }}
                  />
                )}
              </div>
            );
          })}
          <button type="button"
            onClick={onAddSession}
            title={t('tabs.newTitle')}
            aria-label={t('tabs.newAria')}
            className="shrink-0 px-2.5 flex items-center justify-center transition-colors hover-surface"
            style={{ color: 'var(--fg-subtle)' }}
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="shrink-0 flex items-center pr-1.5">
        <button type="button"
          onClick={onClose}
          aria-label={t('agent.closeAria')}
          className="p-1 rounded-md transition-colors hover-surface"
          style={{ color: 'var(--fg-subtle)' }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
}
