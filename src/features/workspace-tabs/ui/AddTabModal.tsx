import { useMemo, useState } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { Modal } from '@shared/ui';
import { useWorkspaceTabsStore } from '../model/store';
import { useNavigateToTab } from './WorkspaceTabsHost';
import { TAB_KINDS_ORDERED, type TabKind } from '@shared/config/workspaceTabs';
import { useWorkspaceTabsRegistry } from '../model/RegistryContext';
import { HERO_KINDS, RECENT_REPOS } from './parts/addTabData';
import { HeroTile } from './parts/HeroTile';
import { RepoRow } from './parts/RepoRow';

type Props = {
  open: boolean;
  onClose: () => void;
};

// Catalog-style picker, packaged as a centered modal. Hero tiles up top,
// then a "more capabilities" row, then a recent repos list. Compact: all
// three sections live inside one ~720px dialog.
export default function AddTabModal({ open, onClose }: Props) {
  const tabRegistry = useWorkspaceTabsRegistry();
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
            className="text-2xs font-semibold uppercase mb-2"
            style={{ color: 'var(--fg-subtle)', letterSpacing: '0.18em' }}
          >
            Software Intelligence Platform
          </div>
          <h2
            className="text-3xl leading-[1.15] font-semibold tracking-tight"
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
            <HeroTile key={kind} kind={kind} onPick={handlePick} tabRegistry={tabRegistry} />
          ))}
        </div>

        {/* More capabilities */}
        <div
          className="px-6 py-3 flex items-start gap-4 border-t"
          style={{ borderColor: 'var(--border-muted)' }}
        >
          <div
            className="text-2xs font-semibold uppercase pt-0.5 shrink-0 w-[88px]"
            style={{ color: 'var(--fg-subtle)', letterSpacing: '0.18em' }}
          >
            More
          </div>
          <div className="flex-1 flex flex-wrap gap-x-4 gap-y-1.5">
            {moreKinds.map((kind) => {
              const def = tabRegistry[kind];
              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => { handlePick(kind); }}
                  className="text-sm font-medium transition-colors hover:[color:var(--fg-default)]"
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
            className="inline-flex items-center gap-1.5 text-2xs font-semibold uppercase px-2 py-1 rounded transition-colors hover:[background:var(--bg-hover)] shrink-0"
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
            className="text-2xs font-semibold uppercase"
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
              className="flex-1 bg-transparent outline-none text-sm min-w-0"
              style={{ color: 'var(--fg-default)' }}
            />
          </div>
        </div>

        {/* Recent list */}
        <div className="max-h-[44vh] overflow-y-auto">
          {filteredRepos.length === 0 ? (
            <div
              className="py-8 text-center text-sm"
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
