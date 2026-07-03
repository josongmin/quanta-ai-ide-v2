import { Rss } from 'lucide-react';
import { SeamDivider } from '@shared/ui/marketing';
import { ENTRIES } from './data';

export function TocAside() {
  return (
    <aside className="min-w-0">
      <div className="sticky top-20 flex flex-col gap-2">
        <span className="text-xs uppercase tracking-eyebrow font-semibold mb-1" style={{ color: 'var(--fg-subtle)' }}>
          Recent releases
        </span>
        <ol className="flex flex-col gap-1.5 text-base">
          {ENTRIES.slice(0, 8).map((e) => (
            <li key={e.id}>
              <a
                href={`#${e.id}`}
                className="flex items-center gap-2 py-1 hover:underline"
                style={{ color: 'var(--fg-muted)' }}
              >
                <span className="font-mono tabular-nums shrink-0" style={{ color: 'var(--fg-subtle)', minWidth: 70 }}>{e.date.slice(5)}</span>
                <span className="truncate">{e.title}</span>
              </a>
            </li>
          ))}
        </ol>
        <SeamDivider />
        <a
          href="/changelog.rss"
          className="inline-flex items-center gap-1.5 mt-2 text-base"
          style={{ color: 'var(--fg-link)' }}
        >
          <Rss className="w-3 h-3" /> RSS feed
        </a>
      </div>
    </aside>
  );
}
