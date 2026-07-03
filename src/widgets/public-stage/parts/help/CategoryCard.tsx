import { FileText, Clock } from 'lucide-react';
import { LiftCard } from '@shared/ui/marketing';
import { ARTICLES } from './data';
import type { Category } from './types';

export function CategoryCard({ category }: { category: Category }) {
  const Icon = category.icon;
  const popular = ARTICLES.filter((a) => a.category === category.id).slice(0, 3);
  return (
    <LiftCard className="p-5 gap-4">
      <div className="flex items-start gap-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: `linear-gradient(135deg, ${category.from}, ${category.to})`,
            boxShadow: `0 6px 18px -8px ${category.from}`,
          }}
        >
          <Icon className="w-5 h-5" style={{ color: 'var(--bg-canvas)' }} />
        </div>
        <div className="flex flex-col flex-1 min-w-0 gap-0.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-lg font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
              {category.title}
            </span>
            <span className="text-xs tabular-nums" style={{ color: 'var(--fg-subtle)' }}>
              {category.count} articles
            </span>
          </div>
          <span className="text-base leading-snug" style={{ color: 'var(--fg-muted)' }}>
            {category.description}
          </span>
        </div>
      </div>
      <ul className="flex flex-col mt-1 -mx-1">
        {popular.map((a) => (
          <li key={a.id}>
            <button
              type="button"
              className="w-full text-left flex items-center justify-between gap-2 px-2 py-1.5 rounded-md transition-colors text-base bg-transparent border-0 cursor-pointer"
              style={{ color: 'var(--fg-default)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <span className="flex items-center gap-2 min-w-0">
                <FileText className="w-3 h-3 shrink-0" style={{ color: 'var(--fg-subtle)' }} />
                <span className="truncate">{a.title}</span>
              </span>
              <span className="flex items-center gap-0.5 text-xs tabular-nums shrink-0" style={{ color: 'var(--fg-subtle)' }}>
                <Clock className="w-2.5 h-2.5" /> {a.readMin}m
              </span>
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="inline-flex items-center gap-1 text-sm font-semibold mt-2 bg-transparent border-0 p-0 cursor-pointer"
        style={{ color: 'var(--fg-link)', font: 'inherit' }}
      >
        See all {category.count} →
      </button>
    </LiftCard>
  );
}
