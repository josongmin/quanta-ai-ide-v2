import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pin as PinIcon, FileCode, AtSign, MessageSquare, X, Plus, Search,
} from 'lucide-react';
import { useClickOutside } from '@shared/lib';
import { useTheme } from '@shared/theme';
import { SAMPLE_MENTION_FILES, SAMPLE_MENTION_SYMBOLS } from './data';
import type { Pin } from './types';

type TranslateFn = (k: string, opts?: Record<string, unknown>) => string;

// Pin drawer — anchored under the Pin button in ThreadPane's header. Lists
// current pins with × removers and a small inline picker for adding new
// pins (file/symbol/turn).
//
// We render a parallel inline picker rather than reusing MentionPicker
// because MentionPicker is tightly coupled to caret/textarea state in the
// Composer; a tiny static-list picker is far less code than parametrising
// it. Same fixtures (SAMPLE_MENTION_FILES / _SYMBOLS) feed both.
//
// Surface tones mirror BudgetSoftCapModal — bg-[#11141a]/0.40 dark with
// backdrop-blur, bg-white/0.65 light. The user has called out keeping
// glass alpha LOW; we don't bump it to "fix" readability.

type PickerMode = 'file' | 'symbol' | 'turn' | null;

export function PinDrawer({
  open,
  onClose,
  pins,
  onAdd,
  onRemove,
  t,
  turnCount,
}: {
  open: boolean;
  onClose: () => void;
  pins: Pin[];
  onAdd: (p: Pin) => void;
  onRemove: (p: Pin) => void;
  // `isDark` was used for legacy class-based styling; the drawer now
  // relies on semantic tokens. Kept optional so callers don't break.
  isDark?: boolean;
  t: TranslateFn;
  // Number of turns in the current task — drives the "pin turn #N" picker.
  turnCount: number;
}) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<PickerMode>(null);
  const [query, setQuery] = useState('');
  const { isDark } = useTheme();

  useClickOutside(drawerRef, open, onClose);

  // Reset picker mode whenever the drawer is closed so the next open
  // starts on the pin list, not a stale picker.
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (!open) { setMode(null); setQuery(''); }
  }

  // Esc closes the drawer.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (mode != null) { setMode(null); setQuery(''); }
        else onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); };
  }, [open, mode, onClose]);

  if (!open) return null;

  // Surface — keep alpha LOW + backdrop-blur. Pulls bg-overlay so light/
  // dark/HC follow one source. Memory feedback: never bump alpha to fix
  // readability; trust the token + blur.
  const surface = 'bg-[var(--bg-overlay)] border-[var(--border-strong)]';
  const heading = 'text-[var(--fg-strong)]';
  const muted = 'text-[var(--fg-muted)]';
  const faint = 'text-[var(--fg-subtle)]';

  return (
    <div
      ref={drawerRef}
      className={`absolute right-3 top-[calc(100%+6px)] z-40 w-[320px] max-w-[320px] rounded-xl border shadow-2xl overflow-hidden ${surface}`}
      style={isDark ? {
        backdropFilter: 'blur(22px) saturate(160%)',
        WebkitBackdropFilter: 'blur(22px) saturate(160%)',
      } : undefined}
      role="dialog"
      aria-label={t('pins.header')}
    >
      <div className={`flex items-center justify-between px-3 py-2 border-b border-[var(--border-default)]`}>
        <span className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] ${heading}`}>
          <PinIcon className="w-3 h-3" />
          {t('pins.header')}
        </span>
        <span className={`text-[10px] font-mono ${faint}`} title={t('pins.tooltip')}>
          {pins.length > 0 ? `${pins.length}` : ''}
        </span>
      </div>

      {mode == null ? (
        <PinList
          pins={pins}
          onRemove={onRemove}
          onStart={(m) => { setMode(m); }}
          t={t}
          muted={muted}
          faint={faint}
        />
      ) : (
        <InlinePicker
          mode={mode}
          query={query}
          onQuery={setQuery}
          onPick={(p) => {
            onAdd(p);
            setMode(null); setQuery('');
          }}
          onCancel={() => { setMode(null); setQuery(''); }}
          t={t}
          turnCount={turnCount}
          existingRefs={new Set(pins.map((p) => `${p.kind}:${p.ref ?? p.label}`))}
        />
      )}
    </div>
  );
}

function PinList({
  pins, onRemove, onStart, t, muted, faint,
}: {
  pins: Pin[];
  onRemove: (p: Pin) => void;
  onStart: (m: 'file' | 'symbol' | 'turn') => void;
  t: TranslateFn;
  muted: string;
  faint: string;
}) {
  const itemHover = 'hover:[background:var(--bg-hover)]';
  const addBtn = 'border-[var(--border-strong)] text-[var(--fg-default)] hover:[background:var(--bg-hover)]';

  return (
    <>
      <div className="max-h-[200px] overflow-auto scrollbar-thin">
        {pins.length === 0 ? (
          <div className={`px-3 py-4 text-[12px] ${muted}`}>
            {t('pins.empty')}
          </div>
        ) : (
          <ul className={'divide-y divide-[var(--border-muted)]'}>
            {pins.map((p, i) => (
              <li
                key={`${p.kind}:${p.ref ?? p.label}:${i}`}
                className={`flex items-center gap-2 px-3 py-2 ${itemHover}`}
              >
                <KindIcon kind={p.kind} className={faint} />
                <span className={`font-mono text-[12px] truncate flex-1 text-[var(--fg-strong)]`}>
                  {p.label}
                </span>
                <button
                  type="button"
                  aria-label={t('pins.unpin')}
                  title={t('pins.unpin')}
                  onClick={() => { onRemove(p); }}
                  className={`p-0.5 rounded transition-colors text-[var(--fg-muted)] hover:text-[var(--fg-strong)] hover:[background:var(--bg-hover)]`}
                >
                  <X className="w-3 h-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={`grid grid-cols-3 gap-1 p-2 border-t border-[var(--border-default)]`}>
        <AddButton onClick={() => { onStart('file'); }} className={addBtn}>
          <Plus className="w-3 h-3" />
          <FileCode className="w-3 h-3" />
          <span>{t('pins.addFile')}</span>
        </AddButton>
        <AddButton onClick={() => { onStart('symbol'); }} className={addBtn}>
          <Plus className="w-3 h-3" />
          <AtSign className="w-3 h-3" />
          <span>{t('pins.addSymbol')}</span>
        </AddButton>
        <AddButton onClick={() => { onStart('turn'); }} className={addBtn}>
          <Plus className="w-3 h-3" />
          <MessageSquare className="w-3 h-3" />
          <span>{t('pins.addTurn')}</span>
        </AddButton>
      </div>
    </>
  );
}

function AddButton({
  children, className, onClick,
}: {
  children: React.ReactNode;
  className: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-md border text-[10px] font-mono transition-colors ${className}`}
    >
      {children}
    </button>
  );
}

function InlinePicker({
  mode, query, onQuery, onPick, onCancel, t, turnCount, existingRefs,
}: {
  mode: 'file' | 'symbol' | 'turn';
  query: string;
  onQuery: (s: string) => void;
  onPick: (p: Pin) => void;
  onCancel: () => void;
  t: TranslateFn;
  turnCount: number;
  existingRefs: Set<string>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  type Candidate = { pin: Pin; sub?: string };

  const candidates = useMemo<Candidate[]>(() => {
    const q = query.trim().toLowerCase();
    if (mode === 'file') {
      return SAMPLE_MENTION_FILES
        .filter((f) => q === '' || f.path.toLowerCase().includes(q))
        .slice(0, 6)
        .map((f): Candidate => ({
          pin: { kind: 'file', label: f.path, ref: f.path },
          sub: f.path.split('/').slice(0, -1).join('/'),
        }));
    }
    if (mode === 'symbol') {
      return SAMPLE_MENTION_SYMBOLS
        .filter((s) => q === '' || s.name.toLowerCase().includes(q) || s.path.toLowerCase().includes(q))
        .slice(0, 6)
        .map((s): Candidate => ({
          pin: { kind: 'symbol', label: s.name, ref: `${s.path}:${s.name}` },
          sub: s.path,
        }));
    }
    // Turn picker — list every turn in the active task by index. The
    // demo doesn't carry real turn refs; the label is what shows up in
    // the chip strip and the merged `mentions` array.
    const out: Candidate[] = [];
    for (let i = 1; i <= turnCount; i++) {
      const label = `turn:#${i}`;
      if (q !== '' && !label.includes(q)) continue;
      out.push({ pin: { kind: 'turn', label, ref: `turn:${i}` } });
    }
    return out.slice(0, 6);
  }, [mode, query, turnCount]);

  const inputBg = 'bg-[var(--bg-active)] text-[var(--fg-strong)] placeholder:text-[var(--fg-subtle)] border-[var(--border-default)]';
  const itemHover = 'hover:[background:var(--bg-hover)]';
  const muted = 'text-[var(--fg-muted)]';

  return (
    <div>
      <div className={`flex items-center gap-2 px-3 py-2 border-b border-[var(--border-default)]`}>
        <Search className={`w-3 h-3 text-[var(--fg-subtle)]`} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { onQuery(e.target.value); }}
          placeholder={
            mode === 'file' ? t('pins.addFile')
            : mode === 'symbol' ? t('pins.addSymbol')
            : t('pins.addTurn')
          }
          className={`flex-1 min-w-0 px-2 py-1 rounded-md border text-[12px] font-mono outline-none focus:ring-1 focus:ring-white/10 ${inputBg}`}
        />
        <button
          type="button"
          onClick={onCancel}
          className={`text-[10px] font-mono transition-colors ${muted} hover:text-[var(--fg-strong)]`}
        >
          esc
        </button>
      </div>
      <div className="max-h-[220px] overflow-auto scrollbar-thin">
        {candidates.length === 0 ? (
          <div className={`px-3 py-3 text-[12px] ${muted}`}>
            {t('mention.empty')}
          </div>
        ) : (
          <ul className={'divide-y divide-[var(--border-muted)]'}>
            {candidates.map(({ pin, sub }, i) => {
              const dupKey = `${pin.kind}:${pin.ref ?? pin.label}`;
              const dup = existingRefs.has(dupKey);
              return (
                <li key={`${dupKey}:${i}`}>
                  <button
                    type="button"
                    disabled={dup}
                    onClick={() => { if (!dup) onPick(pin); }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-left ${itemHover} ${
                      dup ? 'opacity-40 cursor-not-allowed' : ''
                    }`}
                  >
                    <KindIcon kind={pin.kind} className={'text-[var(--fg-muted)]'} />
                    <span className={`font-mono text-[12px] truncate text-[var(--fg-strong)]`}>
                      {pin.label}
                    </span>
                    {sub != null && sub !== '' && (
                      <span className={`ml-auto font-mono text-[10px] truncate max-w-[55%] text-[var(--fg-subtle)]`}>
                        {sub}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function KindIcon({ kind, className }: { kind: Pin['kind']; className: string }) {
  if (kind === 'file') return <FileCode className={`w-3 h-3 shrink-0 ${className}`} />;
  if (kind === 'symbol') return <AtSign className={`w-3 h-3 shrink-0 ${className}`} />;
  return <MessageSquare className={`w-3 h-3 shrink-0 ${className}`} />;
}
