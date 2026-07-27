// Leaf review-stage types. ReviewTabKey lives here (not in ReviewStage.tsx) so
// the model hook, lib helpers, and part components can import it without a cycle
// back through the top-level component. The new layout is sectioned rather than
// tabbed, but these keys stay as anchor IDs to scroll to / focus.
export type ReviewTabKey =
  | 'overview' | 'insights' | 'files' | 'risk' | 'checks' | 'activity';
