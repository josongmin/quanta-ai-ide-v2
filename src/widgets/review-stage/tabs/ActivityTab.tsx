import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import type { PullRequest } from '@entities/pr';
import {
  ConversationLog, ReviewActionBar, useReviewStore, viewerLogin,
} from '@features/review-pr';
import { useTranslation } from '@shared/i18n';

type Props = {
  pr: PullRequest;
  isDark: boolean;
};

/** Imperative handle so the keyboard hook can `r → focus composer`. */
export type ActivityTabHandle = {
  focusComposer: () => void;
};

const ActivityTab = forwardRef<ActivityTabHandle, Props>(function ActivityTab(
  { pr, isDark }, ref,
) {
  const { t } = useTranslation('review');
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  useImperativeHandle(ref, () => ({
    focusComposer: () => {
      composerRef.current?.focus();
    },
  }), []);

  const postPrComment = useReviewStore((s) => s.postPrComment);
  const [draft, setDraft] = useState('');

  function send() {
    const trimmed = draft.trim();
    if (trimmed.length === 0) return;
    postPrComment(pr.number, trimmed, viewerLogin);
    setDraft('');
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      send();
    }
  }

  const card = isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white border-black/5';
  const inputBg = isDark
    ? 'bg-white/[0.04] text-white/85 placeholder:text-white/40 border-white/10'
    : 'bg-black/[0.03] text-black/85 placeholder:text-black/40 border-black/10';
  const muted = isDark ? 'text-white/40' : 'text-black/40';

  return (
    <div className="space-y-4">
      <ReviewActionBar pr={pr} />

      <section className={`rounded-xl border ${card} p-4`}>
        <div className={`mb-3 text-[10px] font-bold uppercase tracking-[0.18em] ${muted}`}>
          Conversation
        </div>
        <ConversationLog items={pr.conversation} />
      </section>

      <section className={`rounded-xl border ${card} p-3`}>
        <textarea
          ref={composerRef}
          value={draft}
          onChange={(e) => { setDraft(e.target.value); }}
          onKeyDown={onKeyDown}
          placeholder={t('comment.prPlaceholder')}
          rows={3}
          className={`w-full px-2 py-1.5 rounded-md border text-[12px] font-mono resize-y outline-none focus:ring-1 focus:ring-current ${inputBg}`}
        />
        <div className="flex items-center justify-between mt-2">
          <span className={`text-[10px] font-mono ${muted}`}>⌘↵ to send</span>
          <button
            type="button"
            onClick={send}
            disabled={draft.trim().length === 0}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-bold transition-colors ${
              draft.trim().length === 0
                ? (isDark ? 'bg-white/[0.04] text-white/30 cursor-not-allowed' : 'bg-black/[0.04] text-black/30 cursor-not-allowed')
                : (isDark ? 'bg-white text-black hover:bg-white/90' : 'bg-black text-white hover:bg-black/90')
            }`}
          >
            <Send className="w-3 h-3" />
            Comment
          </button>
        </div>
      </section>
    </div>
  );
});

export default ActivityTab;
