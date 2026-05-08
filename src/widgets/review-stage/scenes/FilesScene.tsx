// ─────────────────────────────────────────────────────────────────────────
// FILES SCENE — compact tree + diff teaser. The full DiffView lives in
// the legacy FilesTab; here we surface a hot-list (most-changed first)
// so the reviewer can pick a file fast and the right rail jumps to it.
// ─────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import {
  Eye, FileCode, FileMinus, FilePlus, FileSymlink,
} from 'lucide-react';
import type {
  ChangeKind, FileDiff, PullRequest,
} from '@entities/pr';
import { useTranslation } from '@shared/i18n';
import V2Card from '../ui/V2Card';

export default function FilesScene({
  pr, activeFilePath, onSelectFile, onToggleViewed,
}: {
  pr: PullRequest;
  activeFilePath: string | null;
  onSelectFile: (path: string) => void;
  onToggleViewed: (path: string, viewed: boolean) => void;
}) {
  const { t } = useTranslation('review');
  const sorted = useMemo(() => [...pr.files].sort((a, b) => (b.added + b.removed) - (a.added + a.removed)), [pr.files]);
  const totalDelta = pr.added + pr.removed;
  const viewedCount = pr.files.filter((f) => f.viewed).length;

  return (
    <V2Card className="p-5">
      <div className="flex items-center gap-2">
        <FileCode className="w-3.5 h-3.5 text-white/55" />
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">
          Files
        </span>
        <span className="text-[10px] font-mono text-white/40">
          {pr.files.length} files · {viewedCount} viewed · +{pr.added} / −{pr.removed}
        </span>
      </div>

      {sorted.length === 0 ? (
        <div className="mt-4 text-[12px] italic text-white/40">{t('empty.noFiles')}</div>
      ) : (
        <ul className="mt-3 space-y-1">
          {sorted.slice(0, 10).map((f) => (
            <FileScannerRow
              key={f.path}
              f={f}
              totalDelta={totalDelta}
              active={f.path === activeFilePath}
              onClick={() => { onSelectFile(f.path); }}
              onToggleViewed={() => { onToggleViewed(f.path, !f.viewed); }}
            />
          ))}
          {sorted.length > 10 && (
            <li className="px-2 py-1 text-[11px] font-mono text-white/40">
              +{String(sorted.length - 10)} more files…
            </li>
          )}
        </ul>
      )}
    </V2Card>
  );
}

function FileScannerRow({
  f, totalDelta, active, onClick, onToggleViewed,
}: {
  f: FileDiff;
  totalDelta: number;
  active: boolean;
  onClick: () => void;
  onToggleViewed: () => void;
}) {
  const total = f.added + f.removed;
  const ratio = totalDelta > 0 ? Math.min(1, total / totalDelta) : 0;
  return (
    <li
      className={`flex items-center gap-2 pl-2 pr-2 py-1.5 rounded-md transition-colors ${
        active ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
      } ${f.viewed ? 'opacity-50' : ''}`}
    >
      <button type="button" onClick={onClick} className="flex-1 min-w-0 flex items-center gap-2 text-left">
        <FileKindIcon kind={f.kind} />
        <span className="text-[12px] font-mono truncate text-white/85">{f.path}</span>
      </button>
      <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-mono tabular-nums">
        <span className="text-emerald-500/85">+{f.added}</span>
        <span className="text-rose-500/85">−{f.removed}</span>
      </span>
      <div className="shrink-0 w-[80px] h-1.5 rounded-full overflow-hidden bg-white/[0.04]">
        <div className="h-full" style={{ width: `${String(Math.round(ratio * 100))}%`, background: 'linear-gradient(90deg, #5fa86c, #7aa7d4)' }} />
      </div>
      <button
        type="button"
        onClick={onToggleViewed}
        className="shrink-0 p-1 rounded-md text-white/40 hover:text-white/85"
        title={f.viewed ? 'Mark not viewed' : 'Mark viewed'}
      >
        <Eye className="w-3 h-3" />
      </button>
    </li>
  );
}

function FileKindIcon({ kind }: { kind: ChangeKind }) {
  if (kind === 'added')   return <FilePlus    className="w-3 h-3 text-emerald-500 shrink-0" />;
  if (kind === 'deleted') return <FileMinus   className="w-3 h-3 text-rose-500    shrink-0" />;
  if (kind === 'renamed') return <FileSymlink className="w-3 h-3 text-white/40 shrink-0" />;
  return <FileCode className="w-3 h-3 text-white/40 shrink-0" />;
}
