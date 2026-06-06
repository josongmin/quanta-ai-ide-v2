// Keyboard navigation + cursor management for the control palette.
//
// The palette keeps two parallel views of the same ranked result set:
//   • a flat list, indexed by a single global cursor for ↑↓/Enter, and
//   • a sectioned list (Recent / Navigate / Action) for rendering.
//
// This hook owns the cursor, derives both views from the ranked input,
// and exposes the keydown handler that drives ↑↓ wrap-around, Enter to
// run, and Escape to close. It also resets the cursor whenever the
// filtered list shape changes and scrolls the highlighted row into view.

import { useEffect, useMemo, useState, type RefObject } from 'react';
import type { Command } from '../model/types';

export type Section = {
  id: 'recent' | 'navigate' | 'action';
  items: Command[];
  baseIndex: number; // first row's flat-cursor index
}

function sectionize(commands: Command[]): Section[] {
  const recent: Command[] = [];
  const nav: Command[] = [];
  const action: Command[] = [];
  for (const c of commands) {
    if (c.kind === 'recent') recent.push(c);
    else if (c.kind === 'navigate') nav.push(c);
    else action.push(c);
  }
  const out: Section[] = [];
  let base = 0;
  if (recent.length > 0) { out.push({ id: 'recent', items: recent, baseIndex: base }); base += recent.length; }
  if (nav.length > 0)    { out.push({ id: 'navigate', items: nav, baseIndex: base }); base += nav.length; }
  if (action.length > 0) { out.push({ id: 'action',   items: action, baseIndex: base }); }
  return out;
}

type Options = {
  // Ranked commands (already filtered by the matcher) in flat order.
  ranked: Command[];
  // The scroll container holding the rendered rows.
  listRef: RefObject<HTMLDivElement | null>;
  onRun: (cmd: Command) => void;
  onClose: () => void;
};

type Result = {
  sections: Section[];
  cursor: number;
  setCursor: (index: number) => void;
  // Call when the query changes to snap the highlight back to the top.
  resetCursor: () => void;
  onKey: (e: React.KeyboardEvent<HTMLInputElement>) => void;
};

export function usePaletteKeyboardNav({ ranked, listRef, onRun, onClose }: Options): Result {
  const [cursor, setCursor] = useState(0);

  // Sectioned, ranked result list. We separate the cursor index from
  // the section structure: the list is flat for keyboard, sectioned
  // for rendering.
  const sections = useMemo(() => sectionize(ranked), [ranked]);
  const flat = useMemo(() => sections.flatMap((s) => s.items), [sections]);

  const [prevFlatLen, setPrevFlatLen] = useState(flat.length);
  if (prevFlatLen !== flat.length) {
    setPrevFlatLen(flat.length);
    setCursor((c) => Math.min(c, Math.max(0, flat.length - 1)));
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => (flat.length === 0 ? 0 : (c + 1) % flat.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => (flat.length === 0 ? 0 : (c - 1 + flat.length) % flat.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = flat[cursor];
      if (target) onRun(target);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }

  // Scroll the highlighted row into view as the cursor moves.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-cursor="${String(cursor)}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [cursor, listRef]);

  return {
    sections,
    cursor,
    setCursor,
    resetCursor: () => { setCursor(0); },
    onKey,
  };
}
