// ─────────────────────────────────────────────────────────────────────────
// Global control palette. Cmd-K / Ctrl-K from anywhere.
//
// Design lineage — Linear, Raycast, cmdk:
//   • One input at top, scrollable result list below.
//   • Sections (Recent / Navigate / Actions) labelled inline; only
//     populated sections render so the list stays dense.
//   • Single global highlight cursor crosses sections — ↑↓ wraps.
//   • Type-to-filter is the only interaction model; no tabs, no faceted
//     filters. Power-users get there with substring + subsequence.
//   • Footer chip strip is purely a hint, not interactive.
//
// The panel reuses the same backdrop + entrance animation as the
// Popover modal placement (popover-backdrop-in / popover-panel-in) so
// it reads as a sibling surface to other modals across the app.
//
// This component is a thin container: rendering composition only. The
// theme skin lives in lib/paletteSkin, keyboard nav + cursor management
// in lib/usePaletteKeyboardNav, and the rows/sections in parts/.
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from '@tanstack/react-router';
import { Search, ArrowUp, CornerDownLeft } from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import { useTheme } from '@shared/theme';
import { useFilterStore } from '@entities/filter-state';
import { useControlPaletteStore } from '../model/store';
import type { Command } from '../model/types';
import { matchCommands } from '../lib/match';
import { buildCommands } from '../lib/buildCommands';
import { paletteSkin } from '../lib/paletteSkin';
import { usePaletteKeyboardNav } from '../lib/usePaletteKeyboardNav';
import { SectionView } from './parts/SectionView';

type Props = {
  // External callbacks — AppShell owns these surfaces and threads
  // setters in. Keeping them as props (not store actions) means the
  // palette stays a leaf and we don't get a global-state web for
  // ephemeral chrome state.
  onOpenHelp: () => void;
  onOpenTokens: () => void;
  onOpenActivity: () => void;
}

export default function ControlPalette({ onOpenHelp, onOpenTokens, onOpenActivity }: Props) {
  const open      = useControlPaletteStore((s) => s.open);
  const openedAt  = useControlPaletteStore((s) => s.openedAt);
  const recents   = useControlPaletteStore((s) => s.recents);
  const setOpen   = useControlPaletteStore((s) => s.setOpen);
  const pushRecent = useControlPaletteStore((s) => s.pushRecent);

  const navigate = useNavigate();
  const { t } = useTranslation('app');
  const { isDark, toggle: toggleTheme } = useTheme();
  const resetFilters = useFilterStore((s) => s.resetAll);

  const commands = useMemo(
    () => buildCommands({
      t, isDark, recents,
      toggleTheme,
      resetFilters,
      openHelp: onOpenHelp,
      openTokens: onOpenTokens,
      openActivity: onOpenActivity,
    }),
    [t, isDark, recents, toggleTheme, resetFilters, onOpenHelp, onOpenTokens, onOpenActivity],
  );

  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Sectioned, ranked result list. We separate the cursor index from
  // the section structure: the list is flat for keyboard, sectioned
  // for rendering.
  const ranked = useMemo(() => matchCommands(commands, query), [commands, query]);
  const rankedCommands = useMemo(() => ranked.map((r) => r.command), [ranked]);

  function runCommand(cmd: Command) {
    if (cmd.kind === 'action') {
      cmd.run();
    } else {
      // TanStack Router types `to` against the registered route tree;
      // the cast keeps the palette generic over whatever paths were
      // registered, with the runtime check in NAV_TABS narrowing it.
      void navigate({ to: cmd.path as never });
      pushRecent(cmd.path);
    }
    setOpen(false);
  }

  const { sections, cursor, setCursor, resetCursor, onKey } = usePaletteKeyboardNav({
    ranked: rankedCommands,
    listRef,
    onRun: runCommand,
    onClose: () => { setOpen(false); },
  });

  // Reset query + cursor on every fresh open. Keyed off `openedAt` so
  // re-opens always start clean even if the prop tree is otherwise
  // stable. Cursor also resets when the filtered list shape changes.
  const [prevOpenedAt, setPrevOpenedAt] = useState(openedAt);
  if (open && openedAt !== prevOpenedAt) {
    setPrevOpenedAt(openedAt);
    setQuery('');
    resetCursor();
  }
  useEffect(() => {
    if (!open) return;
    // Focus next frame so the input exists in the DOM after the
    // animation class lands. Without rAF the autofocus races with
    // React's commit phase.
    requestAnimationFrame(() => { inputRef.current?.focus(); });
  }, [open, openedAt]);

  if (!open) return null;

  const skin = paletteSkin(isDark);
  const empty = sections.length === 0;

  return createPortal(
    <div
      role="presentation"
      className="fixed inset-0 z-[var(--z-modal,9999)] flex items-start justify-center pt-[15vh] px-4 popover-backdrop-in"
      style={{ background: skin.backdrop }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('palette.title')}
        className="w-[640px] max-w-full rounded-xl overflow-hidden popover-panel-in"
        style={{
          background: skin.panelBg,
          border: `1px solid ${skin.panelBorder}`,
          ...(isDark ? {
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          } : {}),
          boxShadow: skin.panelShadow,
        }}
      >
        {/* Header — search input */}
        <div
          className="flex items-center gap-2.5 px-3.5 h-12"
          style={{ borderBottom: `1px solid ${skin.headerBorder}` }}
        >
          <Search className="w-4 h-4 shrink-0" style={{ color: skin.iconColorIdle }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setCursor(0); }}
            onKeyDown={onKey}
            placeholder={t('palette.placeholder')}
            className="flex-1 bg-transparent outline-none text-[12px] palette-input"
            style={{ color: skin.inputColor }}
            spellCheck={false}
            autoComplete="off"
          />
          <span
            className="text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0"
            style={{
              background: skin.chipBg,
              color: skin.chipText,
              border: `1px solid ${skin.chipBorder}`,
            }}
          >
            ESC
          </span>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-1.5">
          {empty ? (
            <div
              className="px-4 py-8 text-center text-[12px]"
              style={{ color: skin.emptyText }}
            >
              {t('palette.empty')}
            </div>
          ) : (
            sections.map((section) => (
              <SectionView
                key={section.id}
                title={t(`palette.section.${section.id}`)}
                items={section.items}
                cursor={cursor}
                flatBaseIndex={section.baseIndex}
                onHover={setCursor}
                onRun={runCommand}
                skin={skin}
              />
            ))
          )}
        </div>

        {/* Footer — keyboard hints */}
        <div
          className="flex items-center gap-3 px-3.5 h-8 text-[10px] font-mono"
          style={{
            borderTop: `1px solid ${skin.footerBorder}`,
            color: skin.footerText,
            background: skin.footerBg,
          }}
        >
          <FooterHint icon={ArrowUp}        label={t('palette.footer.navigate')} rotate={false} />
          <span style={{ opacity: 0.4 }}>·</span>
          <FooterHint icon={CornerDownLeft} label={t('palette.footer.open')}     rotate={false} />
          <span style={{ opacity: 0.4 }}>·</span>
          <span>ESC {t('palette.footer.close').replace(/^Esc\s+|^ESC\s+/, '')}</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function FooterHint({
  icon: Icon, label, rotate,
}: { icon: ComponentType<{ className?: string }>; label: string; rotate: boolean }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className={`w-3 h-3 ${rotate ? 'rotate-180' : ''}`} />
      {label}
    </span>
  );
}
