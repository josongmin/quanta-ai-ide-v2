import { useCallback, useEffect, useRef, useState } from 'react';
import {
  findMentionAtCaret,
  type MentionItem, type MentionTrigger,
} from '../palette/MentionPicker';

type Mention = { trigger: MentionTrigger; query: string; start: number };

// Mention picker state. We probe the textarea's caret position on every
// change/selection event; when the caret sits inside a `#…` or `@…`
// token, `mention` becomes non-null and the picker renders.
//
// Extracted from Composer.tsx without behavioural change — same effect
// dependency array, same requestAnimationFrame caret restoration, same
// leading-space heuristic in insertTrigger.
export function useMentionPicker(
  taRef: React.RefObject<HTMLTextAreaElement | null>,
  draft: string,
  onChange: (v: string) => void,
) {
  const [caret, setCaret] = useState(0);
  const [mention, setMention] = useState<Mention | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const mentionItemsRef = useRef<MentionItem[]>([]);
  const setMentionItems = useCallback((items: MentionItem[]) => {
    mentionItemsRef.current = items;
  }, []);

  // Recompute mention region whenever draft or caret moves. The trigger
  // is the textarea's caret — not a React-owned value — so an effect is
  // the right place to mirror it back into state for rendering the picker.
  /* eslint-disable react-hooks/set-state-in-effect -- mirroring DOM caret state */
  useEffect(() => {
    const next = findMentionAtCaret(draft, caret);
    if (!next) { setMention(null); return; }
    setMention(next);
    setMentionIndex(0);
  }, [draft, caret]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Replace the active mention region with the picked label. Adds a
  // trailing space so the user can keep typing without manual spacing.
  const applyMention = useCallback((item: MentionItem) => {
    if (!mention) return;
    const label = item.kind === 'file' ? item.path : item.name;
    const before = draft.slice(0, mention.start);
    const after = draft.slice(caret);
    const insertion = `${mention.trigger}${label} `;
    const next = before + insertion + after;
    onChange(next);
    const nextCaret = before.length + insertion.length;
    setMention(null);
    // Restore caret on the next frame; React will have re-rendered with
    // the new value but the textarea's selection survives only after
    // value is in the DOM.
    requestAnimationFrame(() => {
      const ta = taRef.current;
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(nextCaret, nextCaret);
      setCaret(nextCaret);
    });
  }, [mention, draft, caret, onChange, taRef]);

  // Insert a trigger character into the textarea at caret. Used by the
  // `#`/`@` ToolBtns so they actually do something.
  const insertTrigger = useCallback((trigger: MentionTrigger) => {
    const ta = taRef.current;
    const c = ta?.selectionStart ?? caret ?? draft.length;
    const before = draft.slice(0, c);
    const after = draft.slice(c);
    // Add a leading space if we're not at start/whitespace, so the
    // trigger can be recognised by `findMentionAtCaret`.
    const needsSpace = before.length > 0 && !/[\s]$/.test(before);
    const insertion = `${needsSpace ? ' ' : ''}${trigger}`;
    onChange(before + insertion + after);
    const nextCaret = before.length + insertion.length;
    requestAnimationFrame(() => {
      taRef.current?.focus();
      taRef.current?.setSelectionRange(nextCaret, nextCaret);
      setCaret(nextCaret);
    });
  }, [draft, caret, onChange, taRef]);

  // Track caret on selection / click / arrow keys without relying on
  // every onKeyDown firing.
  function syncCaret() {
    const ta = taRef.current;
    if (!ta) return;
    setCaret(ta.selectionStart ?? 0);
  }

  return {
    caret,
    setCaret,
    mention,
    setMention,
    mentionIndex,
    setMentionIndex,
    mentionItemsRef,
    setMentionItems,
    applyMention,
    insertTrigger,
    syncCaret,
  };
}
