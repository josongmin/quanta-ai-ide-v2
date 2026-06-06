import { useMemo, useState } from 'react';
import { Search, Lock, Globe, Check, FolderTree, Star } from 'lucide-react';
import { GithubIcon } from '@shared/ui/brand-icons';
import { REPOS, PAGE_SIZE, type Repo } from '../../../lib/repos';
import type { WizardData } from '../../wizard';
import { ACCENT_TINT } from '../../primitives/shared';
import type { WorkspaceStepProps } from './types';
import { providerLabel } from './data';
import { RepoConfig } from './RepoConfig';

// Post-connect: pick repo, then branch, then monorepo paths.
export function RepoPicker({ value, onChange }: WorkspaceStepProps) {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return REPOS;
    return REPOS.filter((r) =>
      r.fullName.toLowerCase().includes(needle)
      || r.description.toLowerCase().includes(needle)
      || r.language.toLowerCase().includes(needle));
  }, [q]);

  // Reset page when filter changes
  const [prevQ, setPrevQ] = useState(q);
  if (prevQ !== q) {
    setPrevQ(q);
    setPage(0);
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRepos = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const selected = REPOS.find((r) => r.fullName === value.repo) ?? null;

  if (selected) {
    return (
      <RepoConfig
        repo={selected}
        value={value}
        onChange={onChange}
        onBack={() => { onChange({ ...value, repo: '', branch: '', monorepoPaths: [] }); }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ConnectedAccountStrip account={value.account} provider={value.provider} onDisconnect={() => {
        onChange({ ...value, connected: false, account: '', repo: '', branch: '', monorepoPaths: [] });
      }} />

      <div
        className="flex items-center gap-2 h-9 px-3 rounded-md"
        style={{
          background: 'var(--bg-surface-muted)',
          border: '1px solid var(--border-default)',
        }}
      >
        <Search className="w-3.5 h-3.5" style={{ color: 'var(--fg-subtle)' }} />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); }}
          placeholder="Search your repositories…"
          className="flex-1 bg-transparent outline-none text-[12px]"
          style={{ color: 'var(--fg-strong)' }}
          autoFocus
        />
        <span className="text-[10px] tabular-nums" style={{ color: 'var(--fg-subtle)' }}>
          {filtered.length} / {REPOS.length}
        </span>
      </div>

      <div className="flex flex-col rounded-md overflow-hidden"
        style={{ border: '1px solid var(--border-muted)' }}
      >
        {pageRepos.map((r, i) => (
          <RepoRow
            key={r.fullName}
            repo={r}
            top={i === 0}
            onSelect={() => { onChange({ ...value, repo: r.fullName, branch: r.defaultBranch, monorepoPaths: [] }); }}
          />
        ))}
        {pageRepos.length === 0 && (
          <div className="text-center py-10 text-[11px]" style={{ color: 'var(--fg-subtle)' }}>
            No repositories match &quot;{q}&quot;.
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      )}
    </div>
  );
}

function ConnectedAccountStrip({
  account, provider, onDisconnect,
}: {
  account: string;
  provider: WizardData['workspace']['provider'];
  onDisconnect: () => void;
}) {
  return (
    <div
      className="flex items-center gap-2.5 px-3 py-2 rounded-md text-[11px]"
      style={{
        background: ACCENT_TINT,
        border: '1px solid var(--fg-accent)',
      }}
    >
      <Check className="w-3.5 h-3.5" style={{ color: 'var(--fg-accent)' }} />
      <span style={{ color: 'var(--fg-default)' }}>
        Connected to <span className="font-semibold" style={{ color: 'var(--fg-strong)' }}>{providerLabel(provider)}</span>
        {' '}as <span className="font-mono">{account}</span>
      </span>
      <span className="flex-1" />
      <button
        type="button"
        onClick={onDisconnect}
        className="text-[10px]"
        style={{ color: 'var(--fg-link)' }}
      >
        Disconnect
      </button>
    </div>
  );
}

function RepoRow({
  repo, top, onSelect,
}: { repo: Repo; top: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex items-center gap-3 h-12 px-3 text-left transition-colors"
      style={{
        borderTop: top ? 'none' : '1px solid var(--border-muted)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <GithubIcon className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--fg-muted)' }} />
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium tabular-nums truncate" style={{ color: 'var(--fg-strong)' }}>
            {repo.fullName}
          </span>
          <Vis kind={repo.visibility} />
          {repo.monorepo && (
            <span
              className="inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.14em] font-semibold px-1.5 py-0.5 rounded"
              style={{
                background: ACCENT_TINT,
                color: 'var(--fg-accent)',
                border: '1px solid var(--fg-accent)',
              }}
            >
              <FolderTree className="w-2.5 h-2.5" />
              monorepo
            </span>
          )}
        </div>
        <span className="text-[10px] truncate" style={{ color: 'var(--fg-subtle)' }}>
          {repo.description}
        </span>
      </div>
      <div className="flex items-center gap-3 text-[10px] tabular-nums shrink-0" style={{ color: 'var(--fg-subtle)' }}>
        <span>{repo.language}</span>
        <span>{repo.size}</span>
        <span>{repo.updatedRel}</span>
        {repo.stars > 0 && (
          <span className="flex items-center gap-0.5">
            <Star className="w-2.5 h-2.5" />
            {repo.stars}
          </span>
        )}
      </div>
    </button>
  );
}

function Pagination({
  page, totalPages, onChange,
}: { page: number; totalPages: number; onChange: (p: number) => void }) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span style={{ color: 'var(--fg-subtle)' }}>
        Page <span className="tabular-nums" style={{ color: 'var(--fg-default)' }}>{page + 1}</span> of {totalPages}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => { onChange(Math.max(0, page - 1)); }}
          disabled={page === 0}
          className="h-7 px-2 rounded-md text-[11px] font-medium transition-colors"
          style={{
            background: 'var(--bg-surface-muted)',
            color: page === 0 ? 'var(--fg-subtle)' : 'var(--fg-default)',
            border: '1px solid var(--border-default)',
            opacity: page === 0 ? 0.5 : 1,
          }}
        >
          Prev
        </button>
        <button
          type="button"
          onClick={() => { onChange(Math.min(totalPages - 1, page + 1)); }}
          disabled={page === totalPages - 1}
          className="h-7 px-2 rounded-md text-[11px] font-medium transition-colors"
          style={{
            background: 'var(--bg-surface-muted)',
            color: page === totalPages - 1 ? 'var(--fg-subtle)' : 'var(--fg-default)',
            border: '1px solid var(--border-default)',
            opacity: page === totalPages - 1 ? 0.5 : 1,
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
}

function Vis({ kind }: { kind: 'private' | 'public' }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.14em] font-semibold px-1.5 py-0.5 rounded"
      style={{
        background: 'var(--bg-surface-muted)',
        color: 'var(--fg-muted)',
        border: '1px solid var(--border-muted)',
      }}
    >
      {kind === 'private' ? <Lock className="w-2.5 h-2.5" /> : <Globe className="w-2.5 h-2.5" />}
      {kind}
    </span>
  );
}
