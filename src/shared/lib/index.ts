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
export { toneToColors, type SemanticTone, type ToneColors } from './toneToColors';
export {
  safeLocalSet, safeLocalGet, safeSessionSet, safeSessionGet,
  safeLocalRemove, safeSessionRemove,
} from './safeStorage';
export {
  STORAGE_KEYS, STORAGE_KEY_PREFIX, type StorageKey,
} from './storageKeys';
export { clamp, clamp01 } from './clamp';
export { safeHref } from './safeHref';
export { assertNever } from './assertNever';
export { useCopyToClipboard } from './useCopyToClipboard';
export { useRovingMenuFocus } from './useRovingMenuFocus';
export { isEditableTarget } from './isEditableTarget';
export { shallowEqual } from './shallowEqual';
export { systemRuntimeEnv, type RuntimeEnv } from './runtimeEnv';
export { useScrollRestoration } from './useScrollRestoration';
export { useScrollLock } from './useScrollLock';
export {
  scanForSecrets, redactText,
  type SecretMatch, type SecretPattern, type SecretSeverity,
} from './redact';
export {
  isTauri,
  startWindowDrag,
  prewarmWindowDrag,
  useWindowDragHandle,
  isMacOS,
  useMenuEvent,
  type MenuEventId,
} from './tauri';
