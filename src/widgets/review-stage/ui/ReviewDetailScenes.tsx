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
        <FileCode className="w-3.5 h-3.5 text-white/55" />
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">
          Files
        </span>
        <span className="text-[10px] font-mono text-white/40">
          {pr.files.length} files · {viewedCount} viewed · +{pr.added} / −{pr.removed}
        </span>
      </div>

      <HunkNavigator file={activeFile} />

      {sorted.length === 0 ? (
        <div className="mt-4 text-[12px] italic text-white/40">{t('empty.noFiles')}</div>
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
        active ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
      } ${f.viewed ? 'opacity-50' : ''}`}
    >
      <button type="button" onClick={onClick} className="flex-1 min-w-0 flex items-center gap-2 text-left">
        <FileKindIcon kind={f.kind} />
        <span className="text-[12px] font-mono truncate text-white/85">{f.path}</span>
        {isHot && (
          <span
            className="shrink-0 inline-flex items-center px-1 h-4 rounded-sm text-[9px] font-bold uppercase tracking-[0.18em]"
            title={`Hot-spot: ${String(f.hunks.length)} hunks · ${String(total)} LOC. Likely to hide regressions.`}
            style={{ background: 'rgba(168,137,58,0.18)', color: '#d3b264', border: '1px solid rgba(168,137,58,0.40)' }}
          >
            hot
          </span>
        )}
        {prodIncidents !== null && prodIncidents.length > 0 && (
          <span
            className="shrink-0 inline-flex items-center px-1 h-4 rounded-sm text-[9px] font-bold uppercase tracking-[0.18em]"
            title={`Overlaps ${String(prodIncidents.length)} prior incident${prodIncidents.length === 1 ? '' : 's'}: ${prodIncidents.join(', ')}`}
            style={{ background: 'rgba(194,90,85,0.16)', color: '#e88a85', border: '1px solid rgba(194,90,85,0.45)' }}
          >
            prod
          </span>
        )}
        {isTest && (
          <span
            className="shrink-0 inline-flex items-center px-1 h-4 rounded-sm text-[9px] font-bold uppercase tracking-[0.18em] text-white/40"
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
      <div className="shrink-0 w-[80px] h-1.5 rounded-full overflow-hidden bg-white/[0.04]">
        <div
          className="h-full"
          style={{
            width: `${String(Math.round(ratio * 100))}%`,
            background: isHot
              ? 'linear-gradient(90deg, #a8893a, #c25a55)'
              : 'linear-gradient(90deg, #5fa86c, #7aa7d4)',
          }}
        />
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
  if (kind === 'added') return <FilePlus className="w-3 h-3 shrink-0" style={{ color: 'var(--intent-success-vivid)' }} />;
  if (kind === 'deleted') return <FileMinus className="w-3 h-3 shrink-0" style={{ color: 'var(--intent-danger-vivid)' }} />;
  if (kind === 'renamed') return <FileSymlink className="w-3 h-3 text-white/40 shrink-0" />;
  return <FileCode className="w-3 h-3 text-white/40 shrink-0" />;
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
        <div className="mt-3 text-[12px] italic text-white/40">{t('empty.noCi')}</div>
      </V2Card>
    );
  }

  return (
    <V2Card className="p-5">
      <SceneHeader icon={Activity} title="CI checks" hint={`${String(pr.checks.length)} runs`} />
      <ul className="mt-3 divide-y divide-white/[0.04]">
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
        <div className="text-[12px] font-mono truncate text-white/85">{c.name}</div>
        {c.summary !== null && c.summary.length > 0 && (
          <div className="text-[11px] truncate text-white/40">{c.summary}</div>
        )}
      </div>
      <span
        className="inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.18em]"
        style={{
          background: c.required ? `${blockerColor}1a` : 'var(--bg-active)',
          color: c.required ? blockerColor : 'var(--fg-muted)',
        }}
      >
        {c.required ? 'Required' : 'Optional'}
      </span>
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-[0.18em]"
        style={{ background: `${meta.color}26`, color: meta.color }}
      >
        <meta.Icon className={`w-2.5 h-2.5 ${c.status === 'running' ? 'animate-spin' : ''}`} />
        {meta.label}
      </span>
      <span className="text-right text-[11px] font-mono tabular-nums text-white/40">
        {formatDuration(c.durationMs)}
      </span>
      <button
        type="button"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-white/[0.06] text-white/70 hover:bg-white/[0.10]"
      >
        <RefreshCw className="w-3 h-3" />
        Re-run
      </button>
    </li>
  );
}

const CHECK_META: Record<CheckStatus, { label: string; color: string; Icon: LucideIcon }> = {
  pending: { label: 'Pending', color: '#8b949e', Icon: Clock },
  running: { label: 'Running', color: '#a8893a', Icon: Loader2 },
  success: { label: 'Success', color: '#5fa86c', Icon: Check },
  failure: { label: 'Failure', color: '#c25a55', Icon: X },
  cancelled: { label: 'Cancelled', color: '#8b949e', Icon: MinusCircle },
  skipped: { label: 'Skipped', color: '#8b949e', Icon: MinusCircle },
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
          <li className="text-[12px] italic text-white/40">{tr('empty.noActivity')}</li>
        ) : (
          pr.conversation.map((it) => (
            <ActivityRow key={it.id} item={it} blockerColor={blockerColor} />
          ))
        )}
      </ul>

      <div className="mt-4 rounded-lg border border-white/10 p-3 bg-white/[0.02]">
        <textarea
          ref={composerRef}
          value={draft}
          onChange={(e) => { setDraft(e.target.value); }}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); send(); }
          }}
          placeholder={tr('comment.placeholder')}
          rows={3}
          className="w-full px-2 py-1.5 rounded-md text-[12px] font-mono resize-y outline-none bg-white/[0.04] text-white/85 placeholder:text-white/30 border border-white/10"
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] font-mono text-white/40">⌘↵ to send · r to focus</span>
          <button
            type="button"
            onClick={send}
            disabled={draft.trim().length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-bold transition-colors bg-white text-black disabled:bg-white/[0.06] disabled:text-white/30 disabled:cursor-not-allowed"
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
      <li className="flex items-center gap-2 text-[11px] text-white/55">
        <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
        <span className="font-mono text-[11px] text-white/40">@{item.actorLogin}</span>
        <span className="text-white/55">{item.detail}</span>
        <span className="ml-auto text-[10px] font-mono text-white/30">{timeAgo(item.createdAt)}</span>
      </li>
    );
  }

  const isReview = item.kind === 'review';
  const verdictColor = !isReview ? 'var(--border-strong)'
    : item.verdict === 'approve' ? '#5fa86c'
      : item.verdict === 'request-changes' ? blockerColor
        : '#8b949e';

  return (
    <li
      className="flex items-start gap-2 px-3 py-2 rounded-lg bg-white/[0.025]"
      style={{ borderLeft: `2px solid ${verdictColor}` }}
    >
      <Avatar login={item.authorLogin} size={20} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-bold text-white/85">{displayName(item.authorLogin)}</span>
          {isReview && (
            <span
              className="inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.18em]"
              style={{ background: `${verdictColor}22`, color: verdictColor }}
            >
              {item.verdict}
            </span>
          )}
          <span className="ml-auto text-[10px] font-mono text-white/40">{timeAgo(item.createdAt)}</span>
        </div>
        <div className="mt-0.5 text-[12px] leading-snug text-white/70 whitespace-pre-wrap break-words">
          {item.body}
        </div>
      </div>
    </li>
  );
}
