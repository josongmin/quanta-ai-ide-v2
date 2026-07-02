import type { Msg } from './types';

export function Message({ msg }: { msg: Msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className="max-w-[85%] px-3 py-2 rounded-xl text-[12px] leading-relaxed"
        style={
          isUser
            ? {
                background: 'var(--bg-elevated)',
                color: 'var(--fg-strong)',
              }
            : {
                background: 'var(--bg-surface-muted)',
                color: 'var(--fg-muted)',
                border: '1px solid var(--border-muted)',
              }
        }
      >
        {!isUser && (
          <div
            className="mb-1 font-mono font-black tracking-tight text-[11px] leading-none"
            style={{ color: 'var(--fg-muted)' }}
          >
            p0
          </div>
        )}
        <div className="whitespace-pre-wrap">{msg.text}</div>
      </div>
    </div>
  );
}

export function PendingDots() {
  return (
    <div className="flex justify-start">
      <div
        className="px-3 py-2 rounded-xl border"
        style={{
          background: 'var(--bg-surface-muted)',
          borderColor: 'var(--border-muted)',
        }}
      >
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1 h-1 rounded-full animate-pulse"
              style={{ background: 'var(--fg-subtle)', animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
