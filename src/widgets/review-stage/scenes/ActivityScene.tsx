// ─────────────────────────────────────────────────────────────────────────
// ACTIVITY SCENE — conversation + composer
//
// Compact conversation rendering — we keep the surface in this file rather
// than reusing ConversationLog so the dark tokens stay consistent. The
// events list is short (≤ 20 typical), so a fresh implementation reads
// cleaner than threading isDark+styles through the legacy widget.
// ─────────────────────────────────────────────────────────────────────────

import { useState, type MutableRefObject } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import {
  displayName,
  type PullRequest,
} from '@entities/pr';
import { Avatar, useReviewStore, viewerLogin } from '@features/review-pr';
import { useTranslation } from '@shared/i18n';
import { OK, SEV } from '../lib/tones';
import { timeAgo } from '../lib/format';
import V2Card from '../ui/V2Card';
import SceneHeader from '../ui/SceneHeader';

export default function ActivityScene({
  pr, composerRef,
}: {
  pr: PullRequest;
  composerRef: MutableRefObject<HTMLTextAreaElement | null>;
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
      <SceneHeader icon={MessageSquare} title="Activity" hint={`${String(pr.conversation.length)} events · ${String(pr.threads.reduce((n, t) => n + t.comments.length, 0))} thread comments`} />

      <ul className="mt-3 space-y-2">
        {pr.conversation.length === 0 ? (
          <li className="text-[12px] italic text-white/40">{tr('empty.noActivity')}</li>
        ) : (
          pr.conversation.map((it) => <ActivityRow key={it.id} item={it} />)
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

function ActivityRow({ item }: { item: PullRequest['conversation'][number] }) {
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
  const verdictColor = !isReview ? 'rgba(255,255,255,0.10)'
    : item.verdict === 'approve' ? OK
    : item.verdict === 'request-changes' ? SEV.blocker
    : '#8b949e';
  // Verdict signal carried by the in-row pill below (line ~110), not a
  // left-edge stripe — the project explicitly forbids accent stripes on
  // list rows.
  return (
    <li className="flex items-start gap-2 px-3 py-2 rounded-lg bg-white/[0.025]">
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
