import { lazy, Suspense, useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Bell, ChevronDown, Palette,
  Sun, Moon, RotateCcw, Radar,
} from 'lucide-react';
import { useTheme } from '@shared/theme';
import { isMacOS, isTauri, useMenuEvent, useShortcut } from '@shared/lib';
import { useTranslation } from '@shared/i18n';
import { IconButton } from '@shared/ui';
import { useFilterStore } from '@features/filter-files';
import { usePrefs, SettingsPanel } from '@features/tweak-prefs';
import { WorkspaceTabsStrip } from '@features/workspace-tabs';
// Hooks must be static (can't lazy-load a hook); the palette UI itself
// is lazy below to match the sibling modals' chunking.
import {
  useControlPaletteStore,
  useGlobalShortcuts,
  useTrackRecents,
} from '@features/control-palette';

// Cmd/Ctrl+K global browse palette. Lazy — the heavy command UI is only
// paid for once the user actually opens it; the Cmd-K binding lives in
// useGlobalShortcuts (static) so the shortcut works before this loads.
const ControlPalette = lazy(() =>
  import('@features/control-palette').then((m) => ({ default: m.ControlPalette })),
);

// Heavy modal — only paid for once the user actually opens it. Keeps the
// chat-agent slice (and its TokensContext deps) out of the initial chunk.
const TokensPanel = lazy(() =>
  import('@features/chat-agent').then((m) => ({ default: m.TokensPanel })),
);

// Activity control panel + tray are part of the same slice; lazy-load so
// users who don't open the panel don't pay for it. The tray itself is
// lightweight but lives behind the same boundary for cohesion.
const ActivityControlPanel = lazy(() =>
  import('@features/ai-activity').then((m) => ({ default: m.ActivityControlPanel })),
);
const ActivityTray = lazy(() =>
  import('@features/ai-activity').then((m) => ({ default: m.ActivityTray })),
);

// Help modal for keyboard shortcuts. Lazy because it's only paid for when
// the user explicitly asks for help (Cmd+/).
const ShortcutsModal = lazy(() =>
  import('@features/help-shortcuts').then((m) => ({ default: m.ShortcutsModal })),
);

// Per-tab stages used to be lazy-imported here and switched on `tab`. The
// router owns those code-splits now (see `app/router/router.tsx`); AppShell
// is purely the chrome and renders whichever route content TanStack hands
// it via `children` (the root route's <Outlet/> output).

// The workspace tab strip (mode tabs) is now owned by the
// `@features/workspace-tabs` feature — kind→route mapping, icons and
// labels live in its registry (`@app/router/workspaceTabsRegistry`), so
// AppShell no longer keeps a parallel TABS/TAB_TO table here.

export default function AppShell({ children }: { children: ReactNode }) {
  const [tokensOpen, setTokensOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  // `isDark` is still needed to swap between Sun/Moon icons and to drive the
  // theme-toggle accent colour. All other surface/text styling now flows
  // through the semantic-token CSS variables (theme-aware automatically).
  const { isDark, toggle: toggleTheme } = useTheme();
  // Narrow selector: action setters are reference-stable in zustand, so this
  // never re-renders due to filter/search churn elsewhere in the store.
  const resetAll = useFilterStore((s) => s.resetAll);
  const prefs = usePrefs();
  const { t } = useTranslation('app');
  const { t: tc } = useTranslation('common');

  // Reserve room on the left for macOS traffic lights when running inside the
  // Tauri shell with `titleBarStyle: Overlay`. In the browser this collapses
  // to zero so the layout stays identical.
  const showTrafficLightSpacer = useMemo(() => isTauri() && isMacOS(), []);

  // Bridge the native `Settings…` menu item (Cmd+,) to SettingsPanel's own
  // trigger button. Cheaper than threading a controlled-open prop through
  // the feature slice, and the button is always rendered.
  const settingsSlotRef = useRef<HTMLSpanElement>(null);
  const openSettings = useCallback(() => {
    settingsSlotRef.current?.querySelector('button')?.click();
  }, []);
  useMenuEvent('settings', openSettings);

  // Browser-path keyboard shortcuts. The Tauri menu already covers Cmd+,;
  // wiring it here as well lets the same combo work from the web build.
  // `ignoreInputs: false` because users may invoke these while focused in
  // the search bar or other inputs.
  useShortcut({ key: ',', ctrl: true, ignoreInputs: false }, openSettings);
  useShortcut(
    { key: 'a', ctrl: true, shift: true, ignoreInputs: false },
    useCallback(() => { setActivityOpen((v) => !v); }, []),
  );
  useShortcut(
    { key: '/', ctrl: true, ignoreInputs: false },
    useCallback(() => { setHelpOpen((v) => !v); }, []),
  );

  // Global browse palette (Cmd/Ctrl+K) + Cmd+1..7 tab jumps + `?` help.
  // The feature shipped unmounted, so the shortcut did nothing — wiring
  // the hook here is what actually makes Cmd-K open it.
  useGlobalShortcuts({ onOpenHelp: useCallback(() => { setHelpOpen(true); }, []) });
  useTrackRecents();
  const paletteOpen = useControlPaletteStore((s) => s.open);

  return (
    <div
      className="w-full h-screen flex flex-col overflow-hidden"
      style={{ background: 'var(--bg-canvas)' }}
    >
      <header
        // The whole header is a drag handle; interactive children opt out via
        // `data-tauri-drag-region="false"` (Tauri honours the closest ancestor).
        data-tauri-drag-region
        className={`shrink-0 h-12 flex items-stretch border-b select-none ${isDark ? 'backdrop-blur-xl' : ''}`}
        style={{
          borderColor: 'var(--border-muted)',
          background: 'var(--bg-overlay)',
        }}
      >
        {showTrafficLightSpacer && (
          <div
            data-tauri-drag-region
            aria-hidden
            className="shrink-0"
            style={{ width: 78 }}
          />
        )}
        <button type="button"
          data-tauri-drag-region="false"
          className="flex items-center gap-2 px-4 border-r transition-colors hover-surface"
          style={{
            borderColor: 'var(--border-muted)',
            color: 'var(--fg-muted)',
          }}
        >
          <div
            className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black"
            style={{
              background: 'var(--fg-strong)',
              color: 'var(--bg-canvas)',
            }}
          >
            CF
          </div>
          <span className="text-[12px] font-bold">acme-monorepo</span>
          <ChevronDown className="w-3 h-3" style={{ color: 'var(--fg-subtle)' }} />
        </button>

        {/* Chrome-style workspace tab strip. It IS the flexible middle
            region (single flex-1 — must not coexist with another flex-1
            drag handle, or the two split the bar and the strip gets
            half). Owns its own navigation (clicking a tab pushes the
            kind's canonical route), so the existing router/<Outlet>
            still renders the active content — no WorkspaceTabsHost /
            route refactor needed. The strip's own empty track area
            stays draggable for window moves. */}
        <div data-tauri-drag-region="false" className="min-w-0 flex-1">
          <div className="flex min-w-0 h-full items-center">
            <WorkspaceTabsStrip />
          </div>
        </div>

        <div data-tauri-drag-region="false" className="flex items-center gap-1 px-3">
          <IconButton
            icon={RotateCcw}
            label={t('action.resetFilters')}
            onClick={resetAll}
            tone="muted"
          />
          <span ref={settingsSlotRef} className="contents">
            <SettingsPanel compact />
          </span>
          <IconButton
            icon={isDark ? Sun : Moon}
            label={t('action.toggleTheme')}
            onClick={toggleTheme}
            tone="accent"
          />
          {/* `isDark` is intentionally read above so the icon swaps; tone is
              kept on the muted/accent token spectrum to align with the rest
              of the GNB rail. */}

          <div className="mx-1 h-5 w-px" style={{ background: 'var(--border-default)' }} />

          <span
            className="text-[10px] font-black uppercase tracking-[0.18em] px-2 py-1 rounded-md"
            style={{
              color: 'var(--fg-muted)',
              background: 'var(--bg-surface-muted)',
            }}
            title={tc('plan.current')}
          >
            {prefs.plan}
          </span>
          <span
            className="text-[11px] font-mono px-2 py-1 rounded-md"
            style={{
              color: 'var(--fg-muted)',
              background: 'var(--bg-surface-muted)',
            }}
          >
            {tc('main')}
          </span>
          <IconButton
            icon={Radar}
            label={t('action.aiActivity', { defaultValue: 'AI activity' })}
            onClick={() => { setActivityOpen(true); }}
            tone="muted"
          />
          <IconButton
            icon={Palette}
            label={t('action.designTokens')}
            onClick={() => { setTokensOpen(true); }}
            tone="muted"
          />
          <IconButton
            icon={Bell}
            label={t('action.notifications')}
            tone="muted"
          />
          <div
            className="w-7 h-7 rounded-full bg-gradient-to-br flex items-center justify-center text-[10px] font-black ml-1"
            style={{
              backgroundImage: 'linear-gradient(to bottom right, var(--intent-success-vivid), var(--fg-link))',
              color: 'var(--bg-canvas)',
            }}
          >
            SK
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 relative">
        {/* The router's root <Outlet/> hands us the active tab's content
            via `children`; AppShell itself stays route-agnostic. */}
        {children}
      </main>

      {tokensOpen && (
        <Suspense fallback={null}>
          <TokensPanel onClose={() => { setTokensOpen(false); }} />
        </Suspense>
      )}

      {/* AI activity tray + control panel. Tray is always available when
          there are activities and the prefs allow it; the control panel is
          modal and opens via the GNB Radar button. */}
      <Suspense fallback={null}>
        <ActivityTray />
      </Suspense>
      {activityOpen && (
        <Suspense fallback={null}>
          <ActivityControlPanel
            open={activityOpen}
            onClose={() => { setActivityOpen(false); }}
          />
        </Suspense>
      )}

      {helpOpen && (
        <Suspense fallback={null}>
          <ShortcutsModal
            open={helpOpen}
            onClose={() => { setHelpOpen(false); }}
          />
        </Suspense>
      )}

      {paletteOpen && (
        <Suspense fallback={null}>
          <ControlPalette
            onOpenHelp={() => { setHelpOpen(true); }}
            onOpenTokens={() => { setTokensOpen(true); }}
            onOpenActivity={() => { setActivityOpen(true); }}
          />
        </Suspense>
      )}
    </div>
  );
}

