import { useMemo, useState, type CSSProperties } from 'react';
import { ArrowRight, FolderClosed, Search } from 'lucide-react';
import { Modal } from '@shared/ui';
import { useWorkspaceTabsStore } from '../model/store';
import { useNavigateToTab } from './WorkspaceTabsHost';
import {
  TAB_REGISTRY,
  TAB_KINDS_ORDERED,
  type TabKind,
} from '@app/router/workspaceTabsRegistry';

type Props = {
  open: boolean;
  onClose: () => void;
};

// Hero tiles — the three entry points the start page leads with.
const HERO_KINDS: TabKind[] = ['agents', 'coding', 'reviews'];

type RecentRepo = {
  slug: string;
  branch: string;
  status: 'changes' | 'clean' | 'review';
  statusLabel: string;
  diffAdded?: number;
  diffRemoved?: number;
  badges?: { label: string; tone: 'merged' | 'rebased' | 'cve' | 'tag' }[];
  sparkline: number[];
  lastTouched: string;
  quiet?: boolean;
};

const RECENT_REPOS: RecentRepo[] = [
  {
    slug: 'payments-api',
    branch: 'main',
    status: 'changes',
    statusLabel: '3 changes',
    diffAdded: 240,
    diffRemoved: 87,
    sparkline: [2, 5, 3, 8, 6, 9, 4, 7, 10, 6],
    lastTouched: '1h ago',
  },
  {
    slug: 'order-service',
    branch: 'feat/checkout',
    status: 'clean',
    statusLabel: 'clean',
    sparkline: [0, 2, 1, 0, 3, 1, 0, 2, 0, 1],
    lastTouched: '3h ago',
    quiet: true,
  },
  {
    slug: 'ledger-core',
    branch: 'main',
    status: 'review',
    statusLabel: '12 in review',
    diffAdded: 1200,
    diffRemoved: 340,
    badges: [
      { label: 'merged', tone: 'merged' },
      { label: 'rebased', tone: 'rebased' },
    ],
    sparkline: [4, 7, 5, 8, 6, 9, 11, 8, 10, 7],
    lastTouched: 'yesterday',
  },
  {
    slug: 'auth-gateway',
    branch: 'release/0.4',
    status: 'changes',
    statusLabel: '1 change',
    diffAdded: 45,
    diffRemoved: 8,
    badges: [{ label: 'v0.4', tone: 'tag' }],
    sparkline: [1, 2, 3, 5, 8, 6, 4, 3, 2, 1],
    lastTouched: '2d ago',
  },
];

const HERO_COPY: Partial<Record<TabKind, { title: string; sub: string }>> = {
  agents: {
    title: 'AI Coding Agent',
    sub: 'Start a coding session with full engine context.',
  },
  coding: {
    title: 'Code Editor',
    sub: 'Workspace editor with engine signals and overlays.',
  },
  reviews: {
    title: 'PR Review',
    sub: 'Review pull requests with auto-fix and blast radius.',
  },
};

// Catalog-style picker, packaged as a centered modal. Hero tiles up top,
// then a "more capabilities" row, then a recent repos list. Compact: all
// three sections live inside one ~720px dialog.
export default function AddTabModal({ open, onClose }: Props) {
  const openTab = useWorkspaceTabsStore((s) => s.open);
  const navigateToTab = useNavigateToTab();
  const [query, setQuery] = useState('');

  const moreKinds = useMemo(
    () => TAB_KINDS_ORDERED.filter((k) => !HERO_KINDS.includes(k)),
    [],
  );

  const filteredRepos = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return RECENT_REPOS;
    return RECENT_REPOS.filter(
      (r) => r.slug.toLowerCase().includes(q) || r.branch.toLowerCase().includes(q),
    );
  }, [query]);

  function handleClose() {
    setQuery('');
    onClose();
  }

  function handlePick(kind: TabKind) {
    const id = openTab(kind);
    navigateToTab(kind, id);
    handleClose();
  }

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      width={720}
      align="center"
      ariaLabel="Open a view"
    >
      <div
        className="overflow-hidden"
        style={{
          background: 'var(--bg-surface)',
          color: 'var(--fg-default)',
        }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-5">
          <div
            className="text-[9px] font-semibold uppercase mb-2"
            style={{ color: 'var(--fg-subtle)', letterSpacing: '0.18em' }}
          >
            Software Intelligence Platform
          </div>
          <h2
            className="text-[22px] leading-[1.15] font-semibold tracking-tight"
            style={{ color: 'var(--fg-default)' }}
          >
            Where would you like to{' '}
            <span className="italic font-medium" style={{ color: 'var(--fg-accent)' }}>
              start
            </span>
            ?
          </h2>
        </div>

        {/* Hero tiles */}
        <div className="grid grid-cols-3 gap-2.5 px-6 pb-5">
          {HERO_KINDS.map((kind) => (
            <HeroTile key={kind} kind={kind} onPick={handlePick} />
          ))}
        </div>

        {/* More capabilities */}
        <div
          className="px-6 py-3 flex items-start gap-4 border-t"
          style={{ borderColor: 'var(--border-muted)' }}
        >
          <div
            className="text-[9px] font-semibold uppercase pt-0.5 shrink-0 w-[88px]"
            style={{ color: 'var(--fg-subtle)', letterSpacing: '0.18em' }}
          >
            More
          </div>
          <div className="flex-1 flex flex-wrap gap-x-4 gap-y-1.5">
            {moreKinds.map((kind) => {
              const def = TAB_REGISTRY[kind];
              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => { handlePick(kind); }}
                  className="text-[11px] font-medium transition-colors hover:[color:var(--fg-default)]"
                  style={{ color: 'var(--fg-muted)' }}
                >
                  {def.label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => { handlePick('catalog'); }}
            className="inline-flex items-center gap-1.5 text-[9px] font-semibold uppercase px-2 py-1 rounded transition-colors hover:[background:var(--bg-hover)] shrink-0"
            style={{
              color: 'var(--fg-default)',
              border: '1px solid var(--border-default)',
              letterSpacing: '0.14em',
            }}
          >
            Browse all <ArrowRight className="w-2.5 h-2.5" />
          </button>
        </div>

        {/* Recent header + search */}
        <div
          className="px-6 py-2.5 flex items-center justify-between border-t"
          style={{ borderColor: 'var(--border-muted)', background: 'var(--bg-surface-muted)' }}
        >
          <div
            className="text-[9px] font-semibold uppercase"
            style={{ color: 'var(--fg-subtle)', letterSpacing: '0.18em' }}
          >
            Recent
          </div>
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded w-[200px]"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-muted)',
            }}
          >
            <Search className="w-3 h-3" style={{ color: 'var(--fg-subtle)' }} />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); }}
              placeholder="Search repositories"
              className="flex-1 bg-transparent outline-none text-[11px] min-w-0"
              style={{ color: 'var(--fg-default)' }}
            />
          </div>
        </div>

        {/* Recent list */}
        <div className="max-h-[44vh] overflow-y-auto">
          {filteredRepos.length === 0 ? (
            <div
              className="py-8 text-center text-[11px]"
              style={{ color: 'var(--fg-subtle)' }}
            >
              No repositories match “{query}”.
            </div>
          ) : (
            filteredRepos.map((repo) => <RepoRow key={repo.slug} repo={repo} />)
          )}
        </div>
      </div>
    </Modal>
  );
}

function HeroTile({ kind, onPick }: { kind: TabKind; onPick: (k: TabKind) => void }) {
  const def = TAB_REGISTRY[kind];
  const copy = HERO_COPY[kind] ?? { title: def.label, sub: def.description };
  return (
    <button
      type="button"
      onClick={() => { onPick(kind); }}
      className="text-left rounded-lg p-3 transition-colors hover:[background:var(--bg-hover)]"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
      }}
    >
      <div
        className="w-7 h-7 rounded-md inline-flex items-center justify-center mb-2.5"
        style={{
          background: 'var(--bg-surface-muted)',
          border: '1px solid var(--border-muted)',
          color: 'var(--fg-default)',
        }}
      >
        <FolderClosed className="w-3.5 h-3.5" />
      </div>
      <div
        className="text-[12px] font-semibold mb-0.5"
        style={{ color: 'var(--fg-default)' }}
      >
        {copy.title}
      </div>
      <div
        className="text-[10px] leading-[1.4]"
        style={{ color: 'var(--fg-muted)' }}
      >
        {copy.sub}
      </div>
    </button>
  );
}

function RepoRow({ repo }: { repo: RecentRepo }) {
  return (
    <div
      className="grid grid-cols-[28px_minmax(0,1.7fr)_minmax(0,1fr)_auto_64px] items-center gap-3 px-6 py-2.5 border-b"
      style={{ borderColor: 'var(--border-muted)' }}
    >
      <div
        className="w-6 h-6 rounded inline-flex items-center justify-center text-[10px] font-semibold uppercase"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-muted)',
          color: 'var(--fg-default)',
        }}
      >
        {repo.slug.charAt(0)}
      </div>

      <div className="min-w-0">
        <div
          className="text-[12px] font-semibold truncate"
          style={{ color: 'var(--fg-default)' }}
        >
          {repo.slug}
        </div>
        {repo.quiet ? (
          <div
            className="text-[10px] italic mt-0.5"
            style={{ color: 'var(--fg-subtle)' }}
          >
            quiet
          </div>
        ) : (
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {repo.diffAdded !== undefined ? (
              <DiffBar added={repo.diffAdded} removed={repo.diffRemoved ?? 0} />
            ) : null}
            {repo.badges?.map((b) => <BadgeChip key={b.label} badge={b} />)}
          </div>
        )}
      </div>

      <div
        className="flex items-center gap-1.5 text-[10px] font-mono min-w-0"
        style={{ color: 'var(--fg-muted)' }}
      >
        <BranchGlyph />
        <span className="truncate">{repo.branch}</span>
      </div>

      <div className="flex items-center gap-2.5">
        <Sparkline values={repo.sparkline} />
        <StatusDot status={repo.status} label={repo.statusLabel} />
      </div>

      <div
        className="text-[10px] font-mono whitespace-nowrap text-right"
        style={{ color: 'var(--fg-subtle)' }}
      >
        {repo.lastTouched}
      </div>
    </div>
  );
}

function DiffBar({ added, removed }: { added: number; removed: number }) {
  const total = Math.max(1, added + removed);
  const addedPct = (added / total) * 100;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-flex h-[4px] w-[52px] rounded-full overflow-hidden"
        style={{ background: 'var(--bg-surface-muted)' }}
      >
        <span style={{ width: `${addedPct}%`, background: 'var(--intent-success-vivid)' }} />
        <span style={{ width: `${100 - addedPct}%`, background: 'var(--intent-danger-vivid)' }} />
      </span>
      <span className="font-mono text-[9px]" style={{ color: 'var(--intent-success-vivid)' }}>
        +{formatCount(added)}
      </span>
      <span className="font-mono text-[9px]" style={{ color: 'var(--intent-danger-vivid)' }}>
        −{formatCount(removed)}
      </span>
    </span>
  );
}

function BadgeChip({ badge }: { badge: { label: string; tone: 'merged' | 'rebased' | 'cve' | 'tag' } }) {
  const TONES: Record<typeof badge.tone, { bg: string; fg: string; border: string }> = {
    merged: { bg: 'rgba(118, 156, 219, 0.14)', fg: '#7baaea', border: 'rgba(118, 156, 219, 0.4)' },
    rebased: { bg: 'rgba(214, 168, 92, 0.14)', fg: '#d4a460', border: 'rgba(214, 168, 92, 0.4)' },
    cve: { bg: 'rgba(220, 110, 110, 0.14)', fg: '#e08a8a', border: 'rgba(220, 110, 110, 0.4)' },
    tag: { bg: 'rgba(118, 156, 219, 0.14)', fg: '#7baaea', border: 'rgba(118, 156, 219, 0.4)' },
  };
  const tone = TONES[badge.tone];
  const style: CSSProperties = {
    background: tone.bg,
    color: tone.fg,
    border: `1px solid ${tone.border}`,
  };
  const prefix = badge.tone === 'cve' ? '⚠ ' : badge.tone === 'tag' ? '◇ ' : '';
  return (
    <span
      className="inline-flex items-center text-[9px] font-mono px-1 py-px rounded"
      style={style}
    >
      {prefix}
      {badge.label}
    </span>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  return (
    <div className="flex items-end gap-[2px] h-[18px]">
      {values.map((v, i) => {
        const h = Math.max(2, (v / max) * 18);
        const positive = i % 3 !== 1;
        return (
          <span
            key={i}
            style={{
              width: 3,
              height: h,
              background: positive ? 'var(--intent-success-vivid)' : 'var(--intent-danger-vivid)',
              borderRadius: 1,
              opacity: 0.8,
            }}
          />
        );
      })}
    </div>
  );
}

function StatusDot({ status, label }: { status: 'changes' | 'clean' | 'review'; label: string }) {
  const COLOR: Record<typeof status, string> = {
    changes: '#d4a460',
    clean: 'var(--intent-success-vivid)',
    review: '#7baaea',
  };
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px]" style={{ color: COLOR[status] }}>
      <span className="inline-block w-[6px] h-[6px] rounded-full" style={{ background: COLOR[status] }} />
      {label}
    </span>
  );
}

function BranchGlyph() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <circle cx="3" cy="3" r="1.4" stroke="currentColor" strokeWidth="1" />
      <circle cx="3" cy="9" r="1.4" stroke="currentColor" strokeWidth="1" />
      <circle cx="9" cy="6" r="1.4" stroke="currentColor" strokeWidth="1" />
      <path d="M3 4.4 V7.6 M4.4 9 H7.6 C8.4 8.6 8.4 7.4 7.6 7" stroke="currentColor" strokeWidth="1" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return String(n);
}
