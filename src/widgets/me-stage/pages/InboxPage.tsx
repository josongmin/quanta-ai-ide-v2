import { useMemo, useState } from 'react';
import {
  Inbox, AtSign, GitPullRequest, ShieldCheck, Wrench, Bot, Bell,
  Search, Archive, Clock, Check, ExternalLink, X, Star,
} from 'lucide-react';
import { MeShell } from '../parts/MeShell';
import { Section, Button } from '@shared/ui/forms';

type ItemType = 'mention' | 'review' | 'admission' | 'fix' | 'agent' | 'security';
type ItemStatus = 'unread' | 'read' | 'archived' | 'snoozed';

const ITEM_ICONS = {
  mention: AtSign,
  review: GitPullRequest,
  admission: ShieldCheck,
  fix: Wrench,
  agent: Bot,
  security: Bell,
} as const;

type Item = {
  id: string;
  type: ItemType;
  title: string;
  preview: string;
  who: string;
  where: string;
  at: string;
  status: ItemStatus;
  starred: boolean;
  href: string;
  meta?: { label: string; tone: 'success' | 'warn' | 'danger' | 'neutral' }[];
};

const INITIAL: Item[] = [
  { id: 'i1',  type: 'mention',  title: '@sora in #investigation/payment-flow',     preview: '"Sora can you take this from here? Last touch was on the M3 deploy."', who: 'Lee Junho', where: 'Investigate', at: '2m ago',  status: 'unread', starred: true,  href: '#' },
  { id: 'i2',  type: 'review',   title: 'Review requested · PR #4821',              preview: 'Add admission rule for SSO-only prod (4 files, +83 −12)',           who: 'Mei Wang',   where: 'Reviews',     at: '14m ago', status: 'unread', starred: false, href: '#', meta: [{ label: 'review · pending', tone: 'warn' }] },
  { id: 'i3',  type: 'admission',title: 'Admission failed · branch release/2026.05', preview: 'Required obligation "no-secret-in-diff" was not satisfied.',         who: 'system',     where: 'Admission',   at: '1h ago',  status: 'unread', starred: false, href: '#', meta: [{ label: 'gate fail', tone: 'danger' }, { label: '2 obligations', tone: 'neutral' }] },
  { id: 'i4',  type: 'fix',      title: 'Fix pipeline finished · INV-2025-0012',     preview: 'Verified fix applied. Rolled back 1 reviewer comment.',              who: 'fix-pipeline', where: 'Fixes',     at: '2h ago',  status: 'read',   starred: true,  href: '#', meta: [{ label: 'success', tone: 'success' }] },
  { id: 'i5',  type: 'agent',    title: 'Agent stopped · review-bot',                preview: 'Hit rate-limit (50 calls / 5 min). Retrying in 4 min.',              who: 'system',     where: 'Agents',      at: '3h ago',  status: 'read',   starred: false, href: '#', meta: [{ label: 'rate limit', tone: 'warn' }] },
  { id: 'i6',  type: 'review',   title: 'PR approved · #4818',                       preview: 'Brad Lee approved your refactor of TokensContext.',                  who: 'Brad Lee',   where: 'Reviews',     at: '5h ago',  status: 'read',   starred: false, href: '#', meta: [{ label: 'approved', tone: 'success' }] },
  { id: 'i7',  type: 'mention',  title: '@sora in #review/PR-4801',                  preview: 'Could you take a quick look at the security tab?',                   who: 'Hana Park',  where: 'Reviews',     at: '6h ago',  status: 'read',   starred: false, href: '#' },
  { id: 'i8',  type: 'security', title: 'New sign-in detected',                      preview: 'Chrome 125 on macOS, Seoul KR. If this wasn\'t you, change password.', who: 'system',   where: 'Security',    at: '8h ago',  status: 'read',   starred: false, href: '#', meta: [{ label: 'security', tone: 'neutral' }] },
  { id: 'i9',  type: 'admission',title: 'Admission passed · 7 PRs',                  preview: 'Bulk gate run on release/2026.05. All 7 passed.',                    who: 'system',     where: 'Admission',   at: '1d ago',  status: 'read',   starred: false, href: '#', meta: [{ label: 'gate pass', tone: 'success' }] },
  { id: 'i10', type: 'fix',      title: 'Fix obligations open · PR #4799',           preview: '3 of 5 proof obligations remain. Re-run after addressing.',          who: 'fix-pipeline', where: 'Fixes',     at: '1d ago',  status: 'read',   starred: false, href: '#', meta: [{ label: '3 obligations', tone: 'warn' }] },
  { id: 'i11', type: 'agent',    title: 'Agent completed · sora-fix-flake-test',     preview: 'Patched 2 flaky tests. PR #4823 opened on your behalf.',             who: 'fix-pipeline', where: 'Agents',    at: '1d ago',  status: 'read',   starred: false, href: '#', meta: [{ label: 'success', tone: 'success' }] },
  { id: 'i12', type: 'review',   title: 'Changes requested · PR #4790',              preview: 'Junho asked for a smaller diff before merging.',                     who: 'Lee Junho',  where: 'Reviews',     at: '2d ago',  status: 'archived', starred: false, href: '#', meta: [{ label: 'changes requested', tone: 'warn' }] },
  { id: 'i13', type: 'mention',  title: '@sora in /coding chat',                     preview: 'Can you ping me when the index finishes? Thanks!',                   who: 'Mei Wang',   where: 'Coding',      at: '3d ago',  status: 'archived', starred: false, href: '#' },
];

type Filter = 'all' | 'unread' | 'mentions' | 'reviews' | 'starred' | 'archived';

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
      (m.get(g) ?? m.set(g, []).get(g)!).push(i);
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
              <span className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>
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
                    className="px-3 py-1.5 text-[9px] uppercase tracking-[0.14em] font-semibold"
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

// ─────────────────────────────────────────────────────────────────────────
// Filters

function FilterBar({
  filter, onChange, counts,
}: {
  filter: Filter;
  onChange: (v: Filter) => void;
  counts: Record<Filter, number>;
}) {
  const tabs: { id: Filter; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'unread',   label: 'Unread',    icon: Bell },
    { id: 'mentions', label: 'Mentions',  icon: AtSign },
    { id: 'reviews',  label: 'Reviews',   icon: GitPullRequest },
    { id: 'starred',  label: 'Starred',   icon: Star },
    { id: 'all',      label: 'All',       icon: Inbox },
    { id: 'archived', label: 'Archived',  icon: Archive },
  ];
  return (
    <div className="flex flex-col gap-0.5 p-2"
      style={{ borderBottom: '1px solid var(--border-muted)' }}
    >
      {tabs.map(({ id, label, icon: Icon }) => {
        const active = filter === id;
        const count = counts[id];
        return (
          <button
            key={id}
            type="button"
            onClick={() => { onChange(id); }}
            className="flex items-center gap-2 px-2 h-7 rounded-md text-[12px] font-medium transition-colors"
            style={{
              background: active ? 'var(--bg-active)' : 'transparent',
              color: active ? 'var(--fg-strong)' : 'var(--fg-muted)',
            }}
            onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="flex-1 text-left">{label}</span>
            {count > 0 && (
              <span
                className="text-[10px] tabular-nums px-1.5 py-0.5 rounded font-mono"
                style={{
                  background: id === 'unread' && count > 0 ? 'var(--brand-bg)' : 'var(--bg-surface-muted)',
                  color: id === 'unread' && count > 0 ? 'var(--brand-fg)' : 'var(--fg-muted)',
                }}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function SearchBar({ q, onChange }: { q: string; onChange: (v: string) => void }) {
  return (
    <div
      className="flex items-center gap-2 h-9 px-3"
      style={{ borderBottom: '1px solid var(--border-muted)' }}
    >
      <Search className="w-3.5 h-3.5" style={{ color: 'var(--fg-subtle)' }} />
      <input
        value={q}
        onChange={(e) => { onChange(e.target.value); }}
        placeholder="Search inbox…"
        className="flex-1 bg-transparent outline-none text-[12px]"
        style={{ color: 'var(--fg-strong)' }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// List item

function ListItem({
  item, active, bulkOn, onSelect, onToggleBulk, onStar,
}: {
  item: Item;
  active: boolean;
  bulkOn: boolean;
  onSelect: () => void;
  onToggleBulk: () => void;
  onStar: () => void;
}) {
  const Icon = ITEM_ICONS[item.type];
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group w-full flex items-start gap-2 px-3 py-2.5 text-left transition-colors"
      style={{
        background: active ? 'var(--bg-active)' : 'transparent',
        borderTop: '1px solid var(--border-muted)',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg-hover)'; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      {/* Bulk select checkbox — hidden until row hover or selected */}
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => { e.stopPropagation(); onToggleBulk(); }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onToggleBulk(); } }}
        className="w-4 h-4 rounded shrink-0 mt-0.5 inline-flex items-center justify-center transition-all"
        style={{
          background: bulkOn ? 'var(--brand-vivid)' : 'transparent',
          border: `1.5px solid ${bulkOn ? 'var(--brand-vivid)' : 'var(--border-strong)'}`,
          opacity: bulkOn || active ? 1 : 0,
        }}
      >
        {bulkOn && <Check className="w-2.5 h-2.5" style={{ color: 'var(--bg-canvas)' }} />}
      </span>

      <Icon
        className="w-3.5 h-3.5 shrink-0 mt-0.5"
        style={{ color: tintFor(item.type) }}
      />

      <div className="flex flex-col flex-1 min-w-0 gap-0.5">
        <div className="flex items-center gap-1.5">
          {item.status === 'unread' && (
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: 'var(--brand-vivid)' }}
              aria-label="Unread"
            />
          )}
          <span
            className={`text-[11px] truncate ${item.status === 'unread' ? 'font-semibold' : ''}`}
            style={{ color: 'var(--fg-strong)' }}
          >
            {item.title}
          </span>
        </div>
        <span className="text-[10px] truncate" style={{ color: 'var(--fg-muted)' }}>
          {item.preview}
        </span>
        <div className="flex items-center gap-2 text-[10px] tabular-nums" style={{ color: 'var(--fg-subtle)' }}>
          <span>{item.who}</span>
          <span>·</span>
          <span>{item.where}</span>
          <span>·</span>
          <span>{item.at}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onStar(); }}
        className="p-1 rounded transition-colors shrink-0"
        style={{ color: item.starred ? 'var(--intent-warn-fg)' : 'var(--fg-subtle)' }}
        aria-label={item.starred ? 'Unstar' : 'Star'}
      >
        <Star className="w-3 h-3" fill={item.starred ? 'currentColor' : 'none'} />
      </button>
    </button>
  );
}

function tintFor(t: ItemType) {
  return t === 'mention' ? 'var(--brand-fg)'
    : t === 'review' ? 'var(--fg-link)'
    : t === 'admission' ? 'var(--intent-warn-fg)'
    : t === 'fix' ? 'var(--intent-success-fg)'
    : t === 'agent' ? 'var(--fg-default)'
    : 'var(--fg-muted)';
}
function bucketOf(rel: string): string {
  if (rel.endsWith('m ago') || rel.endsWith('h ago')) {
    const num = parseInt(rel, 10);
    if (rel.endsWith('m ago') || (rel.endsWith('h ago') && num <= 12)) return 'Today';
  }
  if (rel === '1d ago') return 'Yesterday';
  if (rel.endsWith('d ago') || rel.endsWith('w ago')) return 'Earlier';
  return 'Today';
}

// ─────────────────────────────────────────────────────────────────────────
// Detail pane

function Detail({
  item, onArchive, onSnooze,
}: { item: Item; onArchive: () => void; onSnooze: () => void }) {
  const Icon = ITEM_ICONS[item.type];
  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center justify-between gap-3 px-4 py-3"
        style={{ borderBottom: '1px solid var(--border-muted)' }}
      >
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: tintFor(item.type) }} />
          <span className="text-[10px] uppercase tracking-[0.14em] font-semibold"
            style={{ color: 'var(--fg-muted)' }}>
            {item.type}
          </span>
          {item.meta?.map((m, i) => (
            <span
              key={i}
              className="text-[9px] uppercase tracking-[0.14em] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap"
              style={{
                background:
                  m.tone === 'success' ? 'var(--intent-success-bg)'
                  : m.tone === 'warn' ? 'var(--intent-warn-bg)'
                  : m.tone === 'danger' ? 'var(--intent-danger-bg)'
                  : 'var(--bg-surface-muted)',
                color:
                  m.tone === 'success' ? 'var(--intent-success-fg)'
                  : m.tone === 'warn' ? 'var(--intent-warn-fg)'
                  : m.tone === 'danger' ? 'var(--intent-danger-fg)'
                  : 'var(--fg-muted)',
                border: `1px solid ${
                  m.tone === 'success' ? 'var(--intent-success-fg)'
                  : m.tone === 'warn' ? 'var(--intent-warn-fg)'
                  : m.tone === 'danger' ? 'var(--intent-danger-fg)'
                  : 'var(--border-muted)'
                }`,
              }}
            >
              {m.label}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button leading={<Clock className="w-3 h-3" />} onClick={onSnooze}>Snooze</Button>
          <Button leading={<Archive className="w-3 h-3" />} onClick={onArchive}>Archive</Button>
          <Button variant="primary" leading={<ExternalLink className="w-3 h-3" />}>
            <span className="whitespace-nowrap">Open in {item.where}</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-4">
        <h2 className="text-[16px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
          {item.title}
        </h2>
        <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--fg-subtle)' }}>
          <span>From <span style={{ color: 'var(--fg-default)' }}>{item.who}</span></span>
          <span>·</span>
          <span>In <span style={{ color: 'var(--fg-default)' }}>{item.where}</span></span>
          <span>·</span>
          <span className="font-mono">{item.at}</span>
        </div>

        <div
          className="px-4 py-3 rounded-md text-[12px] leading-relaxed"
          style={{
            background: 'var(--bg-surface-muted)',
            border: '1px solid var(--border-muted)',
            color: 'var(--fg-default)',
          }}
        >
          {item.preview}
        </div>

        <ContextSnippet item={item} />

        <div className="flex flex-col gap-1.5 mt-2">
          <span className="text-[10px] uppercase tracking-[0.14em] font-semibold" style={{ color: 'var(--fg-subtle)' }}>
            Quick reply
          </span>
          <textarea
            placeholder="Type a reply or command (Cmd+Enter to send)…"
            rows={3}
            className="rounded-md p-2.5 text-[12px] outline-none resize-none"
            style={{
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border-default)',
              color: 'var(--fg-strong)',
              fontFamily: 'inherit',
            }}
          />
          <div className="flex items-center justify-end">
            <Button variant="primary" size="md">Send reply</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContextSnippet({ item }: { item: Item }) {
  if (item.type === 'review' || item.type === 'fix') {
    return (
      <div
        className="rounded-md overflow-hidden"
        style={{ border: '1px solid var(--border-muted)' }}
      >
        <div
          className="px-2.5 py-1.5 text-[10px] uppercase tracking-[0.14em] font-semibold"
          style={{
            background: 'var(--bg-surface-muted)',
            color: 'var(--fg-subtle)',
            borderBottom: '1px solid var(--border-muted)',
          }}
        >
          Diff context
        </div>
        <pre
          className="p-2.5 text-[11px] font-mono"
          style={{ background: 'var(--bg-canvas)', color: 'var(--fg-default)', margin: 0 }}
        >
          <code>
            <span style={{ color: 'var(--intent-success-fg)' }}>+ require_sso: true</span>{'\n'}
            <span style={{ color: 'var(--intent-danger-fg)' }}>- require_sso: false</span>{'\n'}
            <span>  branches:</span>{'\n'}
            <span>    - main</span>{'\n'}
            <span>    - release/*</span>
          </code>
        </pre>
      </div>
    );
  }
  if (item.type === 'admission') {
    return (
      <ul
        className="flex flex-col gap-1 px-3 py-2.5 rounded-md"
        style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-muted)' }}
      >
        {[
          { label: 'no-secret-in-diff', pass: false },
          { label: 'tests-pass',         pass: true  },
          { label: 'review-approval-2',  pass: true  },
          { label: 'no-prod-config',     pass: false },
        ].map((o) => (
          <li key={o.label} className="flex items-center gap-2 text-[11px] font-mono"
            style={{ color: o.pass ? 'var(--intent-success-fg)' : 'var(--intent-danger-fg)' }}>
            {o.pass ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
            {o.label}
          </li>
        ))}
      </ul>
    );
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────
// Empty states

function EmptyHint({ q, filter }: { q: string; filter: Filter }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 px-4 text-center">
      <Inbox className="w-6 h-6" style={{ color: 'var(--fg-subtle)' }} />
      <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>
        {q ? `No matches for "${q}"` : `Your ${filter} list is clear`}
      </span>
      <span className="text-[11px]" style={{ color: 'var(--fg-subtle)' }}>
        {q ? 'Try a different keyword or change the filter.' : 'Nothing waiting on you. Take a break.'}
      </span>
    </div>
  );
}

function DetailEmpty() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2 px-6 text-center">
      <Inbox className="w-7 h-7" style={{ color: 'var(--fg-subtle)' }} />
      <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>
        Pick something to read
      </span>
      <span className="text-[11px] max-w-[280px]" style={{ color: 'var(--fg-muted)' }}>
        Click any item on the left to open it here. Use <kbd className="px-1 rounded font-mono text-[10px]" style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-muted)' }}>j</kbd> / <kbd className="px-1 rounded font-mono text-[10px]" style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-muted)' }}>k</kbd> to navigate.
      </span>
    </div>
  );
}
