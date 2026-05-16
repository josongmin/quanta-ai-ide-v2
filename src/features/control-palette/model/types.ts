// Control palette domain. Three command kinds:
//   - navigate: jump to a route. Carries the path string.
//   - action:   run an arbitrary callback (theme toggle, reset, etc.).
//   - recent:   a recently-visited route surfaced first when the query
//               is empty. Same shape as navigate, separate origin so we
//               can decay it from the recents list on click.
//
// Entries are flat — sectioning happens in the renderer based on `kind`.
// Keywords are a free-text bag the matcher splices into the query so
// "테마 라이트" can find "Toggle theme · light".

export type CommandKind = 'navigate' | 'action' | 'recent';

export type BaseCommand = {
  id: string;
  kind: CommandKind;
  label: string;
  hint?: string;
  // Tokens that should match in addition to `label`. Locale-aware
  // synonyms (e.g. Korean alias for an English action) live here.
  keywords?: string[];
  // Single-key shortcut hint shown on the right. Cosmetic — the
  // actual binding is registered separately so we don't get drift
  // between display and behaviour.
  shortcut?: string;
  // Lucide icon name lookup; resolved in the UI to keep the type free
  // of React imports.
  iconKey?: string;
}

export type NavigateCommand = {
  kind: 'navigate' | 'recent';
  path: string;
} & BaseCommand

export type ActionCommand = {
  kind: 'action';
  run: () => void;
} & BaseCommand

export type Command = NavigateCommand | ActionCommand;
