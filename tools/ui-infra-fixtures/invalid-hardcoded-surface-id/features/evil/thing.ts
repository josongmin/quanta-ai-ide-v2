// Fixture (WBT-A5R): a hardcoded `core.<surface>` id literal in feature code.
// Surface identity must come from the metadata SoT + the single activator map,
// so noHardcodedSurfaceId must flag the literal below. The comment id and the
// template id must NOT be flagged (AST-invisible / not a plain literal).
//
//   core.intelligence  <- in a comment, must not count
export const target = 'core.reviews';
export function idFor(kind: string): string {
  return `core.${kind}`; // template, must not count
}
