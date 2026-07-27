// Build-time guard: no heavy lazy-only area may end up in the ENTRY chunk's
// static-import closure. Runs off Rollup's output bundle (a Vite plugin passes
// it in), which — unlike the post-build vite manifest — exposes each chunk's
// source MODULES. That distinction is the whole point: a stray static import of
// a stage inlines its modules into the entry chunk with NO separate manifest
// key, so the manifest-key fence in bundle-budget.mjs cannot see it; this can.
//
// Heavy lazy-only roots: every `src/widgets/*-stage/` surface, the switch-mode
// three.js viz engines, and the chat-agent UI panel. NOTE chat-agent is only
// fenced at `/ui/` — its `model/` holds the app-wide token/theme system
// (TokensProvider is mounted eagerly at the app root by AppProviders), so the
// model is legitimately on the critical path; only the chat/tokens UI is lazy.
export const HEAVY_ROOT_RES = [
  /\/src\/widgets\/[^/]+-stage\//,
  /\/src\/features\/switch-mode\/lib\//,
  /\/src\/features\/chat-agent\/ui\//,
];

// Given a Rollup output bundle, return the heavy-root module ids that are
// reachable from the entry chunk through STATIC imports only ([] = clean).
export function findStageLeaks(bundle) {
  const chunks = Object.values(bundle).filter((c) => c.type === 'chunk');
  const entry = chunks.find((c) => c.isEntry);
  if (!entry) return [];
  const byFile = new Map(chunks.map((c) => [c.fileName, c]));

  // Transitive STATIC closure over chunk `imports` (never `dynamicImports`).
  const seen = new Set();
  const stack = [entry.fileName];
  while (stack.length) {
    const fn = stack.pop();
    if (seen.has(fn) || !byFile.has(fn)) continue;
    seen.add(fn);
    for (const imp of byFile.get(fn).imports ?? []) stack.push(imp);
  }

  const leaks = [];
  for (const fn of seen) {
    for (const modId of Object.keys(byFile.get(fn).modules ?? {})) {
      const norm = modId.replace(/\\/g, '/');
      if (HEAVY_ROOT_RES.some((re) => re.test(norm))) leaks.push(modId);
    }
  }
  return leaks;
}

// Vite/Rollup plugin. Fails the build if a heavy area leaked onto the critical path.
export function stageLeakGuardPlugin() {
  return {
    name: 'stage-leak-guard',
    generateBundle(_options, bundle) {
      const leaks = findStageLeaks(bundle);
      if (leaks.length) {
        this.error(
          'stage-leak-guard: heavy lazy-only modules leaked into the entry static closure ' +
          '(must load via dynamic import only):\n  ' +
          [...new Set(leaks)].join('\n  '),
        );
      }
    },
  };
}
