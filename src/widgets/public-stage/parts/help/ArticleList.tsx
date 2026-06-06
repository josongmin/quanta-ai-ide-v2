import { BookOpen } from 'lucide-react';
import { formatNumber } from '@shared/i18n';
import { CATEGORIES } from './data';
import type { Article } from './types';

export function ArticleList({
  eyebrow, articles, showCategory,
}: { eyebrow: React.ReactNode; articles: Article[]; showCategory?: boolean }) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}
    >
      <div
        className="flex items-center gap-1.5 px-4 h-10 text-[10px] uppercase tracking-[0.18em] font-semibold"
        style={{
          background: 'var(--bg-canvas)',
          color: 'var(--fg-subtle)',
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        {eyebrow}
      </div>
      <ol>
        {articles.map((a, i) => {
          // Every CategoryId has a CATEGORIES entry; fallback satisfies the type.
          const cat = CATEGORIES.find((c) => c.id === a.category) ?? CATEGORIES[0];
          return (
            <li key={a.id}>
              <button
                type="button"
                className="w-full text-left flex items-center gap-3 px-4 py-3 transition-colors bg-transparent border-0 cursor-pointer"
                style={{
                  borderTop: i === 0 ? 'none' : '1px solid var(--border-muted)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <span
                  className="font-mono text-[10px] tabular-nums shrink-0 w-6"
                  style={{ color: 'var(--fg-subtle)' }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <BookOpen className="w-3 h-3 shrink-0" style={{ color: 'var(--fg-subtle)' }} />
                <span className="text-[12px] flex-1 min-w-0 truncate" style={{ color: 'var(--fg-strong)' }}>
                  {a.title}
                </span>
                {showCategory && (
                  <span className="text-[10px] uppercase tracking-[0.14em] font-semibold shrink-0" style={{ color: 'var(--fg-subtle)' }}>
                    {cat.title}
                  </span>
                )}
                <span className="text-[10px] tabular-nums shrink-0" style={{ color: 'var(--fg-subtle)' }}>
                  {formatNumber(a.views)} views
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
