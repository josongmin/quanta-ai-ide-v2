// Public API for the shared lib: theme-aware color/tone helpers, blueprint
// surface tokens, formatters, deterministic RNG, the keyboard-shortcut hook,
// and the Tauri runtime adapters.
export { C, type Tone } from './color';
export { tokens, pageBackground } from './blueprint-surface';
export { round1, pct, languageHue, formatNumber, formatTimestamp, formatDate } from './format';
export { makeRng } from './rng';
export { useShortcut, type Shortcut } from './useShortcut';
export { useClickOutside } from './useClickOutside';
export {
  scanForSecrets, redactText, shannonEntropy,
  BUILT_IN_PATTERNS,
  type SecretMatch, type SecretPattern, type SecretSeverity,
} from './redact';
export {
  isTauri,
  invoke,
  TauriUnavailableError,
  isMacOS,
  openExternal,
  useMenuEvent,
  tauriCommands,
  type MenuEventId,
} from './tauri';
