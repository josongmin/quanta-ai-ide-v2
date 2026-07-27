// Fixture (WBT-A5R): a built-in surface activator whose view is resolved from the
// app/ layer. A surface root must live in a widgets/ or features/ slice, so
// surfaceRootLocation must flag the `@app/...` import() target. The `@widgets`
// activator below is fine and must NOT be flagged.
const ACTIVATORS = {
  'core.ok': () => import('@widgets/coding-stage').then((m) => m.CodingStage),
  'core.bad': () => import('@app/router/intelligence').then((m) => m.IntelligenceLayout),
};

export { ACTIVATORS };
