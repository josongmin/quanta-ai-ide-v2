import { useState } from 'react';
import { QUICKSTART } from './data';

export function Quickstart() {
  const [tab, setTab] = useState(0);
  const current = QUICKSTART[tab];
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-default)',
      }}
    >
      <div
        className="flex items-center border-b"
        style={{ borderColor: 'var(--border-muted)' }}
      >
        {QUICKSTART.map((q, i) => {
          const active = i === tab;
          return (
            <button
              key={q.lang}
              type="button"
              onClick={() => { setTab(i); }}
              className="h-9 px-4 text-sm font-medium transition-colors"
              style={{
                color: active ? 'var(--fg-strong)' : 'var(--fg-subtle)',
                background: active ? 'var(--bg-surface-muted)' : 'transparent',
                borderRight: '1px solid var(--border-muted)',
                position: 'relative',
              }}
            >
              {q.lang}
              {active && (
                <span
                  aria-hidden
                  className="absolute left-0 right-0 -bottom-px h-px"
                  style={{ background: 'var(--fg-accent)' }}
                />
              )}
            </button>
          );
        })}
        <div className="ml-auto pr-3">
          <button
            type="button"
            onClick={() => {
              if (typeof navigator !== 'undefined' && navigator.clipboard) {
                void navigator.clipboard.writeText(current.code);
              }
            }}
            className="h-7 px-2.5 rounded text-xs uppercase tracking-eyebrow font-semibold transition-colors"
            style={{
              color: 'var(--fg-muted)',
              background: 'transparent',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            Copy
          </button>
        </div>
      </div>
      <pre
        className="text-base leading-relaxed p-5 m-0 overflow-x-auto font-mono"
        style={{
          color: 'var(--fg-strong)',
          background: 'var(--bg-surface-muted)',
        }}
      >
        {current.code}
      </pre>
    </div>
  );
}
