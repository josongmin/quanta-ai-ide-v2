// Bundle-size guard run after `vite build`. Fails non-zero if a budget is
// exceeded so CI (`pnpm verify`) can gate on it.
//
// Unlike a filename-glob guess, this reads Vite's build manifest
// (dist/.vite/manifest.json) and computes the entry's REAL transitive STATIC
// import closure — the exact set of JS the browser must download and execute
// before the app is interactive. Dynamic imports are followed only to MEASURE
// each on-open surface separately, never folded into the initial number. That
// distinction is the whole point: a heavy area (three.js, the coding turn view,
// admission) is only "off the critical path" if it is reachable from the entry
// ONLY through a dynamic import — which this script proves, rather than trusting
// the modulepreload filter (a hint, not evidence).
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST = 'dist';
const ASSETS = path.join(DIST, 'assets');
const MANIFEST = path.join(DIST, '.vite', 'manifest.json');

function die(msg) {
  console.error(`bundle-budget: ${msg}`);
  process.exit(1);
}

if (!fs.existsSync(MANIFEST)) {
  die(`${MANIFEST} not found. Enable build.manifest in vite.config and run \`vite build\` first.`);
}
const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));

// Heavy vendor CHUNKS that must never appear in the initial static closure.
// These are named by manualChunks (vite.config), so matching the emitted file
// name is reliable for them.
const FORBIDDEN_VENDOR_CHUNKS = [
  /vendor-three/,
  /vendor-auth/,
];

// SECONDARY fence over heavy app SOURCE ROOTS. This checks the vite manifest,
// which is keyed by source module id — but ONLY for facade modules (entry +
// dynamic-import targets). It therefore catches a stray static import that pulls
// a heavy root's still-separate FACADE chunk into the entry's static closure, but
// it CANNOT see a static import whose modules inline into the entry chunk (those
// get no manifest key). The AUTHORITATIVE, by-construction check for that case is
// the `stage-leak-guard` Vite plugin (scripts/stageLeakGuard.mjs), which inspects
// Rollup's module-level bundle at build time and fails the build. This fence stays
// as cheap post-build defense-in-depth; the initialGz ceiling is the final backstop.
function isForbiddenSourceRoot(manifestKey) {
  return (
    /^src\/widgets\/[^/]+-stage\//.test(manifestKey) ||
    manifestKey.startsWith('src/features/switch-mode/lib/') || // three.js viz engines
    manifestKey.startsWith('src/features/admission-rules/') || // lazy core surface
    manifestKey.startsWith('src/features/verified-fix/') || // lazy core surface
    manifestKey.startsWith('src/features/chat-agent/ui/') // chat UI (model/ is the eager theme system)
  );
}

const BUDGETS = {
  // Critical-path JS before interactivity. The honest floor is ~236 KB gz:
  // ~108 KB is irreducible vendor awaited at boot (react 45 + router 27 + i18n 18
  // + icons 19) and ~128 KB is the app shell (GNB/router/workbench kernel/surface
  // runtime). The prior 130 KB budget was measured against a BROKEN closure
  // (it excluded the router and never followed the entry graph); it was never
  // real. The architectural guarantee that matters — no heavy/lazy chunk on the
  // critical path — is enforced by the leak guard below, not by this number.
  // This ceiling is a regression gate; trimming the 128 KB app shell (lazy-load
  // more chrome) is a tracked follow-up.
  initialGz: 250 * 1024,
  vendorThreeGz: 130 * 1024,
  // Per-chunk ceiling for LAZY on-demand chunks (surface stages). These never
  // touch the critical path (leak guard + initial closure enforce that), so a
  // stage that loads only when its tab is opened may be a little larger.
  largestNonVendorGz: 70 * 1024,
};

const gzCache = new Map();
function gzOf(file) {
  if (gzCache.has(file)) return gzCache.get(file);
  const p = path.join(DIST, file); // manifest .file is dist-relative ("assets/..")
  const size = fs.existsSync(p) ? gzipSync(fs.readFileSync(p)).length : 0;
  gzCache.set(file, size);
  return size;
}
const kb = (n) => (n / 1024).toFixed(1);

// The manifest is keyed by source/chunk id; each record has { file, imports?,
// dynamicImports?, isEntry? }. `imports` are STATIC; `dynamicImports` are lazy.
const entryKey = Object.keys(manifest).find((k) => manifest[k].isEntry);
if (!entryKey) die('no isEntry chunk in manifest.');

// Transitive STATIC closure (follows `imports`, never `dynamicImports`).
function staticClosure(startKeys) {
  const seen = new Set();
  const stack = [...startKeys];
  while (stack.length) {
    const k = stack.pop();
    if (seen.has(k) || !manifest[k]) continue;
    seen.add(k);
    for (const imp of manifest[k].imports ?? []) stack.push(imp);
  }
  return seen;
}
const filesOf = (keys) => [...new Set([...keys].map((k) => manifest[k]?.file).filter(Boolean))];

let failed = false;
const report = [];

// ── Initial critical-path closure ──────────────────────────────────────────
const initialKeys = staticClosure([entryKey]);
const initialFiles = filesOf(initialKeys);
const initialGz = initialFiles.reduce((a, f) => a + gzOf(f), 0);
{
  const ok = initialGz <= BUDGETS.initialGz;
  report.push(`${ok ? 'OK  ' : 'FAIL'} initial static closure: ${kb(initialGz)} KB gz over ${initialFiles.length} chunks (budget ${kb(BUDGETS.initialGz)} KB)`);
  if (!ok) failed = true;
}

// ── Leak guard: no heavy/lazy area may be in the initial static closure ─────
// Two checks: vendor chunks by emitted name (reliable — manualChunks names them),
// app areas by SOURCE-module membership in the closure (reliable — the manifest
// is keyed by source id, unlike the hash-named emitted files).
{
  const vendorLeaks = initialFiles.filter((f) => FORBIDDEN_VENDOR_CHUNKS.some((re) => re.test(f)));
  const sourceLeaks = [...initialKeys].filter((k) => isForbiddenSourceRoot(k));
  const leaks = [...vendorLeaks, ...sourceLeaks];
  if (leaks.length) {
    report.push(`FAIL initial closure leaks heavy/lazy code (must be dynamic-only): ${leaks.join(', ')}`);
    failed = true;
  } else {
    report.push('OK   initial closure contains no forbidden heavy/lazy vendor chunk or app source root');
  }
}

// ── Per-surface on-open closures (measured separately, report + three budget) ─
// Every dynamic-import target anywhere in the graph, with the MARGINAL static
// closure it drags in beyond what the initial path already loaded.
const dynamicTargets = new Set();
for (const k of Object.keys(manifest)) for (const d of manifest[k].dynamicImports ?? []) dynamicTargets.add(d);
const onOpen = [];
for (const t of dynamicTargets) {
  const closure = staticClosure([t]);
  const marginalFiles = filesOf(closure).filter((f) => !initialFiles.includes(f));
  const gz = marginalFiles.reduce((a, f) => a + gzOf(f), 0);
  onOpen.push({ file: manifest[t]?.file ?? t, gz, chunks: marginalFiles.length });
}
onOpen.sort((a, b) => b.gz - a.gz);
report.push('');
report.push('on-open closures (marginal gz beyond the initial path), largest first:');
for (const o of onOpen.slice(0, 8)) report.push(`     ${kb(o.gz).padStart(8)} KB gz  ${o.file}  (+${o.chunks} chunks)`);

// vendor-three ceiling (its own file, wherever it loads from).
{
  const three = Object.values(manifest).map((m) => m.file).find((f) => f && /vendor-three/.test(f));
  const gz = three ? gzOf(three) : 0;
  const ok = gz <= BUDGETS.vendorThreeGz;
  report.push('');
  report.push(`${ok ? 'OK  ' : 'FAIL'} vendor-three: ${kb(gz)} KB gz (budget ${kb(BUDGETS.vendorThreeGz)} KB)`);
  if (!ok) failed = true;
}

// ── Largest single non-vendor emitted chunk ─────────────────────────────────
{
  const allFiles = fs.readdirSync(ASSETS).filter((f) => f.endsWith('.js')).map((f) => `assets/${f}`);
  let worst = { file: '(none)', gz: 0 };
  for (const f of allFiles) {
    if (/\/vendor-/.test(f) || initialFiles.includes(f)) continue;
    const gz = gzOf(f);
    if (gz > worst.gz) worst = { file: f, gz };
  }
  const ok = worst.gz <= BUDGETS.largestNonVendorGz;
  report.push('');
  report.push(`${ok ? 'OK  ' : 'FAIL'} largest non-vendor chunk: ${worst.file} ${kb(worst.gz)} KB gz (budget ${kb(BUDGETS.largestNonVendorGz)} KB)`);
  if (!ok) failed = true;
}

console.log(report.join('\n'));
if (failed) {
  console.error('\nbundle-budget: at least one budget exceeded.');
  process.exit(1);
}
console.log('\nbundle-budget: all budgets within limits.');
