// Public API for the design system.
// Feature/widget code should consume `applyTokens` + the semantic getters.
// Primitives are exported only for the live token editor in `TokensContext`.

export * as primitives from './primitives';
export { semantic, type SemanticTokens, type Theme } from './semantic';
export * as components from './components';
// Boot emitter (applyTokens) + the preset-aware emitters the live token editor
// drives (applySemanticTheme/applyGlobalTokens/applyGlassTints) — all in the
// design-system layer now, not inside a feature.
export { applyTokens, applySemanticTheme, applyGlassTints, applyGlobalTokens } from './applyTokens';
export type { Tokens, GlobalTokenSections } from './editable';
