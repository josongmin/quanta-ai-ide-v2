import { useEffect, useMemo } from 'react';
import { FileCode, AtSign } from 'lucide-react';
import { SAMPLE_MENTION_FILES, SAMPLE_MENTION_SYMBOLS } from './data';

// Mention picker. Pops above the textarea when the cursor sits inside a
// `#…` (file) or `@…` (symbol) token. Pure UI — the parent owns the
// caret + textarea state and tells us what trigger/query to render.
//
// We intentionally support only one trigger at a time. The parent is
// responsible for parsing the textarea around the caret and calling us.

export type MentionTrigger = '#' | '@';
export type MentionItem =
  | { kind: 'file'; path: string }
  | { kind: 'symbol'; name: string; path: string };

type Props = {
  trigger: MentionTrigger;
  query: string;
  isDark: boolean;
  t: (k: string) => string;
  onPick: (item: MentionItem) => void;
  onClose: () => void;
  // Parent-controlled selected index; lets the textarea handle ↑↓/Enter
  // without us listening to global keys (and fighting the slash menu).
  index: number;
  onIndexChange: (next: number) => void;
  onItemsChange: (items: MentionItem[]) => void;
};

const MAX_RESULTS = 7;

// Tiny fuzzy score: substring beats subsequence beats nothing. Lower is
// better. Returns null when there's no match at all.
function score(haystack: string, needle: string): number | null {
  if (!needle) return 0;
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase();
  const idx = h.indexOf(n);
  if (idx >= 0) return idx; // contiguous substring — best
  // Subsequence fallback: walk h, consume chars of n in order.
  let hi = 0; let ni = 0; let gaps = 0;
  while (hi < h.length && ni < n.length) {
    if (h[hi] === n[ni]) { ni += 1; }
    else if (ni > 0) { gaps += 1; }
    hi += 1;
  }
  if (ni < n.length) return null;
  return 1000 + gaps;
}

export function MentionPicker({
  trigger, query, isDark, t, onPick, onClose, index, onIndexChange, onItemsChange,
}: Props) {
  const items = useMemo<MentionItem[]>(() => {
    if (trigger === '#') {
      const ranked = SAMPLE_MENTION_FILES
        .map((f: { path: string }) => ({ item: { kind: 'file' as const, path: f.path }, s: score(f.path, query) }))
        .filter((r): r is { item: { kind: 'file'; path: string }; s: number } => r.s !== null)
        .sort((a: { s: number }, b: { s: number }) => a.s - b.s)
        .slice(0, MAX_RESULTS);
      return ranked.map((r): MentionItem => r.item);
    }
    const ranked = SAMPLE_MENTION_SYMBOLS
      .map((s: { name: string; path: string }) => ({ item: { kind: 'symbol' as const, name: s.name, path: s.path }, s: Math.min(
        score(s.name, query) ?? Infinity,
        (score(s.path, query) ?? Infinity) + 5,
      ) }))
      .filter((r: { s: number }) => r.s !== Infinity)
      .sort((a: { s: number }, b: { s: number }) => a.s - b.s)
      .slice(0, MAX_RESULTS);
    return ranked.map((r: { item: MentionItem }): MentionItem => r.item);
  }, [trigger, query]);

  // Bubble item list up so the parent can wire ↑↓/Enter against the same
  // array we render.
  useEffect(() => {
    onItemsChange(items);
  }, [items, onItemsChange]);

  // Clamp the selected index any time the result set shrinks.
  useEffect(() => {
    if (index >= items.length && items.length > 0) onIndexChange(items.length - 1);
    if (index < 0) onIndexChange(0);
  }, [items.length, index, onIndexChange]);

  const headerLabel = trigger === '#' ? t('mention.filesHeader') : t('mention.symbolsHeader');
  const HeaderIcon = trigger === '#' ? FileCode : AtSign;

  return (
    <div
      className={`absolute bottom-[calc(100%+8px)] left-0 right-0 rounded-xl border shadow-2xl overflow-hidden ${
        isDark ? 'border-white/[0.10] bg-[#0f1218]/95' : 'border-black/[0.10] bg-white/95'
      }`}
      style={{
        backdropFilter: 'blur(22px) saturate(160%)',
        WebkitBackdropFilter: 'blur(22px) saturate(160%)',
      }}
      role="listbox"
      aria-label={headerLabel}
    >
      <div className={`flex items-center justify-between px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] ${
        isDark ? 'text-white/40 bg-white/[0.02]' : 'text-black/40 bg-black/[0.02]'
      }`}>
        <span className="flex items-center gap-1">
          <HeaderIcon className="w-2.5 h-2.5" />
          {headerLabel}
        </span>
        <span className={`font-mono normal-case tracking-normal ${
          isDark ? 'text-white/30' : 'text-black/35'
        }`}>
          {t('mention.hint')}
        </span>
      </div>
      {items.length === 0 ? (
        <div className={`px-3 py-3 text-[11px] ${isDark ? 'text-white/40' : 'text-black/45'}`}>
          {t('mention.empty')}
          <button
            type="button"
            onClick={onClose}
            className={`ml-2 underline ${isDark ? 'text-white/55' : 'text-black/55'}`}
          >
            esc
          </button>
        </div>
      ) : (
        <div
          className={isDark ? 'divide-y divide-white/[0.04]' : 'divide-y divide-black/[0.04]'}
        >
          {items.map((item, i) => {
            const active = i === index;
            const label = item.kind === 'file' ? item.path.split('/').pop() ?? item.path : item.name;
            const sub = item.kind === 'file'
              ? item.path.split('/').slice(0, -1).join('/')
              : item.path;
            return (
              <button
                type="button"
                key={`${item.kind}:${'name' in item ? item.name : item.path}:${i}`}
                role="option"
                aria-selected={active}
                onMouseEnter={() => { onIndexChange(i); }}
                onClick={() => { onPick(item); }}
                className={`w-full text-left px-3 py-1.5 flex items-center gap-2.5 transition-colors ${
                  active
                    ? (isDark ? 'bg-white/[0.06]' : 'bg-black/[0.04]')
                    : (isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-black/[0.02]')
                }`}
              >
                <span className={`shrink-0 ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                  {item.kind === 'file'
                    ? <FileCode className="w-3 h-3" />
                    : <AtSign className="w-3 h-3" />}
                </span>
                <span className={`font-mono text-[12px] truncate ${
                  isDark ? 'text-white/85' : 'text-black/85'
                }`}>
                  {label}
                </span>
                {sub && (
                  <span className={`ml-auto font-mono text-[10px] truncate max-w-[55%] ${
                    isDark ? 'text-white/35' : 'text-black/40'
                  }`}>
                    {sub}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Parse the textarea around the caret to find an active mention trigger.
// Returns the trigger character + query text, or null if the caret is not
// in a mention region. A region starts at the most recent `#` or `@` that
// is preceded by whitespace or BOM, and runs until whitespace or caret.
export function findMentionAtCaret(
  value: string, caret: number,
): { trigger: MentionTrigger; query: string; start: number } | null {
  // Walk backwards from caret. Stop at whitespace (no mention) or a
  // trigger char. Keep the search bounded so a long pre-existing buffer
  // doesn't make every keystroke walk the whole textarea.
  const MAX_BACK = 64;
  const lower = Math.max(0, caret - MAX_BACK);
  for (let i = caret - 1; i >= lower; i--) {
    const ch = value[i];
    if (ch === ' ' || ch === '\n' || ch === '\t') return null;
    if (ch === '#' || ch === '@') {
      const before = i === 0 ? ' ' : value[i - 1];
      if (before !== ' ' && before !== '\n' && before !== '\t' && i !== 0) return null;
      const query = value.slice(i + 1, caret);
      // Only show picker for plausible queries (no embedded special chars).
      if (/[#@]/.test(query)) return null;
      return { trigger: ch, query, start: i };
    }
  }
  return null;
}
