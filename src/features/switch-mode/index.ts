export { ViewModeProvider, useViewMode } from './model/ViewModeContext';
export { default as ModeSwitcher } from './ui/ModeSwitcher';
export { createMode } from './lib/registry';

// NOTE: the individual `create*Mode` factories are *intentionally* not
// re-exported here — they would pull three.js into the initial bundle via
// static analysis. Anything that needs a single mode directly (tests, etc.)
// can deep-import from `@features/switch-mode/lib/<X>Mode`.
