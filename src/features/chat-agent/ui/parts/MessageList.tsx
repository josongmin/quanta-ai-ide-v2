import type { RefObject } from 'react';
import { Message, PendingDots } from './Message';
import type { Msg } from './types';

export function MessageList({
  msgs,
  pending,
  scrollRef,
  onScroll,
  hasNewBelow,
  pinnedToBottom,
  onJumpToLatest,
}: {
  msgs: Msg[];
  pending: boolean;
  scrollRef: RefObject<HTMLDivElement>;
  onScroll: () => void;
  hasNewBelow: boolean;
  pinnedToBottom: boolean;
  onJumpToLatest: () => void;
}) {
  return (
    <div className="relative flex-1 min-h-0">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="absolute inset-0 overflow-y-auto scrollbar-hide px-4 py-3"
      >
        <div className="space-y-3">
          {msgs.map((m) => (
            <Message key={m.id} msg={m} />
          ))}
          {pending && <PendingDots />}
        </div>
      </div>
      {hasNewBelow && !pinnedToBottom && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-2 z-10 pointer-events-auto">
          <button
            type="button"
            onClick={onJumpToLatest}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shadow-lg transition-colors coding-pill-rise"
            style={{
              background: 'var(--bg-elevated)',
              color: 'var(--fg-strong)',
              borderColor: 'var(--border-default)',
            }}
          >
            <span
              className="w-1 h-1 rounded-full coding-breath"
              style={{ background: 'var(--intent-success-vivid)' }}
            />
            ↓
          </button>
        </div>
      )}
    </div>
  );
}
