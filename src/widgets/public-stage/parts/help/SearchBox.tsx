import { Search } from 'lucide-react';
import { CATEGORIES } from './data';
import type { Article } from './types';

export function SearchBox({
  q, onChange, matches,
}: { q: string; onChange: (v: string) => void; matches: Article[] }) {
  return (
    <>
      {/* Search box */}
      <div className="relative w-[560px] max-w-full mt-3">
        <div
          className="flex items-center h-12 rounded-xl"
          style={{
            background: 'var(--bg-canvas)',
            border: '1px solid var(--border-default)',
            boxShadow: '0 8px 24px -10px color-mix(in srgb, var(--fg-strong) 18%, transparent)',
          }}
        >
          <Search className="w-4 h-4 mx-4 shrink-0" style={{ color: 'var(--fg-subtle)' }} />
          <input
            value={q}
            onChange={(e) => { onChange(e.target.value); }}
            placeholder="Try “admission rule”, “SSO loop”, “seat pricing”…"
            className="flex-1 bg-transparent outline-none text-lg"
            style={{ color: 'var(--fg-strong)' }}
          />
          <span
            className="hidden sm:inline-flex items-center gap-1 mr-3 text-xs font-mono px-2 py-1 rounded"
            style={{
              background: 'var(--bg-surface-muted)',
              color: 'var(--fg-subtle)',
              border: '1px solid var(--border-muted)',
            }}
          >
            ⌘ K
          </span>
        </div>

        {/* Live results popover */}
        {q.trim() && (
          <div
            className="absolute left-0 right-0 mt-2 rounded-xl overflow-hidden text-left"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            {matches.length === 0 ? (
              <div className="px-4 py-6 text-base text-center" style={{ color: 'var(--fg-subtle)' }}>
                No matches for “{q}”. Try a broader term, or contact support.
              </div>
            ) : matches.map((a, i) => {
              // Every CategoryId has a CATEGORIES entry; fallback satisfies the type.
              const cat = CATEGORIES.find((c) => c.id === a.category) ?? CATEGORIES[0];
              const Icon = cat.icon;
              return (
                <button
                  type="button"
                  key={a.id}
                  className="w-full text-left flex items-center gap-3 px-4 h-12 transition-colors bg-transparent border-0 cursor-pointer"
                  style={{
                    borderTop: i === 0 ? 'none' : '1px solid var(--border-muted)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <Icon className="w-4 h-4 shrink-0" style={{ color: 'var(--fg-muted)' }} />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-base font-medium truncate" style={{ color: 'var(--fg-strong)' }}>{a.title}</span>
                    <span className="text-xs uppercase tracking-eyebrow font-semibold" style={{ color: 'var(--fg-subtle)' }}>
                      {cat.title}
                    </span>
                  </div>
                  <span className="text-sm shrink-0" style={{ color: 'var(--fg-subtle)' }}>
                    {a.readMin} min
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick links under search */}
      <div className="flex items-center gap-2 mt-2 flex-wrap justify-center text-base" style={{ color: 'var(--fg-muted)' }}>
        <span style={{ color: 'var(--fg-subtle)' }}>Popular:</span>
        {['Connect a repo', 'Admission rules', 'Why agent failed', 'Rotate secrets', 'Tax ID'].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => { onChange(t); }}
            className="px-2 py-0.5 rounded-md transition-colors"
            style={{ color: 'var(--fg-link)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            {t}
          </button>
        ))}
      </div>
    </>
  );
}
