// Build the live command list. Pure function: takes plain props (i18n
// translator, current theme, action callbacks) and returns the flat
// Command[] the renderer consumes. Re-derived on every render in the
// host component — deps are tiny (a t() call + 2 booleans), so the
// allocation cost is invisible compared to the React render itself.

import type { TFunction } from 'i18next';
import type { Command, NavigateCommand, ActionCommand } from '../model/types';

export type BuildContext = {
  t: TFunction;
  isDark: boolean;
  recents: string[];
  // Action callbacks — wired in by AppShell so this module stays free
  // of widget imports and circular-dep risk.
  toggleTheme: () => void;
  resetFilters: () => void;
  openHelp: () => void;
  openTokens: () => void;
  openActivity: () => void;
}

// Single source of truth for navigation commands. Mirrors AppShell's
// TABS array but re-exports here so the palette doesn't tightly bind to
// AppShell internals (one-way dependency: AppShell imports the palette,
// not the reverse).
export const NAV_TABS = [
  { id: 'intelligence', path: '/intelligence', shortcut: '⌘1', iconKey: 'brain' },
  { id: 'coding',       path: '/coding',       shortcut: '⌘2', iconKey: 'code' },
  { id: 'agents',       path: '/agents',       shortcut: '⌘3', iconKey: 'bot' },
  { id: 'reviews',      path: '/reviews',      shortcut: '⌘4', iconKey: 'pr' },
  { id: 'admission',    path: '/admission',    shortcut: '⌘5', iconKey: 'shield' },
  { id: 'fixes',        path: '/fixes',        shortcut: '⌘6', iconKey: 'wand' },
] as const;

export function buildCommands(ctx: BuildContext): Command[] {
  const out: Command[] = [];

  // 1. Recents (only when non-empty — otherwise the section is dead UI)
  for (const path of ctx.recents) {
    const tab = NAV_TABS.find((t) => t.path === path);
    if (!tab) continue;
    const label = ctx.t(`tab.${tab.id}`);
    const r: NavigateCommand = {
      id: `recent:${path}`,
      kind: 'recent',
      label,
      path,
      iconKey: tab.iconKey,
      shortcut: tab.shortcut,
    };
    out.push(r);
  }

  // 2. Navigate — every tab. Recent entries above already filter dupes
  //    in the renderer's section grouping, so we don't omit them here.
  for (const tab of NAV_TABS) {
    const label = ctx.t(`tab.${tab.id}`);
    const n: NavigateCommand = {
      id: `nav:${tab.id}`,
      kind: 'navigate',
      label: ctx.t('palette.go', { label }),
      path: tab.path,
      iconKey: tab.iconKey,
      shortcut: tab.shortcut,
      keywords: [tab.id, label, tab.path],
    };
    out.push(n);
  }

  // 2.5 Internal — surfaces that are not GNB tabs but are reachable from
  //     the palette. Catalog is the dev-facing index of every SaaS scaffold
  //     page; keep it findable via "catalog" / "카탈로그".
  const catalog: NavigateCommand = {
    id: 'nav:catalog',
    kind: 'navigate',
    label: 'Open SaaS feature catalog',
    path: '/catalog',
    iconKey: 'list',
    keywords: ['catalog', ' 카탈로그', 'index', 'pages', 'saas', 'scaffold', 'directory'],
  };
  out.push(catalog);

  // Appearance / theme settings (mode, accent, density, syntax-theme
  // presets). Theme selection is a full page (/me/appearance), not a
  // popup — this makes it one keystroke away from Cmd-K.
  const appearance: NavigateCommand = {
    id: 'nav:appearance',
    kind: 'navigate',
    label: 'Appearance & theme',
    path: '/me/appearance',
    iconKey: 'palette',
    keywords: ['theme', 'appearance', 'tokyo', 'preset', 'accent', 'dark', 'light', '테마', '외관', '프리셋', '색'],
  };
  out.push(appearance);

  // 3. Actions — global toggles. Locale-friendly keywords so a Korean
  //    user can find them with mixed input.
  const themeLabel = ctx.isDark
    ? ctx.t('palette.action.themeLight')
    : ctx.t('palette.action.themeDark');
  const themeAction: ActionCommand = {
    id: 'action:theme',
    kind: 'action',
    label: themeLabel,
    iconKey: ctx.isDark ? 'sun' : 'moon',
    keywords: ['theme', 'dark', 'light', 'mode', '테마', '라이트', '다크', '모드'],
    run: ctx.toggleTheme,
  };
  out.push(themeAction);

  out.push({
    id: 'action:reset-filters',
    kind: 'action',
    label: ctx.t('palette.action.resetFilters'),
    iconKey: 'undo',
    keywords: ['reset', 'filter', 'clear', '필터', '초기화', '리셋'],
    run: ctx.resetFilters,
  });

  out.push({
    id: 'action:tokens',
    kind: 'action',
    label: ctx.t('palette.action.tokens'),
    iconKey: 'coins',
    keywords: ['tokens', 'cost', 'usage', '토큰', '비용'],
    run: ctx.openTokens,
  });

  out.push({
    id: 'action:activity',
    kind: 'action',
    label: ctx.t('palette.action.activity'),
    iconKey: 'activity',
    keywords: ['activity', 'jobs', 'agents', '활동', '에이전트'],
    run: ctx.openActivity,
  });

  out.push({
    id: 'action:help',
    kind: 'action',
    label: ctx.t('palette.action.help'),
    iconKey: 'help',
    shortcut: '?',
    keywords: ['help', 'shortcuts', '도움말', '단축키'],
    run: ctx.openHelp,
  });

  return out;
}
