import { useEffect, useRef } from 'react';
import {
  Copy, ClipboardCopy, Share2, Download, FilePlus2, GitPullRequest,
} from 'lucide-react';
import { useClickOutside } from '@shared/lib';

// Right-click context menu over a thread turn. Pure presentational —
// the parent decides where to anchor it (clientX/Y from the contextmenu
// event) and what each item does. Closes on outside click or Escape.
//
// Items are intentionally a small fixed set: copy text, copy as
// markdown, share, export, fork-as-new-task. Real impl would let
// extensions register additional items.

export type TurnContextMenuItem =
  | { id: 'copy';        label: string; onSelect: () => void }
  | { id: 'copyMd';      label: string; onSelect: () => void }
  | { id: 'share';       label: string; onSelect: () => void }
  | { id: 'export';      label: string; onSelect: () => void }
  | { id: 'exportPr';    label: string; onSelect: () => void }
  | { id: 'openInNew';   label: string; onSelect: () => void };

type Props = {
  x: number;
  y: number;
  items: TurnContextMenuItem[];
  isDark: boolean;
  onClose: () => void;
};

const ICON_FOR: Record<TurnContextMenuItem['id'], React.ComponentType<{ className?: string }>> = {
  copy: Copy,
  copyMd: ClipboardCopy,
  share: Share2,
  export: Download,
  exportPr: GitPullRequest,
  openInNew: FilePlus2,
};

export function TurnContextMenu({ x, y, items, isDark, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click (mousedown so we beat the next click that
  // might land on a different button) and on Escape.
  useClickOutside(ref, true, onClose);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  // Move focus into the menu on open so it's reachable by keyboard (a
  // right-click menu has no trigger to tab from).
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, []);

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' &&
        e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    const nodes = Array.from(ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    if (nodes.length === 0) return;
    const idx = nodes.indexOf(document.activeElement as HTMLElement);
    const n = nodes.length;
    if (e.key === 'ArrowDown') nodes[(idx + 1 + n) % n]?.focus();
    else if (e.key === 'ArrowUp') nodes[(idx - 1 + n) % n]?.focus();
    else if (e.key === 'Home') nodes[0]?.focus();
    else nodes[n - 1]?.focus();
  };

  // Bias the menu to the click point but keep it inside the viewport.
  // Width/height are conservative estimates; the menu is small enough
  // that we don't need a measurement pass.
  const MENU_W = 200;
  const MENU_H = items.length * 28 + 8;
  const left = Math.min(x, window.innerWidth - MENU_W - 8);
  const top = Math.min(y, window.innerHeight - MENU_H - 8);

  return (
    <div
      ref={ref}
      role="menu"
      onKeyDown={onMenuKeyDown}
      className="fixed z-[60] min-w-[200px] py-1 rounded-md border shadow-2xl bg-[var(--bg-elevated)] border-[color:var(--border-default)]"
      style={isDark ? {
        left, top,
        backdropFilter: 'blur(22px) saturate(160%)',
        WebkitBackdropFilter: 'blur(22px) saturate(160%)',
      } : { left, top }}
    >
      {items.map((item) => {
        const Icon = ICON_FOR[item.id];
        return (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            onClick={() => { item.onSelect(); onClose(); }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-base transition-colors text-[color:var(--fg-strong)] hover:bg-[color:var(--bg-hover)]"
          >
            <Icon className="w-3 h-3 text-[color:var(--fg-muted)]" />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
