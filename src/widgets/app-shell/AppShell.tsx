import { lazy, Suspense, useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import StatusBar, { STATUS_BAR_HEIGHT } from './StatusBar';
import {
  Bell, ChevronDown, Palette,
  RotateCcw,
  Search,
} from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { WorkspaceTabsStrip, WorkspaceTabsHost } from '@features/workspace-tabs';
import { isMacOS, isTauri, useMenuEvent, useShortcut } from '@shared/lib';
import { useTranslation } from '@shared/i18n';
import { IconButton } from '@shared/ui';
import { useFilterStore } from '@entities/filter-state';
import { env } from '@shared/config/env';
import { SettingsPanel } from '@features/tweak-prefs';
// NOTE: the dedicated activity-panel open/close store was removed after
// this chrome was authored (f301417). The panel now lives inside the
// Intelligence stage, so the palette's "open activity" command just
// routes there; `setActivityOpen` is kept as a typed no-op so the
// command wiring below stays intact without resurrecting the old store.
import {
  ControlPalette,
  useControlPaletteStore,
  useGlobalShortcuts,
  useTrackRecents,
} from '@features/control-palette';

// Lazy so the better-auth client (pulled in transitively via entities/session)
// stays out of the initial chunk — the mock demo, which never mounts it, ships
// zero auth code. Loaded only in real-auth mode when the GNB renders it.
// AvatarBadge lives HERE (not in UserMenu.tsx) so the eager mock branch +
// Suspense fallback don't statically drag UserMenu's auth deps back into initial.
const UserMenu = lazy(() =>
  import('./UserMenu').then((m) => ({ default: m.UserMenu })),
);

function AvatarBadge() {
  return (
    <div
      className="w-7 h-7 rounded-full bg-gradient-to-br flex items-center justify-center text-xs font-black ml-1"
      style={{
        backgroundImage: 'linear-gradient(to bottom right, var(--fg-accent), var(--fg-link))',
        color: 'var(--bg-canvas)',
      }}
    >
      SK
    </div>
  );
}

// Heavy modal — only paid for once the user actually opens it. Keeps the
// chat-agent slice (and its TokensContext deps) out of the initial chunk.
const TokensPanel = lazy(() =>
  import('@features/chat-agent').then((m) => ({ default: m.TokensPanel })),
);

// Help modal for keyboard shortcuts. Lazy because it's only paid for when
// the user explicitly asks for help (Cmd+/).
const ShortcutsModal = lazy(() =>
  import('@features/help-shortcuts').then((m) => ({ default: m.ShortcutsModal })),
);

// Global control palette (Cmd-K) — see import block above for the
// reasoning. The hooks live here at module scope so they're easy to
// dead-code eliminate if we later decide to lazy-split the palette.

// Per-tab stages used to be lazy-imported here and switched on `tab`. The
// router owns those code-splits now (see `app/router/router.tsx`); AppShell
// is purely the chrome and renders whichever route content TanStack hands
// it via `children` (the root route's <Outlet/> output).

export default function AppShell({ children }: { children: ReactNode }) {
  const [tokensOpen, setTokensOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const navigate = useNavigate();
  const setActivityOpen = useCallback((_open: boolean) => { /* see note above import block */ }, []);
  // Surface/text styling all flows through the semantic-token CSS
  // variables (theme-aware automatically); no isDark needed here.
  // Narrow selector: action setters are reference-stable in zustand, so this
  // never re-renders due to filter/search churn elsewhere in the store.
  const resetAll = useFilterStore((s) => s.resetAll);
  const { t } = useTranslation('app');

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
    { key: '/', ctrl: true, ignoreInputs: false },
    useCallback(() => { setHelpOpen((v) => !v); }, []),
  );

  // Global control palette: Cmd/Ctrl-K opens, Cmd/Ctrl-1..7 jumps to a
  // top-level tab, bare "?" opens the help modal. The palette content
  // itself reaches into the same setHelp/Tokens/Activity bag below.
  useGlobalShortcuts({ onOpenHelp: useCallback(() => { setHelpOpen(true); }, []) });
  useTrackRecents();
  const paletteOpen = useControlPaletteStore((s) => s.open);
  const setPaletteOpen = useControlPaletteStore((s) => s.setOpen);

  return (
    <div
      className="w-full h-screen flex flex-col overflow-hidden"
      style={{
        background: 'var(--bg-canvas)',
        // Exposed so floating bottom-anchored UIs (chat agent, FocusScanStack
        // shelves) can lift themselves above the status bar without baking
        // the constant in.
        ['--app-statusbar-h' as string]: `${STATUS_BAR_HEIGHT}px`,
      }}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-1.5 focus:rounded-md focus:bg-[color:var(--bg-elevated)] focus:text-[color:var(--fg-strong)] focus:shadow-md focus-ring"
      >
        Skip to main content
      </a>
      {/* Dark-only blur: light theme uses near-opaque --bg-overlay, so an
          always-on backdrop-filter just smears the scrolled page behind the
          translucent header (it reads as content "hidden behind" the GNB)
          while burning GPU each frame. Mirrors the StatusBar treatment. */}
      <style>{`
        html[data-theme="dark"] header[data-app-chrome="gnb"] {
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
        }
      `}</style>
      <header
        // The whole header is a drag handle; interactive children opt out via
        // `data-tauri-drag-region="false"` (Tauri honours the closest ancestor).
        data-tauri-drag-region
        data-app-chrome="gnb"
        className="shrink-0 h-12 flex items-stretch border-b select-none relative z-50"
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
          className="flex items-center gap-2 px-4 border-r transition-colors hover-surface focus-ring-inset"
          style={{
            borderColor: 'var(--border-muted)',
            color: 'var(--fg-muted)',
          }}
        >
          <div
            className="w-5 h-5 rounded-md flex items-center justify-center text-xs font-black"
            style={{
              background: 'var(--fg-strong)',
              color: 'var(--bg-canvas)',
            }}
          >
            CF
          </div>
          <span className="text-base font-bold">acme-monorepo</span>
          <ChevronDown className="w-3 h-3" style={{ color: 'var(--fg-subtle)' }} />
        </button>

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
          {/* Light/dark toggle removed — theme is driven entirely from
              the palette (TokensPanel) so the chrome follows the active
              preset; a separate mode button was redundant/confusing. */}

          {/* Control palette trigger — visible affordance for the same
              Cmd-K binding registered in useGlobalShortcuts. Cosmetic ⌘K
              chip leans on the input pattern from Linear/Vercel: an
              always-visible search slot lets newcomers discover the
              palette without reading docs. */}
          <button
            type="button"
            onClick={() => { setPaletteOpen(true); }}
            aria-label={t('palette.trigger')}
            title={t('palette.trigger')}
            className="hidden sm:inline-flex items-center gap-2 h-7 pl-2.5 pr-1.5 rounded-md text-sm transition-colors focus-ring"
            style={{
              background: 'var(--bg-surface-muted)',
              color: 'var(--fg-muted)',
              border: '1px solid var(--border-muted)',
            }}
          >
            <Search className="w-3.5 h-3.5" />
            <span className="text-xs">{t('palette.placeholder')}</span>
            <span
              className="ml-2 text-2xs font-mono px-1.5 py-0.5 rounded"
              style={{
                background: 'var(--bg-canvas)',
                color: 'var(--fg-subtle)',
                border: '1px solid var(--border-muted)',
              }}
            >
              {t('palette.openShort')}
            </span>
          </button>
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
          {/* Real auth → session-driven user menu (working sign-out); mock demo
              keeps the static avatar so it runs standalone without a backend.
              Fallback = the same avatar shape → no layout shift while the chunk loads. */}
          {env.useRealAuth ? (
            <Suspense fallback={<AvatarBadge />}>
              <UserMenu />
            </Suspense>
          ) : (
            <AvatarBadge />
          )}
        </div>
      </header>

      <main id="main" tabIndex={-1} className="flex-1 min-h-0 relative">
        {/* WorkspaceTabsHost lives ABOVE the route boundary so tab
            switches (URL changes between /intelligence, /coding, …) do
            not unmount it. Without this hoist, tan-stack would tear
            down the host on every tab click, which would unmount every
            mounted tab panel and defeat the keep-mounted contract. The
            host self-hides on non-tab paths (e.g. /me/profile). */}
        <WorkspaceTabsHost />
        {/* The router's root <Outlet/> hands non-tab route content via
            `children` — auth pages skip AppShell entirely, but /me/*
            account pages render here. Tab-kind routes render `null`
            since their visual is the host above. */}
        {children}
      </main>

      <StatusBar />

      {tokensOpen && (
        <Suspense fallback={null}>
          <TokensPanel onClose={() => { setTokensOpen(false); }} />
        </Suspense>
      )}

      {/* Global control palette — single instance, mounted at AppShell so
          every route shares one Cmd-K. Reads from the dedicated zustand
          store; AppShell only threads in the modal-open setters that
          live here so palette actions can drive the chrome surfaces.
          AI activity is an Intelligence-only surface, so the palette's
          "open activity" command routes there before flipping the
          ai-activity panel store. */}
      {paletteOpen && (
        <ControlPalette
          onOpenHelp={() => { setHelpOpen(true); }}
          onOpenTokens={() => { setTokensOpen(true); }}
          onOpenActivity={() => {
            void navigate({ to: '/intelligence' });
            setActivityOpen(true);
          }}
        />
      )}

      {helpOpen && (
        <Suspense fallback={null}>
          <ShortcutsModal
            open={helpOpen}
            onClose={() => { setHelpOpen(false); }}
          />
        </Suspense>
      )}
    </div>
  );
}

