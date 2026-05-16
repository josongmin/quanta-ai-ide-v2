import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ArrowRight, Hash, Slash, Sparkles } from 'lucide-react';
import type { Task } from '../types';

// Cmd-K global command palette. Three sections:
//   - Actions     (parent-supplied callbacks: new task, switch model, …)
//   - Tasks       (jump to any task)
//   - Slash       (insert a slash command into the composer)
// Filtering is a single substring match across the visible label + a
// handful of synonym tokens; ↑↓/Enter for navigation; Esc to close.
//
// Pure presentational. The parent owns `open` and decides what each
// command does — the palette only filters and dispatches.

export type PaletteAction = {
  id: string;
  label: string;
  hint?: string;
  // Optional extra search tokens so "switch model" finds "opus" too.
  keywords?: string[];
  onRun: () => void;
};

type Props = {
  open: boolean;
  onClose: () => void;
  actions: PaletteAction[];
  tasks: Task[];
  onJumpTask: (taskId: string) => void;
  onInsertSlash: (cmd: string) => void;
  isDark: boolean;
  t: (k: string, opts?: Record<string, unknown>) => string;
};

const SLASH_OPTIONS = ['/plan', '/diff', '/test', '/fix', '/explain', '/review', '/clean'];

type Row =
  | { kind: 'action'; section: 'actions'; action: PaletteAction }
  | { kind: 'task';   section: 'tasks';   task: Task }
  | { kind: 'slash';  section: 'slash';   cmd: string };

export function CommandPalette({
  open, onClose, actions, tasks, onJumpTask, onInsertSlash, isDark, t,
}: Props) {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state every time the palette opens. Auto-focus the input on
  // the next frame so the cursor lands inside it before the user starts
  // typing.
  /* eslint-disable react-hooks/set-state-in-effect --
   * The trigger here is the external `open` prop; resetting query/index
   * inside the effect is the correct sync pattern. */
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setIndex(0);
    requestAnimationFrame(() => { inputRef.current?.focus(); });
  }, [open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Build the flat row list (filtered) so ↑↓ navigation has a single
  // index to operate on across sections.
  const rows = useMemo<Row[]>(() => {
    const q = query.trim().toLowerCase();
    const matchAction = (a: PaletteAction) => {
      if (!q) return true;
      if (a.label.toLowerCase().includes(q)) return true;
      return (a.keywords ?? []).some((k) => k.toLowerCase().includes(q));
    };
    const matchTask = (tsk: Task) => {
      if (!q) return true;
      return tsk.title.toLowerCase().includes(q) || tsk.branch.toLowerCase().includes(q);
    };
    const matchSlash = (cmd: string) => {
      if (!q) return true;
      return cmd.toLowerCase().includes(q);
    };
    const out: Row[] = [];
    actions.filter(matchAction).forEach((a) => out.push({ kind: 'action', section: 'actions', action: a }));
    tasks.filter(matchTask).slice(0, 8).forEach((tsk) => out.push({ kind: 'task', section: 'tasks', task: tsk }));
    SLASH_OPTIONS.filter(matchSlash).forEach((cmd) => out.push({ kind: 'slash', section: 'slash', cmd }));
    return out;
  }, [query, actions, tasks]);

  // Keep the highlighted index in range as the result list changes shape.
  /* eslint-disable react-hooks/set-state-in-effect --
   * Clamp index after `rows` (a memo derived from query) shrinks. Has to
   * be in an effect because the new length isn't known until after the
   * filter runs. */
  useEffect(() => {
    if (index >= rows.length && rows.length > 0) setIndex(rows.length - 1);
    if (index < 0) setIndex(0);
  }, [rows.length, index]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function dispatch(row: Row) {
    if (row.kind === 'action') row.action.onRun();
    else if (row.kind === 'task') onJumpTask(row.task.id);
    else onInsertSlash(row.cmd);
    onClose();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndex((i) => Math.min(rows.length - 1, i + 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndex((i) => Math.max(0, i - 1));
      return;
    }
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault();
      const row = rows[index];
      if (row) dispatch(row);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }

  if (!open) return null;

  // Section breaks rendered inline so the index stays flat.
  let lastSection: Row['section'] | null = null;
  const muted = isDark ? 'text-white/55' : 'text-black/55';
  const faint = isDark ? 'text-white/35' : 'text-black/40';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4">
      {/* Backdrop — click anywhere outside to close. */}
      <button
        type="button"
        aria-label="Close command palette"
        className={`absolute inset-0 cursor-default ${isDark ? 'bg-black/40' : 'bg-black/20'} backdrop-blur-sm`}
        onClick={onClose}
        onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className={`relative w-full max-w-[600px] rounded-xl border shadow-2xl overflow-hidden ${
          isDark ? 'bg-[#11141a]/95 border-white/[0.10]' : 'bg-white/95 border-black/[0.10]'
        }`}
        style={isDark ? {
          backdropFilter: 'blur(22px) saturate(160%)',
          WebkitBackdropFilter: 'blur(22px) saturate(160%)',
        } : undefined}
      >
        <div className={`flex items-center gap-2 px-3 py-2.5 border-b ${
          isDark ? 'border-white/[0.06]' : 'border-black/[0.06]'
        }`}>
          <Search className={`w-3.5 h-3.5 ${faint}`} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setIndex(0); }}
            onKeyDown={onKeyDown}
            placeholder={t('palette.placeholder')}
            className={`flex-1 bg-transparent outline-none text-[13px] ${
              isDark ? 'text-white/85 placeholder:text-white/30' : 'text-black/85 placeholder:text-black/35'
            }`}
            spellCheck={false}
          />
          <span className={`text-[10px] font-mono ${faint}`}>{t('palette.hint')}</span>
        </div>

        <div className="max-h-[55vh] overflow-auto scrollbar-thin py-1">
          {rows.length === 0 ? (
            <div className={`px-3 py-6 text-center text-[12px] ${muted}`}>
              {t('palette.noResults')}
            </div>
          ) : (
            rows.map((row, i) => {
              const showHeader = row.section !== lastSection;
              lastSection = row.section;
              const active = i === index;
              const headerLabel =
                row.section === 'actions' ? t('palette.sectionActions')
                : row.section === 'tasks' ? t('palette.sectionTasks')
                : t('palette.sectionSlash');
              return (
                <div key={`${row.section}:${i}`}>
                  {showHeader && (
                    <div className={`px-3 pt-2 pb-1 text-[9px] font-bold uppercase tracking-[0.18em] ${faint}`}>
                      {headerLabel}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => { dispatch(row); }}
                    onMouseEnter={() => { setIndex(i); }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors ${
                      active
                        ? (isDark ? 'bg-white/[0.06]' : 'bg-black/[0.04]')
                        : ''
                    }`}
                  >
                    <PaletteRowIcon row={row} isDark={isDark} />
                    <span className={`flex-1 truncate text-[12px] ${
                      isDark ? 'text-white/85' : 'text-black/85'
                    } ${row.kind !== 'action' ? 'font-mono' : ''}`}>
                      {row.kind === 'action' ? row.action.label
                        : row.kind === 'task'  ? row.task.title
                        : row.cmd}
                    </span>
                    {row.kind === 'action' && row.action.hint && (
                      <span className={`text-[10px] font-mono ${faint}`}>{row.action.hint}</span>
                    )}
                    {row.kind === 'task' && (
                      <span className={`text-[10px] font-mono ${faint}`}>{row.task.branch}</span>
                    )}
                    {active && (
                      <ArrowRight className={`w-3 h-3 ${faint}`} />
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function PaletteRowIcon({ row, isDark }: { row: Row; isDark: boolean }) {
  const tone = isDark ? 'text-white/45' : 'text-black/45';
  if (row.kind === 'action') return <Sparkles className={`w-3 h-3 ${tone}`} />;
  if (row.kind === 'task')   return <Hash     className={`w-3 h-3 ${tone}`} />;
  return <Slash className={`w-3 h-3 ${tone}`} />;
}
