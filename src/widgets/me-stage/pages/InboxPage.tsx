import { useMemo, useState } from 'react';
import { Archive, Check, X } from 'lucide-react';
import { MeShell } from '../parts/MeShell';
import { Section, Button } from '@shared/ui/forms';
import { INITIAL, bucketOf, type Item, type Filter } from './parts/inbox/types';
import { FilterBar } from './parts/inbox/FilterBar';
import { SearchBar } from './parts/inbox/SearchBar';
import { ListItem } from './parts/inbox/ListItem';
import { Detail } from './parts/inbox/Detail';
import { EmptyHint, DetailEmpty } from './parts/inbox/EmptyStates';

export default function InboxPage() {
  const [items, setItems] = useState<Item[]>(INITIAL);
  const [filter, setFilter] = useState<Filter>('unread');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<string | null>('i1');
  const [bulkSel, setBulkSel] = useState<Set<string>>(new Set());

  const counts = useMemo(() => ({
    all:       items.filter((i) => i.status !== 'archived').length,
    unread:    items.filter((i) => i.status === 'unread').length,
    mentions:  items.filter((i) => i.type === 'mention' && i.status !== 'archived').length,
    reviews:   items.filter((i) => i.type === 'review' && i.status !== 'archived').length,
    starred:   items.filter((i) => i.starred && i.status !== 'archived').length,
    archived:  items.filter((i) => i.status === 'archived').length,
  }), [items]);

  const filtered = useMemo(() => {
    let out = items;
    if (filter === 'unread')   out = out.filter((i) => i.status === 'unread');
    if (filter === 'mentions') out = out.filter((i) => i.type === 'mention' && i.status !== 'archived');
    if (filter === 'reviews')  out = out.filter((i) => i.type === 'review' && i.status !== 'archived');
    if (filter === 'starred')  out = out.filter((i) => i.starred && i.status !== 'archived');
    if (filter === 'archived') out = out.filter((i) => i.status === 'archived');
    if (filter === 'all')      out = out.filter((i) => i.status !== 'archived');
    if (q.trim()) {
      const needle = q.toLowerCase();
      out = out.filter((i) =>
        i.title.toLowerCase().includes(needle)
        || i.preview.toLowerCase().includes(needle)
        || i.who.toLowerCase().includes(needle));
    }
    return out;
  }, [items, filter, q]);

  const groups = useMemo(() => {
    const m = new Map<string, Item[]>();
    for (const i of filtered) {
      const g = bucketOf(i.at);
      let bucket = m.get(g);
      if (!bucket) { bucket = []; m.set(g, bucket); }
      bucket.push(i);
    }
    return Array.from(m.entries());
  }, [filtered]);

  const sel = items.find((i) => i.id === selected) ?? null;

  const archive  = (id: string) => { setItems((all) => all.map((i) => (i.id === id ? { ...i, status: 'archived' as const } : i))); };
  const markRead = (id: string) => { setItems((all) => all.map((i) => (i.id === id ? { ...i, status: 'read' as const } : i))); };
  const star     = (id: string) => { setItems((all) => all.map((i) => (i.id === id ? { ...i, starred: !i.starred } : i))); };
  const snooze   = (id: string) => { setItems((all) => all.map((i) => (i.id === id ? { ...i, status: 'snoozed' as const } : i))); };

  const toggleBulk = (id: string) => {
    setBulkSel((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const bulkArchive = () => {
    setItems((all) => all.map((i) => (bulkSel.has(i.id) ? { ...i, status: 'archived' as const } : i)));
    setBulkSel(new Set());
  };
  const bulkMarkRead = () => {
    setItems((all) => all.map((i) => (bulkSel.has(i.id) ? { ...i, status: 'read' as const } : i)));
    setBulkSel(new Set());
  };

  return (
    <MeShell
      title="Inbox"
      subtitle="Mentions, review requests, gate failures, and agent updates — all in one stream."
      topRight={
        <div className="flex items-center gap-1.5">
          {bulkSel.size > 0 ? (
            <>
              <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                {bulkSel.size} selected
              </span>
              <Button leading={<Check className="w-3 h-3" />} onClick={bulkMarkRead}>Mark read</Button>
              <Button leading={<Archive className="w-3 h-3" />} onClick={bulkArchive}>Archive</Button>
              <Button variant="ghost" onClick={() => { setBulkSel(new Set()); }}>
                <X className="w-3 h-3" />
              </Button>
            </>
          ) : (
            <Button onClick={() => { setItems((all) => all.map((i) => ({ ...i, status: i.status === 'unread' ? 'read' : i.status }))); }}>
              Mark all as read
            </Button>
          )}
        </div>
      }
    >
      <Section title="" hint="">
        <div
          className="grid gap-0 rounded-md overflow-hidden"
          style={{
            gridTemplateColumns: '320px 1fr',
            border: '1px solid var(--border-muted)',
            minHeight: 520,
          }}
        >
          {/* Left column: filters + list */}
          <div className="flex flex-col" style={{ borderRight: '1px solid var(--border-muted)' }}>
            <FilterBar filter={filter} onChange={setFilter} counts={counts} />
            <SearchBar q={q} onChange={setQ} />

            <div className="flex-1 overflow-y-auto">
              {groups.length === 0 && <EmptyHint q={q} filter={filter} />}
              {groups.map(([group, list]) => (
                <div key={group}>
                  <div
                    className="px-3 py-1.5 text-2xs uppercase tracking-eyebrow font-semibold"
                    style={{
                      background: 'var(--bg-surface-muted)',
                      color: 'var(--fg-subtle)',
                      borderTop: '1px solid var(--border-muted)',
                      borderBottom: '1px solid var(--border-muted)',
                    }}
                  >
                    {group}
                  </div>
                  {list.map((it) => (
                    <ListItem
                      key={it.id}
                      item={it}
                      active={selected === it.id}
                      bulkOn={bulkSel.has(it.id)}
                      onSelect={() => { setSelected(it.id); markRead(it.id); }}
                      onToggleBulk={() => { toggleBulk(it.id); }}
                      onStar={() => { star(it.id); }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Right column: detail */}
          <div className="flex flex-col min-w-0">
            {sel ? (
              <Detail
                item={sel}
                onArchive={() => { archive(sel.id); setSelected(null); }}
                onSnooze={() => { snooze(sel.id); setSelected(null); }}
              />
            ) : (
              <DetailEmpty />
            )}
          </div>
        </div>
      </Section>
    </MeShell>
  );
}
