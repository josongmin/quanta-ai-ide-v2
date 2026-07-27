import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GitBranch, Check, Loader2, ArrowLeft, Plus, AlertCircle } from 'lucide-react';
import { GithubIcon } from '@shared/ui/brand-icons';
import type { Repo } from '../../../lib/repos';
import { ACCENT_TINT } from '../../primitives/shared';
import type { WorkspaceStepProps } from './types';
import { STAGES, type IndexStage } from './data';

// Repo config — branch picker, monorepo path picker, multi-stage indexing.
export function RepoConfig({
  repo, value, onChange, onBack,
}: {
  repo: Repo;
  value: WorkspaceStepProps['value'];
  onChange: WorkspaceStepProps['onChange'];
  onBack: () => void;
}) {
  const { t } = useTranslation('onboarding');
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
        className="inline-flex items-center gap-1 text-sm self-start"
        style={{ color: 'var(--fg-muted)' }}
      >
        <ArrowLeft className="w-3 h-3" />
        {t('workspace.config.pickDifferent')}
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
          <span className="text-base font-semibold tabular-nums" style={{ color: 'var(--fg-strong)' }}>
            {repo.fullName}
          </span>
          <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>
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
  const { t } = useTranslation('onboarding');
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-xs uppercase tracking-eyebrow font-medium pb-1" style={{ color: 'var(--fg-subtle)' }}>
        {t('workspace.config.defaultBranch')}
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
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-sm font-medium transition-colors"
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
                  className="text-2xs uppercase tracking-eyebrow font-semibold"
                  style={{ color: 'var(--fg-subtle)' }}
                >
                  {t('workspace.config.default')}
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

  const { t } = useTranslation('onboarding');
  const toggle = (p: string) => {
    if (selected.includes(p)) onChange(selected.filter((s) => s !== p));
    else onChange([...selected, p]);
  };

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-xs uppercase tracking-eyebrow font-medium pb-1 flex items-center justify-between"
        style={{ color: 'var(--fg-subtle)' }}>
        <span>{t('workspace.config.subPaths')}</span>
        <button
          type="button"
          onClick={() => { onChange(allSelected ? [] : all); }}
          className="lowercase tracking-normal"
          style={{ color: 'var(--fg-link)' }}
        >
          {allSelected ? t('workspace.config.selectNone') : t('workspace.config.selectAll')}
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
              className="inline-flex items-center gap-1 h-6 pl-2 pr-1.5 rounded text-sm font-mono transition-colors"
              style={{
                background: active ? ACCENT_TINT : 'var(--bg-canvas)',
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
      <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>
        {t('workspace.config.subPathsHint')}
      </span>
    </fieldset>
  );
}

function IndexingProgress({ pct, repo, branch }: { pct: number; repo: string; branch: string }) {
  const { t } = useTranslation('onboarding');
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
        background: done ? ACCENT_TINT : 'var(--bg-surface-muted)',
        border: `1px solid ${done ? 'var(--fg-accent)' : 'var(--border-default)'}`,
      }}
    >
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {done
            ? <Check className="w-3.5 h-3.5" style={{ color: 'var(--fg-accent)' }} />
            : <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--fg-muted)' }} />}
          <span className="font-mono tabular-nums" style={{ color: 'var(--fg-strong)' }}>{repo}</span>
          <span style={{ color: 'var(--fg-subtle)' }}>· {branch}</span>
        </div>
        <span className="font-mono tabular-nums" style={{ color: done ? 'var(--fg-accent)' : 'var(--fg-muted)' }}>
          {done ? t('workspace.config.indexed') : t('workspace.config.stagePct', { stage: t(`workspace.config.stage.${active.id}`), pct: Math.floor(pct) })}
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
      <ol className="flex items-center justify-between text-xs">
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
                {t(`workspace.config.stage.${s.id}`)}
              </span>
            </li>
          );
        })}
      </ol>

      {!done && (
        <div className="flex items-start gap-2 text-xs" style={{ color: 'var(--fg-subtle)' }}>
          <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
          <span>{t('workspace.config.backgroundNote')}</span>
        </div>
      )}
    </div>
  );
}
