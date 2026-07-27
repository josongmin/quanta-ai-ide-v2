import { useCallback, useRef, useState } from 'react';
import { History, X, Boxes, Folder, FileCode } from 'lucide-react';
import type { RepoData } from '@entities/repo';
import { useDialogA11y } from '@shared/ui';
import { useClickOutside } from '@shared/lib';
import { stackKey, type StackItem } from '../../model/StackContext';
import { itemLabel } from './stackLabel';

// History affordance for the stack rail: a button that opens a dropdown
// listing every open inspect tab with activate/close affordances.
export function HistoryButton({
  items, activeKey, isDark, thickness, onPick, onClose, repo, t,
}: {
  items: StackItem[]; activeKey: string; isDark: boolean; thickness: number;
  onPick: (key: string) => void;
  onClose: (key: string) => void;
  repo: RepoData;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Escape-to-close + focus trap (shared dialog a11y) and mousedown-outside
  // dismissal (shared hook). `close` is stable across renders so the hooks'
  // effect deps stay quiet.
  const close = useCallback(() => { setOpen(false); }, []);
  useDialogA11y(ref, open, close);
  useClickOutside(ref, open, close);

  return (
    <div ref={ref} className="relative pointer-events-auto shrink-0" style={{ height: thickness }}>
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); }}
        title={t('stack_axis.openTabs')}
        aria-label={t('stack_axis.openTabsHistory')}
        aria-expanded={open}
        className="flex items-center justify-center transition-colors text-[var(--fg-muted)] hover:text-[var(--fg-strong)]"
        style={{ width: thickness, height: thickness }}
      >
        <History className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div
          className="absolute top-0 left-full ml-1 w-[240px] max-h-[60vh] overflow-y-auto scrollbar-hide rounded-xl border border-[var(--border-default)] shadow-2xl"
          style={{
            background: 'var(--bg-panel-strong)',
            ...(isDark ? {
              backdropFilter: 'blur(22px) saturate(160%)',
              WebkitBackdropFilter: 'blur(22px) saturate(160%)',
            } : {}),
          }}
        >
          <div className="px-3 py-2 text-2xs font-black uppercase tracking-eyebrow border-b text-[var(--fg-subtle)] border-[var(--border-default)]">
            {t('stack_axis.openTabsCount', { count: items.length })}
          </div>
          <div className="py-1">
            {items.map((it, i) => {
              const k = stackKey(it);
              const a = k === activeKey;
              const { name, sub } = itemLabel(it, repo, t);
              const Icon = it.kind === 'workspace' ? Boxes : it.kind === 'folder' ? Folder : FileCode;
              return (
                <div
                  key={k}
                  role="button"
                  tabIndex={0}
                  onClick={() => { onPick(k); setOpen(false); }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onPick(k);
                      setOpen(false);
                    }
                  }}
                  className={`group relative flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors ${
                    a
                      ? 'bg-[var(--bg-active)]'
                      : 'hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  {a && <span className="absolute left-0 top-1 bottom-1 w-[2px] bg-[var(--fg-accent)] rounded-r" />}
                  <span
                    style={a ? { color: 'var(--intent-success-fg)' } : undefined}
                    className={`shrink-0 w-4 text-2xs font-mono tabular-nums text-right ${
                    a ? '' : 'text-[var(--fg-subtle)]'
                  }`}>
                    {i + 1}
                  </span>
                  <Icon className={`shrink-0 w-3 h-3 ${
                    a ? 'text-[var(--fg-strong)]' : 'text-[var(--fg-subtle)]'
                  }`} />
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm font-bold truncate ${
                      a ? 'text-[var(--fg-strong)]' : 'text-[var(--fg-muted)]'
                    }`}>
                      {name}
                    </div>
                    <div className="text-2xs font-mono truncate text-[var(--fg-subtle)]">
                      {sub}
                    </div>
                  </div>
                  {it.kind !== 'workspace' && (
                    <button type="button"
                      onClick={(e) => { e.stopPropagation(); onClose(k); }}
                      className="shrink-0 p-0.5 rounded-md transition-colors opacity-0 group-hover:opacity-100 text-[var(--fg-subtle)] hover:text-[var(--fg-strong)] hover:bg-[var(--bg-active)]"
                      aria-label={t('stack_axis.closeTab')}
                      title={t('stack_axis.closeTab')}
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
