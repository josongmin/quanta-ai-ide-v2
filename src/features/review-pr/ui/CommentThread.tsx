import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { Comment, LineThread } from '@entities/pr';
import { useTranslation } from '@shared/i18n';
import Avatar from './Avatar';

type Props = {
  thread: LineThread;
  onReply: (body: string) => void;
  onResolve: (resolved: boolean) => void;
  isDark: boolean;
};

function formatTimestamp(iso: string): string {
  // Defensive — sample data and store both emit ISO, but corrupt input
  // shouldn't crash the bubble.
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/** Stack of avatar-prefixed comment bubbles + a reply composer.
    Resolved threads render a dimmed pill that toggles back to open. */
export default function CommentThread({ thread, onReply, onResolve, isDark }: Props) {
  const { t } = useTranslation('diff');
  const [draft, setDraft] = useState('');

  const send = () => {
    const body = draft.trim();
    if (body.length === 0) return;
    onReply(body);
    setDraft('');
  };

  const border = isDark ? 'border-white/10' : 'border-black/10';
  const surface = isDark ? 'bg-white/[0.03]' : 'bg-black/[0.02]';
  const muted = isDark ? 'text-white/40' : 'text-black/40';
  const fg = isDark ? 'text-white/85' : 'text-black/85';

  return (
    <div className={`relative rounded-md border ${border} ${surface} p-2 ${thread.resolved ? 'opacity-70' : ''}`}>
      {thread.resolved && (
        <button
          type="button"
          onClick={() => { onResolve(false); }}
          className={`absolute top-1.5 right-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border ${border} text-[9px] font-bold ${muted} hover:opacity-100`}
          title={t('thread.reopen')}
        >
          <CheckCircle2 className="w-2.5 h-2.5" />
          resolved
        </button>
      )}

      <div className="flex flex-col gap-1.5">
        {thread.comments.map((c) => (
          <Bubble key={c.id} comment={c} isDark={isDark} />
        ))}
      </div>

      <div className={`mt-2 pt-2 border-t ${border} flex flex-col gap-1.5`}>
        <textarea
          value={draft}
          onChange={(e) => { setDraft(e.target.value); }}
          placeholder="Reply…"
          rows={2}
          className={`w-full resize-y rounded-md border px-2 py-1 text-[11px] font-mono ${border} ${
            isDark ? 'bg-black/30 placeholder:text-white/30' : 'bg-white/70 placeholder:text-black/30'
          } ${fg} focus:outline-none focus:ring-1 focus:ring-current`}
        />
        <div className="flex justify-between items-center gap-1.5">
          {!thread.resolved ? (
            <button
              type="button"
              onClick={() => { onResolve(true); }}
              className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${border} ${muted} hover:${fg}`}
            >
              Resolve
            </button>
          ) : <span />}
          <button
            type="button"
            onClick={send}
            disabled={draft.trim().length === 0}
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed ${
              isDark ? 'bg-white/15 hover:bg-white/20' : 'bg-black/70 hover:bg-black/80'
            }`}
          >
            Reply
          </button>
        </div>
      </div>
    </div>
  );
}

function Bubble({ comment, isDark }: { comment: Comment; isDark: boolean }) {
  const fg = isDark ? 'text-white/85' : 'text-black/85';
  const muted = isDark ? 'text-white/40' : 'text-black/40';
  const bubbleBg = isDark ? 'bg-white/[0.04]' : 'bg-black/[0.04]';
  return (
    <div className="flex items-start gap-1.5">
      <Avatar login={comment.authorLogin} size={20} />
      <div className={`flex-1 min-w-0 rounded-md px-2 py-1 ${bubbleBg}`}>
        <div className="flex items-baseline gap-1.5">
          <span className={`text-[11px] font-bold ${fg}`}>@{comment.authorLogin}</span>
          <span className={`text-[9px] tabular-nums ${muted}`}>{formatTimestamp(comment.createdAt)}</span>
        </div>
        <div className={`text-[11px] font-mono whitespace-pre-wrap break-words ${fg}`}>
          {comment.body}
        </div>
      </div>
    </div>
  );
}
