// Build-time guard: no heavy lazy-only area may end up in the ENTRY chunk's
// static-import closure. Runs off Rollup's output bundle (a Vite plugin passes
// it in), which — unlike the post-build vite manifest — exposes each chunk's
// source MODULES. That distinction is the whole point: a stray static import of
// a stage inlines its modules into the entry chunk with NO separate manifest
// key, so the manifest-key fence in bundle-budget.mjs cannot see it; this can.
//
// Heavy lazy-only roots: every `src/widgets/*-stage/` surface, plus the lazy
// core surfaces that live under `src/features/` (dynamic-import targets in
// builtinSurfaces.ts: admission-rules, verified-fix) and the switch-mode three.js
// viz engines and the chat-agent feature.
// Mirrors the lazy dynamic-import targets in app/workbench/builtinSurfaces.ts
// ACTIVATORS. Most lazy surfaces are `widgets/*-stage`, but `catalog` and
// `me-stage` are widgets too and `admission-rules`/`verified-fix` are features —
// all must stay off the critical path. Keep in sync when a lazy surface is added.
export const HEAVY_ROOT_RES = [
  /\/src\/widgets\/(?:[^/]+-stage|catalog)\//,
  /\/src\/features\/switch-mode\/lib\//,
  /\/src\/features\/chat-agent\//,
  /\/src\/features\/admission-rules\//,
  /\/src\/features\/verified-fix\//,
];

// Eager EXCEPTIONS inside a heavy root that are legitimately on the critical
// path. chat-agent's `model/` holds the app-wide token/theme system
// (TokensProvider is mounted at the app root by AppProviders); only these theme
// modules are eager — the chat UI, the palette data, and any future chat-runtime
// module under model/ stay fenced. Fencing the whole feature + allowlisting the
// known-eager files means a NEW heavy module (in model/ or ui/) is caught by
// default, closing the round-2 gap where a model/ addition escaped a /ui/-only fence.
// Anchor the extension explicitly (`\.(ts|tsx)$`) rather than a `\b` word
// boundary: `\b` matches at the `.` before the extension, so it also admitted
// `<token>.<anything>.ts` siblings (e.g. `applyTokens.helpers.ts`) — a NEW heavy
// eager-reachable file that must stay fenced. The anchored form matches exactly
// the four real theme modules and nothing else (XS/BB-R4 fix).
export const EAGER_ALLOW_RES = [
  /\/src\/features\/chat-agent\/model\/(TokensContext|applyTokens|tokenStorage|tokens-types)\.(ts|tsx)$/,
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
      if (HEAVY_ROOT_RES.some((re) => re.test(norm)) && !EAGER_ALLOW_RES.some((re) => re.test(norm))) {
        leaks.push(modId);
      }
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
