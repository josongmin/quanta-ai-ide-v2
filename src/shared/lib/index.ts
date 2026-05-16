// Public API for the shared lib: theme-aware color/tone helpers, blueprint
// surface tokens, formatters, deterministic RNG, the keyboard-shortcut hook,
// and the Tauri runtime adapters.
export { C, type Tone } from './color';
export { pageBackground } from './blueprint-surface';
export { round1, pct, languageHue, formatNumber } from './format';
export { makeRng } from './rng';
export { useShortcut, type Shortcut } from './useShortcut';
export { useClickOutside } from './useClickOutside';
export { useHoverStyle } from './useHoverStyle';
export { shallowEqual } from './shallowEqual';
export { useScrollRestoration } from './useScrollRestoration';
export {
  scanForSecrets, redactText,
  type SecretMatch, type SecretPattern, type SecretSeverity,
} from './redact';
export {
  isTauri,
  isMacOS,
  useMenuEvent,
  type MenuEventId,
} from './tauri';
