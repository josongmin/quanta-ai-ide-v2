import { useEffect, useMemo, useState } from 'react';
import {
  Search, GitBranch, Lock, Globe, Check, Loader2,
  ArrowLeft, FolderTree, Star, Plus, Minus, AlertCircle,
} from 'lucide-react';
import { GithubIcon } from '@shared/ui/brand-icons';
import { OAuthRedirectOverlay } from '@widgets/auth-stage';
import { REPOS, PAGE_SIZE, type Repo } from '../../lib/repos';
import type { WizardData } from '../wizard';

type Props = {
  value: WizardData['workspace'];
  onChange: (v: WizardData['workspace']) => void;
};

export function StepWorkspace({ value, onChange }: Props) {
  if (!value.connected) {
    return <ConnectScreen value={value} onChange={onChange} />;
  }
  return <RepoPicker value={value} onChange={onChange} />;
}

// ─────────────────────────────────────────────────────────────────────────
// Pre-connect: pick provider + redirect

function ConnectScreen({ value, onChange }: Props) {
  const [oauth, setOauth] = useState<null | 'github' | 'gitlab' | 'google'>(null);

  const providers: { id: 'github' | 'gitlab' | 'bitbucket'; label: string; icon: React.ReactNode; perm: string }[] = [
    { id: 'github',    label: 'GitHub',     icon: <GithubIcon className="w-4 h-4" />, perm: 'Read access · repos & members' },
    { id: 'gitlab',    label: 'GitLab',     icon: <GitLabMark />,                  perm: 'Read access · projects & users' },
    { id: 'bitbucket', label: 'Bitbucket',  icon: <BitbucketMark />,               perm: 'Read access · workspaces' },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-3 gap-2">
        {providers.map((p) => {
          const active = value.provider === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => { onChange({ ...value, provider: p.id }); }}
              className="flex flex-col items-start gap-1.5 p-4 rounded-md text-left transition-colors"
              style={{
                background: active ? 'var(--bg-active)' : 'var(--bg-surface-muted)',
                border: `1px solid ${active ? 'var(--fg-accent)' : 'var(--border-muted)'}`,
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg-surface-muted)'; }}
            >
              <div className="flex items-center gap-2">
                <span style={{ color: active ? 'var(--fg-strong)' : 'var(--fg-default)' }}>{p.icon}</span>
                <span
                  className="text-[12px] font-semibold"
                  style={{ color: active ? 'var(--fg-strong)' : 'var(--fg-default)' }}
                >
                  {p.label}
                </span>
                {active && (
                  <span
                    className="ml-auto w-1.5 h-1.5 rounded-full onb-tick"
                    style={{ background: 'var(--fg-accent)' }}
                  />
                )}
              </div>
              <span className="text-[10px] leading-snug" style={{ color: 'var(--fg-subtle)' }}>
                {p.perm}
              </span>
            </button>
          );
        })}
      </div>

      <PermissionsCard provider={value.provider} />

      <button
        type="button"
        onClick={() => { setOauth(value.provider === 'bitbucket' ? 'gitlab' : value.provider); }}
        className="inline-flex items-center justify-center gap-1.5 h-10 rounded-md text-[12px] font-semibold transition-colors"
        style={{ background: 'var(--fg-strong)', color: 'var(--bg-canvas)' }}
      >
        Connect to {value.provider === 'github' ? 'GitHub' : value.provider === 'gitlab' ? 'GitLab' : 'Bitbucket'}
      </button>

      {oauth && (
        <OAuthRedirectOverlay
          provider={oauth}
          onCancel={() => { setOauth(null); }}
          onComplete={() => {
            setOauth(null);
            // Demo account derived from chosen provider.
            onChange({ ...value, connected: true, account: 'acme', repo: '', branch: '', monorepoPaths: [] });
          }}
        />
      )}
    </div>
  );
}

function PermissionsCard({ provider }: { provider: WizardData['workspace']['provider'] }) {
  const items = [
    { ok: true,  text: 'Read repository contents' },
    { ok: true,  text: 'Read repository metadata (branches, commits)' },
    { ok: true,  text: 'Read team & member list (for CODEOWNERS)' },
    { ok: false, text: 'Write to your repos · we never do this' },
    { ok: false, text: 'Trigger workflows · we never do this' },
  ];
  return (
    <div
      className="flex flex-col gap-2 px-3 py-3 rounded-md"
      style={{
        background: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-muted)',
      }}
    >
      <span className="text-[10px] uppercase tracking-[0.14em] font-medium" style={{ color: 'var(--fg-subtle)' }}>
        What se · field will request from {label(provider)}
      </span>
      <ul className="grid grid-cols-1 gap-1">
        {items.map((it, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-[11px] leading-snug"
            style={{ color: it.ok ? 'var(--fg-default)' : 'var(--fg-subtle)' }}
          >
            <span
              className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full mt-0.5 shrink-0"
              style={{
                background: it.ok ? 'var(--intent-success-bg)' : 'var(--bg-canvas)',
                border: `1px solid ${it.ok ? 'var(--intent-success-fg)' : 'var(--border-muted)'}`,
              }}
            >
              {it.ok
                ? <Check className="w-2.5 h-2.5" style={{ color: 'var(--intent-success-fg)' }} />
                : <Minus className="w-2.5 h-2.5" style={{ color: 'var(--fg-subtle)' }} />}
            </span>
            <span>{it.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function label(p: WizardData['workspace']['provider']) {
  return p === 'github' ? 'GitHub' : p === 'gitlab' ? 'GitLab' : 'Bitbucket';
}

// ─────────────────────────────────────────────────────────────────────────
// Post-connect: pick repo, then branch, then monorepo paths

function RepoPicker({ value, onChange }: Props) {
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
        background: 'color-mix(in srgb, var(--fg-accent) 14%, transparent)',
        border: '1px solid var(--fg-accent)',
      }}
    >
      <Check className="w-3.5 h-3.5" style={{ color: 'var(--fg-accent)' }} />
      <span style={{ color: 'var(--fg-default)' }}>
        Connected to <span className="font-semibold" style={{ color: 'var(--fg-strong)' }}>{label(provider)}</span>
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
                background: 'color-mix(in srgb, var(--fg-accent) 14%, transparent)',
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

// ─────────────────────────────────────────────────────────────────────────
// Repo config — branch picker, monorepo path picker, multi-stage indexing

type IndexStage = { id: 'clone' | 'parse' | 'graph' | 'ready'; label: string; weight: number };
const STAGES: IndexStage[] = [
  { id: 'clone', label: 'Clone & verify',      weight: 25 },
  { id: 'parse', label: 'Parse source files',  weight: 35 },
  { id: 'graph', label: 'Build symbol graph',  weight: 30 },
  { id: 'ready', label: 'Warm up dot field',   weight: 10 },
];

function RepoConfig({
  repo, value, onChange, onBack,
}: {
  repo: Repo;
  value: WizardData['workspace'];
  onChange: (v: WizardData['workspace']) => void;
  onBack: () => void;
}) {
  const [pct, setPct] = useState(0);

  // Run the multi-stage indexing simulation any time the selection changes.
  // Clears on unmount or when repo/branch/monorepoPaths change underneath.
  const monorepoPathsKey = value.monorepoPaths.join(',');
  const resetKey = `${repo.fullName}|${value.branch}|${monorepoPathsKey}`;
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (prevResetKey !== resetKey) {
    setPrevResetKey(resetKey);
    setPct(0);
  }
  useEffect(() => {
    let p = 0;
    const id = setInterval(() => {
      p = Math.min(100, p + 1.4 + Math.random() * 1.6);
      setPct(p);
      if (p >= 100) clearInterval(id);
    }, 80);
    return () => { clearInterval(id); };
  }, [repo.fullName, value.branch, monorepoPathsKey]);

  return (
    <div className="flex flex-col gap-5 onb-step-in">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-[11px] self-start"
        style={{ color: 'var(--fg-muted)' }}
      >
        <ArrowLeft className="w-3 h-3" />
        Pick a different repo
      </button>

      <div
        className="flex items-start gap-3 px-3 py-3 rounded-md"
        style={{
          background: 'var(--bg-surface-muted)',
          border: '1px solid var(--border-default)',
        }}
      >
        <GithubIcon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--fg-strong)' }} />
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <span className="text-[12px] font-semibold tabular-nums" style={{ color: 'var(--fg-strong)' }}>
            {repo.fullName}
          </span>
          <span className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
            {repo.description} · {repo.language} · {repo.size}
          </span>
        </div>
      </div>

      <BranchPicker
        repo={repo}
        value={value.branch || repo.defaultBranch}
        onChange={(b) => { onChange({ ...value, branch: b }); }}
      />

      {repo.monorepo && (
        <MonorepoPaths
          repo={repo}
          selected={value.monorepoPaths}
          onChange={(paths) => { onChange({ ...value, monorepoPaths: paths }); }}
        />
      )}

      <IndexingProgress
        pct={pct}
        repo={repo.fullName}
        branch={value.branch || repo.defaultBranch}
      />
    </div>
  );
}

function BranchPicker({
  repo, value, onChange,
}: { repo: Repo; value: string; onChange: (v: string) => void }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-[10px] uppercase tracking-[0.14em] font-medium pb-1" style={{ color: 'var(--fg-subtle)' }}>
        Default branch to track
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {repo.branches.map((b) => {
          const active = b === value;
          const isDefault = b === repo.defaultBranch;
          return (
            <button
              key={b}
              type="button"
              onClick={() => { onChange(b); }}
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] font-medium transition-colors"
              style={{
                background: active ? 'var(--bg-active)' : 'var(--bg-surface-muted)',
                color: active ? 'var(--fg-strong)' : 'var(--fg-default)',
                border: `1px solid ${active ? 'var(--fg-accent)' : 'var(--border-muted)'}`,
              }}
            >
              <GitBranch className="w-3 h-3" style={{ color: active ? 'var(--fg-accent)' : 'var(--fg-muted)' }} />
              <span className="font-mono">{b}</span>
              {isDefault && (
                <span
                  className="text-[8px] uppercase tracking-[0.14em] font-semibold"
                  style={{ color: 'var(--fg-subtle)' }}
                >
                  default
                </span>
              )}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function MonorepoPaths({
  repo, selected, onChange,
}: { repo: Repo; selected: string[]; onChange: (v: string[]) => void }) {
  const all = repo.paths ?? [];
  const allSelected = selected.length === 0 || selected.length === all.length;

  const toggle = (p: string) => {
    if (selected.includes(p)) onChange(selected.filter((s) => s !== p));
    else onChange([...selected, p]);
  };

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-[10px] uppercase tracking-[0.14em] font-medium pb-1 flex items-center justify-between"
        style={{ color: 'var(--fg-subtle)' }}>
        <span>Sub-paths to index</span>
        <button
          type="button"
          onClick={() => { onChange(allSelected ? [] : all); }}
          className="lowercase tracking-normal"
          style={{ color: 'var(--fg-link)' }}
        >
          {allSelected ? 'Select none' : 'Select all'}
        </button>
      </legend>
      <div
        className="flex flex-wrap gap-1.5 p-2 rounded-md"
        style={{
          background: 'var(--bg-surface-muted)',
          border: '1px solid var(--border-muted)',
        }}
      >
        {all.map((p) => {
          const active = selected.includes(p);
          return (
            <button
              key={p}
              type="button"
              onClick={() => { toggle(p); }}
              className="inline-flex items-center gap-1 h-6 pl-2 pr-1.5 rounded text-[11px] font-mono transition-colors"
              style={{
                background: active ? 'color-mix(in srgb, var(--fg-accent) 14%, transparent)' : 'var(--bg-canvas)',
                color: active ? 'var(--fg-strong)' : 'var(--fg-default)',
                border: `1px solid ${active ? 'var(--fg-accent)' : 'var(--border-default)'}`,
              }}
            >
              {p}
              {active
                ? <Check className="w-2.5 h-2.5" style={{ color: 'var(--fg-accent)' }} />
                : <Plus className="w-2.5 h-2.5" style={{ color: 'var(--fg-subtle)' }} />}
            </button>
          );
        })}
      </div>
      <span className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
        Leave empty to index all sub-paths. Pick specific ones if you want to scope down for performance.
      </span>
    </fieldset>
  );
}

function IndexingProgress({ pct, repo, branch }: { pct: number; repo: string; branch: string }) {
  // Each stage owns a slice of the 0–100 range; computed cumulative so we can
  // tell which stage is "currently running" and which are "done".
  const stages = useMemo(() => {
    return STAGES.reduce<(IndexStage & { start: number; end: number })[]>(
      (acc, s) => {
        const start = acc.length === 0 ? 0 : acc[acc.length - 1].end;
        return [...acc, { ...s, start, end: start + s.weight }];
      },
      [],
    );
  }, []);

  const active = stages.find((s) => pct < s.end) ?? stages[stages.length - 1];
  const done = pct >= 100;

  return (
    <div
      className="flex flex-col gap-3 px-3 py-3 rounded-md"
      style={{
        background: done ? 'color-mix(in srgb, var(--fg-accent) 14%, transparent)' : 'var(--bg-surface-muted)',
        border: `1px solid ${done ? 'var(--fg-accent)' : 'var(--border-default)'}`,
      }}
    >
      <div className="flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-2">
          {done
            ? <Check className="w-3.5 h-3.5" style={{ color: 'var(--fg-accent)' }} />
            : <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--fg-muted)' }} />}
          <span className="font-mono tabular-nums" style={{ color: 'var(--fg-strong)' }}>{repo}</span>
          <span style={{ color: 'var(--fg-subtle)' }}>· {branch}</span>
        </div>
        <span className="font-mono tabular-nums" style={{ color: done ? 'var(--fg-accent)' : 'var(--fg-muted)' }}>
          {done ? 'Indexed' : `${active.label} · ${Math.floor(pct)}%`}
        </span>
      </div>

      <div className="relative h-[3px] rounded-full overflow-hidden"
        style={{ background: 'var(--border-muted)' }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${pct}%`,
            background: done ? 'var(--fg-accent)' : 'var(--fg-strong)',
            transition: 'width 140ms linear',
          }}
        />
      </div>

      {/* Per-stage tick row */}
      <ol className="flex items-center justify-between text-[10px]">
        {stages.map((s) => {
          const isDone = pct >= s.end;
          const isActive = !isDone && pct >= s.start;
          return (
            <li key={s.id} className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-full flex items-center justify-center"
                style={{
                  background: isDone ? 'var(--fg-accent)' : isActive ? 'var(--bg-canvas)' : 'transparent',
                  border: `1px solid ${isDone ? 'var(--fg-accent)' : isActive ? 'var(--fg-strong)' : 'var(--border-default)'}`,
                }}
              >
                {isDone && <Check className="w-2 h-2" style={{ color: 'var(--bg-canvas)' }} />}
                {isActive && (
                  <span
                    className="w-1 h-1 rounded-full onb-pulse-ring"
                    style={{ background: 'var(--fg-strong)' }}
                  />
                )}
              </span>
              <span style={{
                color: isDone ? 'var(--fg-accent)' : isActive ? 'var(--fg-strong)' : 'var(--fg-subtle)',
                fontWeight: isActive ? 600 : 400,
              }}>
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>

      {!done && (
        <div className="flex items-start gap-2 text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
          <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
          <span>You can continue setup — indexing keeps running in the background. We&apos;ll notify you when the dot field is ready.</span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Provider marks

function GitLabMark() {
  return (
    <span className="w-4 h-4 rounded-sm inline-flex items-center justify-center text-[8px] font-black"
      style={{ background: 'var(--fg-default)', color: 'var(--bg-canvas)' }}>
      GL
    </span>
  );
}
function BitbucketMark() {
  return (
    <span className="w-4 h-4 rounded-sm inline-flex items-center justify-center text-[8px] font-black"
      style={{ background: 'var(--fg-default)', color: 'var(--bg-canvas)' }}>
      BB
    </span>
  );
}
