import { useMemo } from 'react';
import {
  Eye, FileCode, FileMinus, FilePlus, FileSymlink,
} from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import {
  coverageDeltas,
  prodCorrelations,
  type ChangeKind,
  type FileDiff,
  type PullRequest,
} from '@entities/pr';
import type { RepoData } from '@entities/repo';
import HunkNavigator from '../HunkNavigator';
import { V2Card } from '../ReviewSurface';

export function FilesScene({
  pr,
  repo,
  activeFilePath,
  onSelectFile,
  onToggleViewed,
  blockerColor,
}: {
  pr: PullRequest;
  repo: RepoData;
  activeFilePath: string | null;
  onSelectFile: (path: string) => void;
  onToggleViewed: (path: string, viewed: boolean) => void;
  blockerColor: string;
}) {
  const { t } = useTranslation('review');
  const sorted = useMemo(() => [...pr.files].sort((a, b) => (b.added + b.removed) - (a.added + a.removed)), [pr.files]);
  const totalDelta = pr.added + pr.removed;
  const viewedCount = pr.files.filter((f) => f.viewed).length;
  const covByPath = useMemo(() => {
    const m = new Map<string, { before: number; after: number; drop: number }>();
    for (const r of coverageDeltas(pr, repo)) {
      m.set(r.filePath, { before: r.before, after: r.after, drop: r.drop });
    }
    return m;
  }, [pr, repo]);
  const prodByPath = useMemo(() => prodCorrelations(pr, repo), [pr, repo]);
  const activeFile = useMemo(
    () => activeFilePath === null ? null : pr.files.find((f) => f.path === activeFilePath) ?? null,
    [pr.files, activeFilePath],
  );

  return (
    <V2Card className="p-5">
      <div className="flex items-center gap-2">
        <FileCode className="w-3.5 h-3.5 text-[var(--fg-muted)]" />
        <span className="text-[11px] font-bold uppercase tracking-[var(--track-eyebrow)] text-[var(--fg-muted)]">
          Files
        </span>
        <span className="text-[10px] font-mono text-[var(--fg-subtle)]">
          {pr.files.length} files · {viewedCount} viewed · +{pr.added} / −{pr.removed}
        </span>
      </div>

      <HunkNavigator file={activeFile} />

      {sorted.length === 0 ? (
        <div className="mt-4 text-[12px] italic text-[var(--fg-subtle)]">{t('empty.noFiles')}</div>
      ) : (
        <ul className="mt-3 space-y-1">
          {sorted.slice(0, 10).map((f) => (
            <FileScannerRow
              key={f.path}
              f={f}
              totalDelta={totalDelta}
              cov={covByPath.get(f.path) ?? null}
              prodIncidents={prodByPath.get(f.path) ?? null}
              active={f.path === activeFilePath}
              blockerColor={blockerColor}
              onClick={() => { onSelectFile(f.path); }}
              onToggleViewed={() => { onToggleViewed(f.path, !f.viewed); }}
            />
          ))}
          {sorted.length > 10 && (
            <li className="px-2 py-1 text-[11px] font-mono text-[var(--fg-subtle)]">
              +{String(sorted.length - 10)} more files…
            </li>
          )}
        </ul>
      )}
    </V2Card>
  );
}

function FileScannerRow({
  f,
  totalDelta,
  cov,
  prodIncidents,
  active,
  blockerColor,
  onClick,
  onToggleViewed,
}: {
  f: FileDiff;
  totalDelta: number;
  cov: { before: number; after: number; drop: number } | null;
  prodIncidents: string[] | null;
  active: boolean;
  blockerColor: string;
  onClick: () => void;
  onToggleViewed: () => void;
}) {
  const total = f.added + f.removed;
  const ratio = totalDelta > 0 ? Math.min(1, total / totalDelta) : 0;
  const isHot = f.hunks.length >= 3 && total >= 40;
  const isTest = /(?:^|\/)(?:__tests__|tests|test|__mocks__)\//.test(f.path)
    || /\.(?:test|spec)\.(?:[tj]sx?|py|go|rb|java|kt|rs)$/.test(f.path);

  return (
    <li
      className={`flex items-center gap-2 pl-2 pr-2 py-1.5 rounded-md transition-colors ${
        active ? 'bg-[var(--bg-elevated)]' : 'hover:bg-[var(--bg-hover)]'
      } ${f.viewed ? 'opacity-50' : ''}`}
    >
      <button type="button" onClick={onClick} className="flex-1 min-w-0 flex items-center gap-2 text-left">
        <FileKindIcon kind={f.kind} />
        <span className="text-[12px] font-mono truncate text-[var(--fg-strong)]">{f.path}</span>
        {isHot && (
          <span
            className="shrink-0 inline-flex items-center px-1 h-4 rounded-sm text-[9px] font-bold uppercase tracking-[var(--track-eyebrow)]"
            title={`Hot-spot: ${String(f.hunks.length)} hunks · ${String(total)} LOC. Likely to hide regressions.`}
            style={{ background: 'var(--intent-warn-bg)', color: 'var(--intent-warn-fg)', border: '1px solid color-mix(in srgb, var(--intent-warn-fg) 40%, transparent)' }}
          >
            hot
          </span>
        )}
        {prodIncidents !== null && prodIncidents.length > 0 && (
          <span
            className="shrink-0 inline-flex items-center px-1 h-4 rounded-sm text-[9px] font-bold uppercase tracking-[var(--track-eyebrow)]"
            title={`Overlaps ${String(prodIncidents.length)} prior incident${prodIncidents.length === 1 ? '' : 's'}: ${prodIncidents.join(', ')}`}
            style={{ background: 'var(--intent-danger-bg)', color: 'var(--intent-danger-fg)', border: '1px solid color-mix(in srgb, var(--intent-danger-fg) 45%, transparent)' }}
          >
            prod
          </span>
        )}
        {isTest && (
          <span
            className="shrink-0 inline-flex items-center px-1 h-4 rounded-sm text-[9px] font-bold uppercase tracking-[var(--track-eyebrow)] text-[var(--fg-subtle)]"
            style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-default)' }}
          >
            test
          </span>
        )}
        {cov !== null && cov.drop >= 3 && (
          <span
            className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-mono tabular-nums"
            title={`Coverage ${String(cov.before)}% → ${String(cov.after)}% (-${String(cov.drop)}pp)`}
            style={{ color: blockerColor }}
          >
            cov −{cov.drop}pp
          </span>
        )}
      </button>
      <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-mono tabular-nums">
        <span style={{ color: 'color-mix(in srgb, var(--intent-success-vivid) 85%, transparent)' }}>+{f.added}</span>
        <span style={{ color: 'color-mix(in srgb, var(--intent-danger-vivid) 85%, transparent)' }}>−{f.removed}</span>
      </span>
      <div className="shrink-0 w-[80px] h-1.5 rounded-full overflow-hidden bg-[var(--bg-hover)]">
        <div
          className="h-full"
          style={{
            width: `${String(Math.round(ratio * 100))}%`,
            background: isHot
              ? 'linear-gradient(90deg, var(--intent-warn-fg), var(--intent-danger-fg))'
              : 'linear-gradient(90deg, var(--intent-success-fg), var(--fg-link))',
          }}
        />
      </div>
      <button
        type="button"
        onClick={onToggleViewed}
        className="shrink-0 p-1 rounded-md text-[var(--fg-subtle)] hover:text-[var(--fg-strong)]"
        title={f.viewed ? 'Mark not viewed' : 'Mark viewed'}
      >
        <Eye className="w-3 h-3" />
      </button>
    </li>
  );
}

function FileKindIcon({ kind }: { kind: ChangeKind }) {
  if (kind === 'added') return <FilePlus className="w-3 h-3 shrink-0" style={{ color: 'var(--intent-success-vivid)' }} />;
  if (kind === 'deleted') return <FileMinus className="w-3 h-3 shrink-0" style={{ color: 'var(--intent-danger-vivid)' }} />;
  if (kind === 'renamed') return <FileSymlink className="w-3 h-3 text-[var(--fg-subtle)] shrink-0" />;
  return <FileCode className="w-3 h-3 text-[var(--fg-subtle)] shrink-0" />;
}
