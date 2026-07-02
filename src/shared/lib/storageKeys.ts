// Central registry of every web-storage (localStorage / sessionStorage) key
// used across the app. This is the single source of truth: nothing should
// write a raw key string anywhere else.
//
// RULES
// - Values are byte-identical to the historical inline literals. Renaming a
//   key orphans existing users' persisted data, so keys are NEVER changed
//   here — only centralised. Version suffixes (`.v1`, `.v3`, `:v2`) are part
//   of the key and are preserved exactly.
// - Legacy keys that migration logic still reads (e.g. token v1 → v3) are
//   kept alongside their current counterpart so the migration keeps working.
// - Some entries are *prefixes*: the runtime key is built by appending a
//   dynamic segment (project id, scroll scope/route, …). Those are grouped
//   under `PREFIX` and documented at their call sites.

export const STORAGE_KEYS = Object.freeze({
  // App shell — theme is read very early in main.tsx and by ThemeContext.
  theme: 'app:theme',

  // Chat agent (cflens.*) — tokens with a v1→v3 migration path, plus the
  // resizable panel height.
  tokens: 'cflens.tokens.v3',
  tokensLegacy: 'cflens.tokens.v1', // read-only, consumed by the v1→v3 migration
  chatAgentHeight: 'chat-agent:height',

  // User preferences / activity (cflens.*).
  prefs: 'cflens.prefs.v1',
  aiActivityPrefs: 'cflens.aiActivity.prefs.v1',

  // i18n — the detected/selected language (i18next lookupLocalStorage).
  i18nLang: 'cflens.i18n.lang',

  // Intelligence panel layout — persisted drag widths.
  panelLeftWidth: 'intelligence:left-panel-width',
  panelRightWidth: 'intelligence:right-panel-width',

  // Workspace tabs (zustand persist store).
  workspaceTabs: 'workspace-tabs:v2',

  // Auth stage.
  authRateHistory: 'auth.rate.history.v1',
  authLastUsed: 'auth.lastUsed.v1',

  // Review stage (review.*).
  reviewCustomViews: 'review.customViews.v1',
  reviewPingSentInSession: 'review.ping.sentInSession.v1',
  reviewSession: 'review.session.v1',
  reviewEscalationDismissed: 'review.escalation.dismissed.v1',
  reviewPins: 'review.pins.v1',

  // Coding stage (coding:*).
  codingHighContrast: 'coding:highContrast',
  codingDensity: 'coding:density',
  codingModel: 'coding:model',
  codingPromptHistory: 'coding:prompt-history',
} as const);

// Prefix keys — the full storage key is built by appending a dynamic
// segment. Kept separate so callers know to concatenate, never use bare.
export const STORAGE_KEY_PREFIX = Object.freeze({
  // `scroll:<scope>:<routeKey>` — per-route scroll offset restoration.
  scroll: 'scroll:',
  // `coding:project-default-model:<projectId>` — per-project default model.
  codingProjectDefaultModel: 'coding:project-default-model:',
} as const);

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
