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
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from '@tanstack/react-router';
import {
  Search, ArrowRight, ArrowUp, CornerDownLeft,
  Brain, Code2, Bot, GitPullRequest, ShieldCheck, Wand2, Sun, Moon,
  Undo2, Coins, Activity, HelpCircle, History, List,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import { useTheme } from '@shared/theme';
import { useFilterStore } from '@entities/filter-state';
import { useControlPaletteStore } from '../model/store';
import type { Command } from '../model/types';
import { matchCommands } from '../lib/match';
import { buildCommands } from '../lib/buildCommands';

// Light-mode and dark-mode have very different ideas of how a "modal
// surface" should look. The semantic tokens get us most of the way,
// but the palette has a few spots — ⌘K chips, active-row icon wells,
// hover backgrounds — that need explicit per-theme tuning to stay
// legible. Centralised here so the JSX stays clean.
function paletteSkin(isDark: boolean) {
  return {
    backdrop:        isDark ? 'rgba(0,0,0,0.55)' : 'rgba(15,18,26,0.32)',
    panelBg:         isDark ? 'rgba(20,24,32,0.92)' : 'rgba(255,255,255,0.97)',
    panelBorder:     isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,18,26,0.10)',
    panelShadow:     isDark
      ? '0 24px 80px -12px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04) inset'
      : '0 24px 60px -16px rgba(15,18,26,0.30), 0 0 0 1px rgba(15,18,26,0.04) inset',
    headerBorder:    isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,18,26,0.08)',
    inputColor:      isDark ? 'rgba(255,255,255,0.95)' : 'rgba(15,18,26,0.95)',
    placeholder:     isDark ? 'rgba(255,255,255,0.40)' : 'rgba(15,18,26,0.42)',
    sectionLabel:    isDark ? 'rgba(255,255,255,0.40)' : 'rgba(15,18,26,0.42)',
    rowHover:        isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,18,26,0.05)',
    rowActiveBg:     isDark ? 'rgba(122,167,212,0.16)' : 'rgba(31,91,156,0.10)',
    rowActiveText:   isDark ? '#ffffff' : 'rgba(15,18,26,0.95)',
    rowText:         isDark ? 'rgba(255,255,255,0.85)' : 'rgba(15,18,26,0.82)',
    iconWellIdleBg:  'transparent',
    iconWellActiveBg: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(31,91,156,0.14)',
    iconColorIdle:   isDark ? 'rgba(255,255,255,0.55)' : 'rgba(15,18,26,0.55)',
    iconColorActive: isDark ? '#ffffff'                : '#1f5b9c',
    chipBg:          isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,18,26,0.06)',
    chipText:        isDark ? 'rgba(255,255,255,0.65)' : 'rgba(15,18,26,0.55)',
    chipBorder:      isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,18,26,0.10)',
    footerBg:        isDark ? 'rgba(255,255,255,0.03)' : 'rgba(15,18,26,0.03)',
    footerText:      isDark ? 'rgba(255,255,255,0.50)' : 'rgba(15,18,26,0.50)',
    footerBorder:    isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,18,26,0.08)',
    emptyText:       isDark ? 'rgba(255,255,255,0.45)' : 'rgba(15,18,26,0.45)',
  };
}

const ICONS: Record<string, LucideIcon> = {
  brain:    Brain,
  search:   Search,
  code:     Code2,
  bot:      Bot,
  pr:       GitPullRequest,
  shield:   ShieldCheck,
  wand:     Wand2,
  sun:      Sun,
  moon:     Moon,
  undo:     Undo2,
  coins:    Coins,
  activity: Activity,
  help:     HelpCircle,
  history:  History,
  list:     List,
};

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
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset query + cursor on every fresh open. Keyed off `openedAt` so
  // re-opens always start clean even if the prop tree is otherwise
  // stable. Cursor also resets when the filtered list shape changes.
  const [prevOpenedAt, setPrevOpenedAt] = useState(openedAt);
  if (open && openedAt !== prevOpenedAt) {
    setPrevOpenedAt(openedAt);
    setQuery('');
    setCursor(0);
  }
  useEffect(() => {
    if (!open) return;
    // Focus next frame so the input exists in the DOM after the
    // animation class lands. Without rAF the autofocus races with
    // React's commit phase.
    requestAnimationFrame(() => { inputRef.current?.focus(); });
  }, [open, openedAt]);

  // Sectioned, ranked result list. We separate the cursor index from
  // the section structure: the list is flat for keyboard, sectioned
  // for rendering.
  const ranked = useMemo(() => matchCommands(commands, query), [commands, query]);
  const sections = useMemo(() => sectionize(ranked.map((r) => r.command)), [ranked]);
  const flat = useMemo(() => sections.flatMap((s) => s.items), [sections]);

  const [prevFlatLen, setPrevFlatLen] = useState(flat.length);
  if (prevFlatLen !== flat.length) {
    setPrevFlatLen(flat.length);
    setCursor((c) => Math.min(c, Math.max(0, flat.length - 1)));
  }

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
      if (target) runCommand(target);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  }

  // Scroll the highlighted row into view as the cursor moves.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-cursor="${String(cursor)}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  if (!open) return null;

  const skin = paletteSkin(isDark);

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
          {flat.length === 0 ? (
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

type Skin = ReturnType<typeof paletteSkin>;

// ─── helpers ────────────────────────────────────────────────────────────

type Section = {
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

function SectionView({
  title, items, cursor, flatBaseIndex, onHover, onRun, skin,
}: {
  title: string;
  items: Command[];
  cursor: number;
  flatBaseIndex: number;
  onHover: (index: number) => void;
  onRun: (cmd: Command) => void;
  skin: Skin;
}) {
  return (
    <div className="mb-1.5 last:mb-0">
      <div
        className="px-3.5 pt-2 pb-1 text-[9px] font-black uppercase tracking-[0.18em]"
        style={{ color: skin.sectionLabel }}
      >
        {title}
      </div>
      {items.map((cmd, i) => {
        const flatIndex = flatBaseIndex + i;
        const active = flatIndex === cursor;
        return (
          <CommandRow
            key={cmd.id}
            cmd={cmd}
            active={active}
            flatIndex={flatIndex}
            onHover={() => { onHover(flatIndex); }}
            onRun={() => { onRun(cmd); }}
            skin={skin}
          />
        );
      })}
    </div>
  );
}

function CommandRow({
  cmd, active, flatIndex, onHover, onRun, skin,
}: {
  cmd: Command;
  active: boolean;
  flatIndex: number;
  onHover: () => void;
  onRun: () => void;
  skin: Skin;
}) {
  const Icon = cmd.iconKey ? ICONS[cmd.iconKey] ?? null : null;
  const HistoryIcon = cmd.kind === 'recent' ? History : null;
  return (
    <div
      role="option"
      aria-selected={active}
      data-cursor={flatIndex}
      tabIndex={-1}
      onMouseEnter={onHover}
      onClick={onRun}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRun(); } }}
      className="flex items-center gap-2.5 mx-1.5 px-2.5 h-9 rounded-md cursor-pointer transition-colors"
      style={{
        background: active ? skin.rowActiveBg : 'transparent',
        color: active ? skin.rowActiveText : skin.rowText,
      }}
    >
      <span
        className="shrink-0 w-5 h-5 rounded flex items-center justify-center transition-colors"
        style={{
          background: active ? skin.iconWellActiveBg : skin.iconWellIdleBg,
          color: active ? skin.iconColorActive : skin.iconColorIdle,
        }}
      >
        {HistoryIcon ? <HistoryIcon className="w-3 h-3" />
          : Icon ? <Icon className="w-3.5 h-3.5" />
          : <ArrowRight className="w-3 h-3" />}
      </span>
      <span className="flex-1 min-w-0 text-[12px] truncate">{cmd.label}</span>
      {cmd.hint !== undefined && (
        <span className="text-[10px] font-mono shrink-0" style={{ color: skin.chipText }}>
          {cmd.hint}
        </span>
      )}
      {cmd.shortcut !== undefined && (
        <span
          className="text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0"
          style={{
            background: skin.chipBg,
            color: skin.chipText,
            border: `1px solid ${skin.chipBorder}`,
          }}
        >
          {cmd.shortcut}
        </span>
      )}
    </div>
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
