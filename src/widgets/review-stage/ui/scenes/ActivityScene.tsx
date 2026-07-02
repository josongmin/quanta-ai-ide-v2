import { useState, type MutableRefObject } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import {
  displayName,
  type PullRequest,
} from '@entities/pr';
import { Avatar, useReviewStore, viewerLogin } from '@features/review-pr';
import { Badge } from '@shared/ui/Badge';
import { timeAgo } from '../../lib/reviewStageFormatting';
import { SceneHeader, V2Card } from '../ReviewSurface';

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
            <Badge
              variant={
                item.verdict === 'approve' ? 'success'
                  : item.verdict === 'request-changes' ? 'danger'
                    : 'neutral'
              }
              fill="soft"
            >
              {item.verdict}
            </Badge>
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
