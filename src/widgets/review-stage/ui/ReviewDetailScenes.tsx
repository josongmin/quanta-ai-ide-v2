import { useMemo, useState, type MutableRefObject } from 'react';
import {
  Activity, Check, Clock, Eye, FileCode, FileMinus, FilePlus,
  FileSymlink, Loader2, MessageSquare, MinusCircle, RefreshCw, Send, X,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import {
  coverageDeltas,
  displayName,
  prodCorrelations,
  type ChangeKind,
  type CheckRun,
  type CheckStatus,
  type FileDiff,
  type PullRequest,
} from '@entities/pr';
import type { RepoData } from '@entities/repo';
import { Avatar, useReviewStore, viewerLogin } from '@features/review-pr';
import { formatDuration, timeAgo } from '../lib/reviewStageFormatting';
import HunkNavigator from './HunkNavigator';
import { SceneHeader, V2Card } from './ReviewSurface';

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

export function ChecksScene({
  pr,
  blockerColor,
}: {
  pr: PullRequest;
  blockerColor: string;
}) {
  const { t } = useTranslation('review');
  if (pr.checks.length === 0) {
    return (
      <V2Card className="p-5">
        <SceneHeader icon={Activity} title="CI checks" />
        <div className="mt-3 text-[12px] italic text-[var(--fg-subtle)]">{t('empty.noCi')}</div>
      </V2Card>
    );
  }

  return (
    <V2Card className="p-5">
      <SceneHeader icon={Activity} title="CI checks" hint={`${String(pr.checks.length)} runs`} />
      <ul className="mt-3 divide-y divide-[var(--border-muted)]">
        {pr.checks.map((c) => (
          <CheckRow key={c.id} c={c} blockerColor={blockerColor} />
        ))}
      </ul>
    </V2Card>
  );
}

function CheckRow({
  c,
  blockerColor,
}: {
  c: CheckRun;
  blockerColor: string;
}) {
  const meta = CHECK_META[c.status];
  return (
    <li className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-x-4 py-2">
      <div className="min-w-0">
        <div className="text-[12px] font-mono truncate text-[var(--fg-strong)]">{c.name}</div>
        {c.summary !== null && c.summary.length > 0 && (
          <div className="text-[11px] truncate text-[var(--fg-subtle)]">{c.summary}</div>
        )}
      </div>
      <span
        className="inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[var(--track-eyebrow)]"
        style={{
          background: c.required ? `color-mix(in srgb, ${blockerColor} 10%, transparent)` : 'var(--bg-active)',
          color: c.required ? blockerColor : 'var(--fg-muted)',
        }}
      >
        {c.required ? 'Required' : 'Optional'}
      </span>
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-[var(--track-eyebrow)]"
        style={{ background: `color-mix(in srgb, ${meta.color} 15%, transparent)`, color: meta.color }}
      >
        <meta.Icon className={`w-2.5 h-2.5 ${c.status === 'running' ? 'animate-spin' : ''}`} />
        {meta.label}
      </span>
      <span className="text-right text-[11px] font-mono tabular-nums text-[var(--fg-subtle)]">
        {formatDuration(c.durationMs)}
      </span>
      <button
        type="button"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-[var(--bg-elevated)] text-[var(--fg-default)] hover:bg-[var(--bg-active)]"
      >
        <RefreshCw className="w-3 h-3" />
        Re-run
      </button>
    </li>
  );
}

const CHECK_META: Record<CheckStatus, { label: string; color: string; Icon: LucideIcon }> = {
  pending: { label: 'Pending', color: 'var(--fg-muted)', Icon: Clock },
  running: { label: 'Running', color: 'var(--intent-warn-fg)', Icon: Loader2 },
  success: { label: 'Success', color: 'var(--intent-success-fg)', Icon: Check },
  failure: { label: 'Failure', color: 'var(--intent-danger-fg)', Icon: X },
  cancelled: { label: 'Cancelled', color: 'var(--fg-muted)', Icon: MinusCircle },
  skipped: { label: 'Skipped', color: 'var(--fg-muted)', Icon: MinusCircle },
};

export function ActivityScene({
  pr,
  composerRef,
  blockerColor,
}: {
  pr: PullRequest;
  composerRef: MutableRefObject<HTMLTextAreaElement | null>;
  blockerColor: string;
}) {
  const { t: tr } = useTranslation('review');
  const postPrComment = useReviewStore((s) => s.postPrComment);
  const [draft, setDraft] = useState('');

  const send = () => {
    const txt = draft.trim();
    if (txt.length === 0) return;
    postPrComment(pr.number, txt, viewerLogin);
    setDraft('');
  };

  return (
    <V2Card className="p-5">
      <SceneHeader
        icon={MessageSquare}
        title="Activity"
        hint={`${String(pr.conversation.length)} events · ${String(pr.threads.reduce((n, t) => n + t.comments.length, 0))} thread comments`}
      />

      <ul className="mt-3 space-y-2">
        {pr.conversation.length === 0 ? (
          <li className="text-[12px] italic text-[var(--fg-subtle)]">{tr('empty.noActivity')}</li>
        ) : (
          pr.conversation.map((it) => (
            <ActivityRow key={it.id} item={it} blockerColor={blockerColor} />
          ))
        )}
      </ul>

      <div className="mt-4 rounded-lg border border-[var(--border-default)] p-3 bg-[var(--bg-surface-muted)]">
        <textarea
          ref={composerRef}
          value={draft}
          onChange={(e) => { setDraft(e.target.value); }}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); send(); }
          }}
          placeholder={tr('comment.placeholder')}
          rows={3}
          className="w-full px-2 py-1.5 rounded-md text-[12px] font-mono resize-y outline-none bg-[var(--bg-hover)] text-[var(--fg-strong)] placeholder:text-[var(--fg-subtle)] border border-[var(--border-default)]"
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] font-mono text-[var(--fg-subtle)]">⌘↵ to send · r to focus</span>
          <button
            type="button"
            onClick={send}
            disabled={draft.trim().length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-bold transition-colors bg-[var(--fg-strong)] text-[var(--fg-on-accent)] disabled:bg-[var(--bg-elevated)] disabled:text-[var(--fg-subtle)] disabled:cursor-not-allowed"
          >
            <Send className="w-3 h-3" />
            Comment
          </button>
        </div>
      </div>
    </V2Card>
  );
}

function ActivityRow({
  item,
  blockerColor,
}: {
  item: PullRequest['conversation'][number];
  blockerColor: string;
}) {
  if (item.kind === 'event') {
    return (
      <li className="flex items-center gap-2 text-[11px] text-[var(--fg-muted)]">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--fg-subtle)]" />
        <span className="font-mono text-[11px] text-[var(--fg-subtle)]">@{item.actorLogin}</span>
        <span className="text-[var(--fg-muted)]">{item.detail}</span>
        <span className="ml-auto text-[10px] font-mono text-[var(--fg-subtle)]">{timeAgo(item.createdAt)}</span>
      </li>
    );
  }

  const isReview = item.kind === 'review';
  const verdictColor = !isReview ? 'var(--border-strong)'
    : item.verdict === 'approve' ? 'var(--intent-success-fg)'
      : item.verdict === 'request-changes' ? blockerColor
        : 'var(--fg-muted)';

  return (
    <li
      className="flex items-start gap-2 px-3 py-2 rounded-lg bg-[var(--bg-surface-muted)]"
      style={{ borderLeft: `2px solid ${verdictColor}` }}
    >
      <Avatar login={item.authorLogin} size={20} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-bold text-[var(--fg-strong)]">{displayName(item.authorLogin)}</span>
          {isReview && (
            <span
              className="inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[var(--track-eyebrow)]"
              style={{ background: `color-mix(in srgb, ${verdictColor} 13%, transparent)`, color: verdictColor }}
            >
              {item.verdict}
            </span>
          )}
          <span className="ml-auto text-[10px] font-mono text-[var(--fg-subtle)]">{timeAgo(item.createdAt)}</span>
        </div>
        <div className="mt-0.5 text-[12px] leading-snug text-[var(--fg-default)] whitespace-pre-wrap break-words">
          {item.body}
        </div>
      </div>
    </li>
  );
}
