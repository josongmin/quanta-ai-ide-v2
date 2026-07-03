// ─────────────────────────────────────────────────────────────────────────
// ShareViewButton — share-link button next to the SavedViews "저장"
// affordance. Generates a URL hash containing (scope, query) and
// copies it to the clipboard. Pairs with the consumer-side handler
// (in LeftQueue) that reads `window.location.hash` on mount and applies
// the recipe.
//
// Why a copy-link, not a "share via Slack" picker:
//
//   • Krug (2014) — the cheapest collab affordance is a string the
//     user can paste anywhere. No integration surface required.
//   • Sadowski et al. (Google 2018) — async coordination friction
//     drops the most when "show me what you're looking at" becomes
//     a 1-second action.
//
// State machine: idle → copied (1.6s) → idle. The button label flips
// during the "copied" window so the user gets visual confirmation
// without a toast.
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { Check, Link2 } from 'lucide-react';
import { buildShareUrl, copyToClipboard } from '../lib/viewShare';
import type { QueueScope } from './LeftQueue';

type Props = {
  scope: QueueScope;
  query: string;
};

export default function ShareViewButton({ scope, query }: Props) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
  }, []);

  const onClick = async (): Promise<void> => {
    const url = buildShareUrl({ scope, query });
    const ok = await copyToClipboard(url);
    if (!ok) return;
    setCopied(true);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => { setCopied(false); }, 1600);
  };

  return (
    <button
      type="button"
      onClick={() => { void onClick(); }}
      title={copied ? '클립보드에 복사됨' : '이 뷰의 공유 링크 복사'}
      className="shrink-0 inline-flex items-center gap-1 h-6 px-2 rounded-full text-xs font-mono transition-colors"
      style={{
        background: copied ? 'color-mix(in srgb, var(--intent-success-fg) 18%, transparent)' : 'var(--bg-surface-muted)',
        border: copied
          ? '1px solid color-mix(in srgb, var(--intent-success-fg) 45%, transparent)'
          : '1px dashed var(--border-default)',
        color: copied ? 'var(--intent-success-fg)' : 'var(--fg-muted)',
      }}
    >
      {copied
        ? <><Check className="w-2.5 h-2.5" strokeWidth={2.5} />복사됨</>
        : <><Link2 className="w-2.5 h-2.5" strokeWidth={2.2} />공유</>}
    </button>
  );
}
