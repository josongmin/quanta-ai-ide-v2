import { FileText, ArrowUpRight, Download } from 'lucide-react';
import { HoverCard } from './HoverCard';
import { DOCS } from './data';

export function DocumentsList() {
  return (
    <div
      className="rounded-xl overflow-hidden mb-16"
      style={{
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-default)',
      }}
    >
      {DOCS.map((d, i) => (
        <HoverCard
          key={d.id}
          className="flex items-center gap-4 p-4 transition-colors"
          style={{
            borderBottom: i === DOCS.length - 1 ? 'none' : '1px solid var(--border-muted)',
          }}
          hover={{ background: 'var(--bg-hover)' }}
          rest={{ background: 'transparent' }}
        >
          <div
            className="w-9 h-9 rounded-md flex items-center justify-center shrink-0"
            style={{
              background: 'var(--bg-surface-muted)',
              color: 'var(--fg-muted)',
            }}
          >
            <FileText className="w-4 h-4" />
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-base font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
              {d.title}
            </span>
            <span className="text-sm" style={{ color: 'var(--fg-subtle)' }}>{d.sub}</span>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1 h-8 px-3 rounded-md text-sm font-semibold transition-colors"
            style={{
              background: 'var(--bg-surface-muted)',
              border: '1px solid var(--border-default)',
              color: 'var(--fg-default)',
            }}
          >
            {d.sub.includes('NDA') ? 'Request access' : 'Download'}
            {d.sub.includes('NDA')
              ? <ArrowUpRight className="w-3 h-3" />
              : <Download className="w-3 h-3" />}
          </button>
        </HoverCard>
      ))}
    </div>
  );
}
