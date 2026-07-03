import { useCallback, useState } from 'react';

// Copy-to-clipboard with a transient "copied" flag. Replaces the
// writeText + setCopied(true) + setTimeout(reset) trio that was hand-rolled
// across ~9 settings/token/API pages.
//
//   const { copied, copy } = useCopyToClipboard();
//   <button onClick={() => copy(secret)}>{copied ? 'Copied' : 'Copy'}</button>
//
// The write is best-effort — a rejected clipboard permission is swallowed
// (matching every prior call site's empty catch); the flag still flips so the
// UI stays responsive. For per-item copied state, use one hook instance per row.
export function useCopyToClipboard(resetMs = 1500): {
  copied: boolean;
  copy: (text: string) => void;
} {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    (text: string) => {
      void navigator.clipboard?.writeText(text).catch(() => {
        /* clipboard unavailable / permission denied — flag still flips */
      });
      setCopied(true);
      window.setTimeout(() => { setCopied(false); }, resetMs);
    },
    [resetMs],
  );

  return { copied, copy };
}
