import { useState } from 'react';
import { Check, MessageSquare, X } from 'lucide-react';
import { useTheme } from '@shared/theme';
import type { PullRequest, ReviewVerdict } from '@entities/pr';
import { useReviewStore } from '../model/store';

type Props = { pr: PullRequest };

type VerdictMeta = {
  label: string;
  color: string;
  Icon: typeof Check;
};

const VERDICTS: Record<ReviewVerdict, VerdictMeta> = {
  approve:           { label: 'Approve',         color: '#5fa86c', Icon: Check },
  comment:           { label: 'Comment',         color: '',        Icon: MessageSquare },
  'request-changes': { label: 'Request changes', color: '#c25a55', Icon: X },
};

const ORDER: ReviewVerdict[] = ['approve', 'comment', 'request-changes'];

/** Compact action bar that opens an inline composer when a verdict is picked. */
export default function ReviewActionBar({ pr }: Props) {
  const { isDark } = useTheme();
  const submitReview = useReviewStore((s) => s.submitReview);

  const [pending, setPending] = useState<ReviewVerdict | null>(null);
  const [body, setBody] = useState('');

  const cancel = () => {
    setPending(null);
    setBody('');
  };

  const submit = () => {
    if (!pending) return;
    submitReview(pr.number, pending, body);
    cancel();
  };

  const neutralFg = isDark ? 'text-white/70' : 'text-black/70';
  const neutralBorder = isDark ? 'border-white/15' : 'border-black/15';
  const neutralHover = isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-black/[0.04]';
  const surface = isDark ? 'bg-white/[0.03]' : 'bg-black/[0.02]';

  return (
    <div className={`flex flex-col gap-2 rounded-md border ${neutralBorder} ${surface} p-2`}>
      <div className="flex items-center gap-1.5">
        {ORDER.map((v) => {
          const meta = VERDICTS[v];
          const active = pending === v;
          const accent = meta.color || (isDark ? '#ffffff' : '#000000');
          return (
            <button
              key={v}
              type="button"
              onClick={() => { setPending(active ? null : v); }}
              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] font-bold transition-colors ${
                active ? '' : neutralHover
              } ${neutralBorder} ${neutralFg}`}
              style={
                active
                  ? { borderColor: accent, color: accent, background: `${accent}1a` }
                  : undefined
              }
            >
              <meta.Icon className="w-3 h-3" style={{ color: meta.color || undefined }} />
              {meta.label}
            </button>
          );
        })}
      </div>

      {pending !== null && (
        <div className="flex flex-col gap-1.5">
          <textarea
            value={body}
            onChange={(e) => { setBody(e.target.value); }}
            placeholder={
              pending === 'request-changes'
                ? 'Describe the changes needed…'
                : pending === 'approve'
                  ? 'Optional approval note…'
                  : 'Leave a review comment…'
            }
            rows={3}
            className={`w-full resize-y rounded-md border px-2 py-1.5 text-[11px] font-mono ${neutralBorder} ${
              isDark ? 'bg-black/30 text-white/85 placeholder:text-white/30' : 'bg-white/70 text-black/85 placeholder:text-black/30'
            } focus:outline-none focus:ring-1 focus:ring-current`}
          />
          <div className="flex justify-end gap-1.5">
            <button
              type="button"
              onClick={cancel}
              className={`px-2 py-1 rounded-md border text-[11px] font-bold ${neutralBorder} ${neutralFg} ${neutralHover}`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={pending === 'request-changes' && body.trim().length === 0}
              className="px-2 py-1 rounded-md text-[11px] font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: VERDICTS[pending].color || '#3a3a3a' }}
            >
              Submit review
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
