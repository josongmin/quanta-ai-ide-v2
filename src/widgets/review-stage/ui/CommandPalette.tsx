// ─────────────────────────────────────────────────────────────────────────
// CommandPalette — Cmd/Ctrl-K omnibox over the active PR.
//
// Three result classes in a single fuzzy-ranked list:
//
//   • Files     — pr.files[*].path
//   • Symbols   — symbolChanges() output
//   • Findings  — engineFindings() output
//
// Why this is the right surface (objective grounding):
//
//   • Linear / Raycast / VSCode (industry baseline, 2024) — Cmd-K is
//     the de facto "I know what I want, take me there now" affordance
//     for power users. Reviewers who know they want
//     `auth.middleware.ts` shouldn't have to scroll a 30-file list.
//   • Hick's law: a single ranked list outperforms category tabs when
//     the user has a target in mind. Tabs are right for browsing; a
//     palette is right for direct lookup.
//   • Ranking model: substring match >> subsequence match >> nothing.
//     We boost by class (findings > symbols > files) only on ties,
//     so a typed "todo" finding ranks above a same-named file.
//
// Implementation: shared `<Modal>` (portal + scroll lock + Esc), and
// `useShortcut({ key: 'k', ctrl: true })` is the open trigger. The
// list itself is keyboard-only nav (↑↓ + Enter). `inputRef` autofocuses
// on open so the user types immediately.
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, FileCode, Code2, ShieldAlert, CornerDownLeft, Pin,
} from 'lucide-react';
import { engineFindings, type EngineFinding, type EngineSeverity, type PullRequest } from '@entities/pr';
import type { RepoData } from '@entities/repo';
import { Modal } from '@shared/ui';
import { useShortcut } from '@shared/lib';
import { symbolChanges, type SymbolChange } from '../lib/sota';
import { loadPins, togglePr as togglePrPin, isPrPinned } from '../lib/pinStore';

type Item =
  | { kind: 'file';    path: string; subtitle: string }
  | { kind: 'symbol';  path: string; name: string; change: SymbolChange['change']; sym: SymbolKindSig }
  | { kind: 'finding'; path: string; title: string; severity: EngineSeverity; rule: string; line: number | null };

type SymbolKindSig = SymbolChange['kind'];

const SEV_TONE: Record<EngineSeverity, string> = {
  blocker: '#c25a55', high: '#d98a85', medium: '#a8893a', low: '#5a8fce',
};

const KIND_TONE = {
  file:    '#7aa7d4',
  symbol:  '#9583b8',
  finding: '#c25a55',
} as const;

const KIND_LABEL = {
  file:    'file',
  symbol:  'symbol',
  finding: 'finding',
} as const;

type Props = {
  pr: PullRequest;
  repo: RepoData;
  onJumpToFile: (path: string) => void;
  onJumpToFindings: () => void;
};

export default function CommandPalette({ pr, repo, onJumpToFile, onJumpToFindings }: Props) {
  // openCount also tracks "this is the Nth open" so query/cursor key
  // off it: each new open re-derives a fresh empty state without an
  // effect-driven reset (React 19 set-state-in-effect rule).
  const [openCount, setOpenCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [queryState, setQueryState] = useState<{ openId: number; q: string }>({ openId: 0, q: '' });
  const [cursorState, setCursorState] = useState<{ openId: number; c: number }>({ openId: 0, c: 0 });
  // Pin state for the active PR — palette exposes a header-level pin
  // toggle so a reviewer can pin/unpin without going back to the queue.
  const [pinMap, setPinMap] = useState(() => loadPins());
  const isPinned = isPrPinned(pinMap, pr.number);
  const togglePin = (): void => { setPinMap((prev) => togglePrPin(prev, pr.number)); };
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const openPalette = (): void => {
    setOpenCount((n) => n + 1);
    setOpen(true);
  };
  // Cmd-K / Ctrl-K opens the palette regardless of focus context (the
  // useShortcut hook guards against typing-target collisions for
  // single-key shortcuts; a Cmd-modified one always fires).
  useShortcut({ key: 'k', ctrl: true, ignoreInputs: false }, openPalette);
  // Cmd-Shift-P — toggle pin on the active PR. Power-user binding,
  // wired even when the palette is closed so it works as a global
  // shortcut. Pinning is an idempotent action so even if a stray
  // press fires, the worst case is one toggle.
  useShortcut({ key: 'p', ctrl: true, shift: true, ignoreInputs: false }, togglePin);

  // Render-time normalisation: if the palette opened since these were
  // last written, treat them as their reset values (empty / 0). The
  // next user keystroke writes the new openCount into the state.
  const query = queryState.openId === openCount ? queryState.q : '';
  const cursor = cursorState.openId === openCount ? cursorState.c : 0;
  const setQuery = (q: string): void => {
    setQueryState({ openId: openCount, q });
    // Reset cursor on query change too.
    setCursorState({ openId: openCount, c: 0 });
  };
  const setCursor = (next: number | ((c: number) => number)): void => {
    setCursorState((prev) => {
      const base = prev.openId === openCount ? prev.c : 0;
      const value = typeof next === 'function' ? next(base) : next;
      return { openId: openCount, c: value };
    });
  };

  // Autofocus when palette opens. setTimeout-only effect — no setState
  // in the body, so the rule is satisfied.
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => { inputRef.current?.focus(); }, 0);
    return () => { window.clearTimeout(id); };
  }, [open, openCount]);

  // Build candidate pool whenever the active PR changes — the index
  // is small (typically <300 entries) so we don't bother memoising
  // the matcher itself.
  const candidates = useMemo<Item[]>(() => {
    const out: Item[] = [];
    for (const f of pr.files) {
      out.push({
        kind: 'file',
        path: f.path,
        subtitle: `+${String(f.added)} / −${String(f.removed)} · ${f.kind}`,
      });
    }
    for (const s of symbolChanges(pr)) {
      out.push({
        kind: 'symbol',
        path: s.filePath,
        name: s.name,
        change: s.change,
        sym: s.kind,
      });
    }
    for (const fnd of engineFindings(pr, repo)) {
      out.push({
        kind: 'finding',
        path: fnd.filePath,
        title: fnd.title,
        severity: fnd.severity,
        rule: `${fnd.category}/${fnd.rule}`,
        line: fnd.line,
      });
    }
    return out;
  }, [pr, repo]);

  const ranked = useMemo<{ item: Item; score: number }[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length === 0) {
      // Default ordering: findings (severity-sorted) → symbols → files.
      const findings = candidates.filter((c): c is Extract<Item, { kind: 'finding' }> => c.kind === 'finding')
        .sort((a, b) => sevRank(a.severity) - sevRank(b.severity));
      const symbols = candidates.filter((c) => c.kind === 'symbol');
      const files = candidates.filter((c) => c.kind === 'file');
      return [...findings, ...symbols, ...files].slice(0, 40).map((item) => ({ item, score: 1 }));
    }
    const scored: { item: Item; score: number }[] = [];
    for (const c of candidates) {
      const text = textFor(c).toLowerCase();
      const s = score(text, q);
      if (s > 0) scored.push({ item: c, score: s + classBoost(c.kind) });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 40);
  }, [candidates, query]);

  const visible = ranked;
  const safeCursor = visible.length === 0 ? 0 : Math.min(cursor, visible.length - 1);

  // Scroll-into-view for the active row when cursor changes via keys.
  useEffect(() => {
    if (visible.length === 0) return;
    const list = listRef.current;
    if (!list) return;
    const el = list.querySelector<HTMLElement>(`[data-idx="${String(safeCursor)}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [safeCursor, visible.length]);

  const choose = (item: Item): void => {
    setOpen(false);
    if (item.kind === 'finding') {
      onJumpToFindings();
      // Findings live in the engine scene; we still also point at the
      // file so the FilesScene's selection follows.
      onJumpToFile(item.path);
      return;
    }
    onJumpToFile(item.path);
  };

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(visible.length - 1, c + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const it = visible[safeCursor]?.item;
      if (it) choose(it);
    } else if (e.key === 'Tab') {
      // Tab cycles classes — convenience power-user binding.
      e.preventDefault();
      const cur = visible[safeCursor]?.item.kind ?? 'file';
      const order: Item['kind'][] = ['finding', 'symbol', 'file'];
      const next = order[(order.indexOf(cur) + 1) % order.length];
      const idx = visible.findIndex((v) => v.item.kind === next);
      if (idx >= 0) setCursor(idx);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => { setOpen(false); }}
      width={640}
      align="top"
      ariaLabel="Command palette"
    >
      <div
        className="flex flex-col"
        style={{
          background: 'var(--bg-elevated)',
          color: 'var(--fg-default)',
        }}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.08]">
          <Search className="w-4 h-4 text-white/45 shrink-0" strokeWidth={2} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); }}
            onKeyDown={onInputKey}
            placeholder="Jump to file, symbol, or finding…"
            className="flex-1 bg-transparent border-0 outline-none text-[13px] font-mono text-white/85 placeholder:text-white/30"
            aria-label="Search files, symbols, and findings"
            autoComplete="off"
            spellCheck={false}
          />
          <span className="shrink-0 text-[10px] font-mono text-white/30">
            {visible.length} {visible.length === 1 ? 'result' : 'results'}
          </span>
          <button
            type="button"
            onClick={togglePin}
            aria-pressed={isPinned}
            title={isPinned ? `#${String(pr.number)} 핀 해제 (⌘⇧P)` : `#${String(pr.number)} 핀 고정 (⌘⇧P)`}
            className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded transition-colors hover:bg-white/[0.04]"
            style={{
              color: isPinned ? '#c2b3e0' : 'var(--fg-muted)',
            }}
          >
            <Pin
              className="w-3 h-3"
              strokeWidth={2}
              style={isPinned ? { fill: '#c2b3e0' } : undefined}
            />
          </button>
        </div>

        <div
          ref={listRef}
          className="flex-1 max-h-[480px] overflow-auto p-1"
          role="listbox"
          aria-label="Search results"
        >
          {visible.length === 0 ? (
            <div className="px-3 py-6 text-center text-[12px] text-white/40">
              No matches.
            </div>
          ) : (
            visible.map((row, i) => (
              <PaletteRow
                key={`${row.item.kind}-${labelFor(row.item)}-${String(i)}`}
                idx={i}
                item={row.item}
                active={i === safeCursor}
                onMouseEnter={() => { setCursor(i); }}
                onClick={() => { choose(row.item); }}
              />
            ))
          )}
        </div>

        <div className="px-4 py-2 border-t border-white/[0.08] flex items-center gap-3 text-[10px] font-mono text-white/35">
          <span className="inline-flex items-center gap-1.5">
            <kbd className="px-1 rounded bg-white/[0.06] border border-white/[0.10]">↑</kbd>
            <kbd className="px-1 rounded bg-white/[0.06] border border-white/[0.10]">↓</kbd>
            navigate
          </span>
          <span className="inline-flex items-center gap-1.5">
            <kbd className="px-1 rounded bg-white/[0.06] border border-white/[0.10]">⏎</kbd>
            open
          </span>
          <span className="inline-flex items-center gap-1.5">
            <kbd className="px-1 rounded bg-white/[0.06] border border-white/[0.10]">⇥</kbd>
            cycle class
          </span>
          <span className="inline-flex items-center gap-1.5">
            <kbd className="px-1 rounded bg-white/[0.06] border border-white/[0.10]">⌘⇧P</kbd>
            pin
          </span>
          <span className="ml-auto inline-flex items-center gap-1.5">
            <kbd className="px-1 rounded bg-white/[0.06] border border-white/[0.10]">esc</kbd>
            close
          </span>
        </div>
      </div>
    </Modal>
  );
}

function PaletteRow({
  item, active, idx, onMouseEnter, onClick,
}: {
  item: Item;
  active: boolean;
  idx: number;
  onMouseEnter: () => void;
  onClick: () => void;
}) {
  const tone = KIND_TONE[item.kind];
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      data-idx={idx}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors"
      style={{
        background: active ? 'rgba(122,167,212,0.12)' : 'transparent',
        border: active ? '1px solid rgba(122,167,212,0.45)' : '1px solid transparent',
      }}
    >
      <span
        className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded"
        style={{ background: `${tone}1a`, color: tone, border: `1px solid ${tone}40` }}
      >
        <RowIcon kind={item.kind} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] font-mono text-white/85 truncate">
          {labelFor(item)}
        </span>
        <span className="block text-[10px] font-mono text-white/45 truncate">
          {sublabelFor(item)}
        </span>
      </span>
      <span
        className="shrink-0 text-[9px] font-bold uppercase tracking-[0.16em]"
        style={{ color: tone }}
      >
        {KIND_LABEL[item.kind]}
      </span>
      {active && (
        <CornerDownLeft className="shrink-0 w-3 h-3 text-white/55" />
      )}
    </button>
  );
}

function RowIcon({ kind }: { kind: Item['kind'] }) {
  if (kind === 'file') return <FileCode className="w-3 h-3" strokeWidth={2} />;
  if (kind === 'symbol') return <Code2 className="w-3 h-3" strokeWidth={2} />;
  return <ShieldAlert className="w-3 h-3" strokeWidth={2} />;
}

function labelFor(it: Item): string {
  if (it.kind === 'file') return it.path;
  if (it.kind === 'symbol') return it.name;
  return it.title;
}

function sublabelFor(it: Item): string {
  if (it.kind === 'file') return it.subtitle;
  if (it.kind === 'symbol') return `${it.sym} · ${it.change} · ${it.path}`;
  const lineSuffix = it.line !== null ? `:${String(it.line)}` : '';
  const tone = SEV_TONE[it.severity];
  return `${it.severity} · ${it.rule} · ${it.path}${lineSuffix}` + (tone ? '' : '');
}

function textFor(it: Item): string {
  if (it.kind === 'file') return it.path;
  if (it.kind === 'symbol') return `${it.name} ${it.path}`;
  return `${it.title} ${it.rule} ${it.path}`;
}

// ── Ranking ──────────────────────────────────────────────────────────────

function classBoost(kind: Item['kind']): number {
  if (kind === 'finding') return 0.3;
  if (kind === 'symbol') return 0.15;
  return 0;
}

// Score = best of:
//   • exact substring match (high)
//   • prefix match on a path segment (mid)
//   • subsequence match (low, fall-through)
function score(text: string, q: string): number {
  if (q.length === 0) return 0;
  const idx = text.indexOf(q);
  if (idx === 0) return 5; // strong prefix
  if (idx > 0) return 4 - Math.min(3, idx / 30); // substring, earlier = better
  const seg = text.split(/[/.]/).find((s) => s.startsWith(q));
  if (seg !== undefined) return 3;
  // Subsequence — every char of q in order in text.
  let i = 0;
  for (const ch of text) {
    if (ch === q[i]) i += 1;
    if (i === q.length) return 1.5;
  }
  return 0;
}

function sevRank(s: EngineSeverity): number {
  return { blocker: 0, high: 1, medium: 2, low: 3 }[s];
}

// Re-export so consumers can pick the same finding shape downstream.
export type CommandPaletteItem = Item;
export type { EngineFinding };
