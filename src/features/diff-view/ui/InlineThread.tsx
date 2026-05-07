import { useState } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import { Avatar } from '@features/review-pr';
import type { LineThread } from '@entities/pr';
import InlineCommentComposer from './InlineCommentComposer';

type Props = {
  thread: LineThread;
  isDark: boolean;
  onReply: (threadId: string, body: string) => void;
  onResolveThread: (threadId: string, resolved: boolean) => void;
};

/**
 * Renders an existing line thread inline below the diff line it
 * anchors to. Each comment shows an Avatar, the body, and a relative
 * timestamp. A footer offers a reply composer and a resolve toggle.
 */
export default function InlineThread({
  thread,
  isDark,
  onReply,
  onResolveThread,
}: Props) {
  const [replying, setReplying] = useState(false);

  const surface = isDark
    ? 'bg-white/[0.03] border-white/10'
    : 'bg-black/[0.02] border-black/10';
  const textCls = isDark ? 'text-white/85' : 'text-black/85';
  const muted = isDark ? 'text-white/40' : 'text-black/40';
  const sub = isDark ? 'text-white/55' : 'text-black/55';
  const replyBtn = isDark
    ? 'text-white/55 hover:bg-white/5'
    : 'text-black/55 hover:bg-black/5';
  const resolveActive = thread.resolved
    ? 'text-[#4f9a5c] bg-[#4f9a5c]/10'
    : replyBtn;

  return (
    <div className={`mx-2 my-1 rounded-md border ${surface}`}>
      <ul className="divide-y divide-white/5">
        {thread.comments.map((c) => (
          <li key={c.id} className="flex gap-2 p-2">
            <Avatar login={c.authorLogin} size={20} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-[11px] font-bold ${textCls}`}>{c.authorLogin}</span>
                <span className={`text-[9px] uppercase tracking-[0.18em] ${muted}`}>
                  {formatRelative(c.createdAt)}
                </span>
                {c.resolved && (
                  <span className="text-[9px] uppercase tracking-[0.18em] font-bold text-[#4f9a5c]">
                    resolved
                  </span>
                )}
              </div>
              <div className={`text-[12px] leading-snug whitespace-pre-wrap ${sub}`}>
                {c.body}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className={`flex items-center justify-between px-2 py-1.5 border-t ${
        isDark ? 'border-white/10' : 'border-black/10'
      }`}>
        <button
          type="button"
          onClick={() => { setReplying((v) => !v); }}
          className={`text-[11px] font-bold px-2 py-1 rounded-md transition-colors ${replyBtn}`}
        >
          {replying ? 'Hide reply' : 'Reply'}
        </button>
        <button
          type="button"
          onClick={() => { onResolveThread(thread.id, !thread.resolved); }}
          className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-md transition-colors ${resolveActive}`}
          title={thread.resolved ? 'Reopen thread' : 'Mark as resolved'}
        >
          {thread.resolved ? <RotateCcw className="w-3 h-3" /> : <Check className="w-3 h-3" />}
          {thread.resolved ? 'Reopen' : 'Resolve'}
        </button>
      </div>

      {replying && (
        <InlineCommentComposer
          isDark={isDark}
          placeholder="Reply…"
          submitLabel="Reply"
          onSubmit={(body) => {
            onReply(thread.id, body);
            setReplying(false);
          }}
          onCancel={() => { setReplying(false); }}
        />
      )}
    </div>
  );
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Date.now() - then;
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${String(min)}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${String(hr)}h ago`;
  const days = Math.round(hr / 24);
  if (days < 30) return `${String(days)}d ago`;
  return new Date(iso).toLocaleDateString();
}
