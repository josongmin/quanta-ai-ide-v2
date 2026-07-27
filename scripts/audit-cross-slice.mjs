#!/usr/bin/env node
// Audit same-layer cross-slice imports (features ↔ features,
// widgets ↔ widgets, entities ↔ entities).
//
// FSD permits this in principle, but each occurrence is a candidate
// for promotion: either compose the dependency one layer up, or extract
// the shared concept to a lower layer. This script does NOT fail; it
// just reports so reviewers can decide what to refactor next.
//
// Usage:  pnpm audit:cross-slice
//         node scripts/audit-cross-slice.mjs
//         node scripts/audit-cross-slice.mjs --layer=features
//         node scripts/audit-cross-slice.mjs --json

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'src');

const LAYERS = ['features', 'widgets', 'entities'];

const args = process.argv.slice(2);
const layerFilter = args
  .find((a) => a.startsWith('--layer='))
  ?.split('=')[1];
const asJson = args.includes('--json');
// --check turns the report into a GATE: any same-layer cross-slice edge not on
// the ALLOWLIST below fails the process (exit 1). Existing edges are
// grandfathered; the gate only blocks NEW cross-slice coupling from forming
// (the fix-pipeline sprawl this repo just collapsed started exactly this way).
const checkMode = args.includes('--check');

// Approved same-layer cross-slice edges (from -> [to...]). Keep this tight: a
// new entry here is a deliberate decision to couple two sibling slices rather
// than compose one layer up or extract to a lower layer. Regenerate the raw
// list with `pnpm audit:cross-slice --json`.
const ALLOWLIST = {
  features: {
    'admission-rules': ['pr-preview'],
    'ai-activity': ['workspace-tabs'],
    'apply-overlay': ['inspect-boundaries'],
    'chat-agent': ['apply-overlay', 'inspect-target'],
    'filter-files': ['tweak-prefs'],
    'inspect-target': ['apply-overlay', 'ownership-routing'],
    'investigation': ['inspect-target'],
    'pr-preview': ['apply-overlay'],
  },
  widgets: {
    'intelligence-stage': ['stage'],
    'onboarding-stage': ['auth-stage'],
    'org-stage': ['_shared'],
    'ws-stage': ['_shared'],
  },
  entities: {
    'admission': ['facet', 'repo'],
    'billing': ['plan'],
    'facet': ['repo'],
    'filter-state': ['facet', 'repo'],
    'hotspot': ['repo'],
    'metric': ['hotspot', 'repo'],
    'pr': ['repo'],
    'viz-mode': ['metric', 'repo'],
  },
};

function isAllowed(layer, from, to) {
  return (ALLOWLIST[layer]?.[from] ?? []).includes(to);
}

/** List immediate slice directories under src/<layer>/. */
function listSlices(layer) {
  const dir = join(SRC, layer);
  try {
    return readdirSync(dir).filter((name) => {
      try {
        return statSync(join(dir, name)).isDirectory();
      } catch {
        return false;
      }
    });
  } catch {
    return [];
  }
}

/** Walk a directory recursively for .ts/.tsx files. */
function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    let s;
    try {
      s = statSync(full);
    } catch {
      continue;
    }
    if (s.isDirectory()) {
      yield* walk(full);
    } else if (/\.(ts|tsx)$/.test(name)) {
      yield full;
    }
  }
}

// Extract every imported specifier from a TS/TSX source, using the TypeScript
// compiler's own scanner (ts.preProcessFile) instead of an ad-hoc regex.
// preProcessFile covers static `import/export ... from`, `export * from`, dynamic
// `import('...')`, bare side-effect `import '...'`, and `import type` — and, being
// a real scanner, it does NOT match import-shaped text inside comments, string
// literals, regex literals, or template interpolations. Three rounds of a
// hand-rolled comment/regex/division tokenizer proved that ambiguity is
// unwinnable by regex; this is the correct, complete replacement.
function extractSpecifiers(src) {
  return ts.preProcessFile(src, /*readImportFiles*/ true, /*detectJavaScriptImports*/ true)
    .importedFiles.map((f) => f.fileName);
}

/**
 * Extract the target slice name from a module specifier given the layer and the
 * importing file. Returns null if not a same-layer cross-slice import.
 *
 * Alias form is matched directly. Relative forms are RESOLVED to an absolute
 * path first (not string-matched), so any number of `../` — including a short
 * climb to a sibling like `../_shared/x` that never re-spells the layer name —
 * is classified correctly. Same-slice imports are filtered out by the caller.
 */
function resolveSlice(spec, layer, fromFile) {
  // Alias form (`@features/foo/...`).
  const aliasMatch = new RegExp(`^@${layer}/([^/]+)(?:/|$)`).exec(spec);
  if (aliasMatch) return aliasMatch[1];
  // Relative form — resolve against the importing file, then classify by folder.
  if (spec.startsWith('.')) {
    const rel = relative(SRC, resolve(dirname(fromFile), spec));
    const m = new RegExp(`^${layer}[/\\\\]([^/\\\\]+)`).exec(rel);
    if (m) return m[1];
  }
  return null;
}

/**
 * For a given layer, scan every slice's files and count imports of
 * other slices in the same layer.
 *
 * @returns {Record<string, Record<string, { count: number, examples: string[] }>>}
 *   keyed as report[fromSlice][toSlice]
 */
function auditLayer(layer) {
  const slices = listSlices(layer);
  const report = {};
  for (const slice of slices) {
    const sliceDir = join(SRC, layer, slice);
    for (const file of walk(sliceDir)) {
      for (const spec of extractSpecifiers(readFileSync(file, 'utf8'))) {
        const target = resolveSlice(spec, layer, file);
        if (!target || target === slice) continue;
        report[slice] ??= {};
        report[slice][target] ??= { count: 0, examples: [] };
        report[slice][target].count += 1;
        if (report[slice][target].examples.length < 3) {
          report[slice][target].examples.push(relative(ROOT, file));
        }
      }
    }
  }
  return report;
}

function summarize(layer, report) {
  const rows = [];
  for (const [from, targets] of Object.entries(report)) {
    for (const [to, info] of Object.entries(targets)) {
      rows.push({ layer, from, to, count: info.count, examples: info.examples });
    }
  }
  rows.sort((a, b) => b.count - a.count || a.from.localeCompare(b.from));
  return rows;
}

function printTable(rows) {
  if (rows.length === 0) {
    console.log('  (none)');
    return;
  }
  const widths = {
    from: Math.max(4, ...rows.map((r) => r.from.length)),
    to: Math.max(2, ...rows.map((r) => r.to.length)),
    count: Math.max(3, ...rows.map((r) => String(r.count).length)),
  };
  const header =
    '  ' +
    'from'.padEnd(widths.from) +
    '  ' +
    'to'.padEnd(widths.to) +
    '  ' +
    'cnt'.padStart(widths.count);
  console.log(header);
  console.log('  ' + '-'.repeat(header.length - 2));
  for (const r of rows) {
    console.log(
      '  ' +
        r.from.padEnd(widths.from) +
        '  ' +
        r.to.padEnd(widths.to) +
        '  ' +
        String(r.count).padStart(widths.count),
    );
  }
}

// Exported for regression tests (scripts/__tests__). The CLI body below only
// runs when this file is executed directly, so importing it does NOT run the audit.
export { extractSpecifiers, resolveSlice, isAllowed, ALLOWLIST };

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (!isMain) {
  // imported (test) — skip the CLI run.
} else {

const layers = layerFilter ? [layerFilter] : LAYERS;
const all = {};
for (const layer of layers) {
  all[layer] = summarize(layer, auditLayer(layer));
}

if (asJson) {
  console.log(JSON.stringify(all, null, 2));
} else if (checkMode) {
  // Gate mode: every detected edge must be on the ALLOWLIST.
  const violations = [];
  const usedAllow = new Set();
  for (const layer of layers) {
    for (const r of all[layer]) {
      if (isAllowed(layer, r.from, r.to)) usedAllow.add(`${layer}:${r.from}->${r.to}`);
      else violations.push(r);
    }
  }
  // Stale allowlist entries (approved but no longer present) — warn so the
  // allowlist doesn't rot into a graveyard of edges that no longer exist.
  const stale = [];
  for (const layer of layers) {
    for (const [from, tos] of Object.entries(ALLOWLIST[layer] ?? {})) {
      for (const to of tos) {
        if (!usedAllow.has(`${layer}:${from}->${to}`)) stale.push(`${layer}: ${from} -> ${to}`);
      }
    }
  }
  if (violations.length) {
    console.error('\n✖ Disallowed same-layer cross-slice imports (not on the allowlist):\n');
    for (const v of violations) {
      console.error(`  [${v.layer}] ${v.from} -> ${v.to}  (${v.count} import${v.count === 1 ? '' : 's'})`);
      for (const ex of v.examples) console.error(`      ${ex}`);
    }
    console.error(
      '\nEach is new sibling-slice coupling. Compose the dependency one layer up,\n' +
      'extract the shared concept to a lower layer, or — if the coupling is\n' +
      'genuinely intended — add it to ALLOWLIST in scripts/audit-cross-slice.mjs.\n',
    );
    process.exit(1);
  }
  if (stale.length) {
    console.warn('⚠ Stale ALLOWLIST entries (no longer present — remove them):');
    for (const s of stale) console.warn(`  ${s}`);
    console.warn('');
  }
  console.log(`✔ cross-slice gate: no disallowed same-layer coupling across ${layers.join(', ')}.`);
} else {
  let total = 0;
  for (const layer of layers) {
    const rows = all[layer];
    const sum = rows.reduce((acc, r) => acc + r.count, 0);
    total += sum;
    console.log(
      `\nSame-layer cross-slice imports — ${layer} (${rows.length} edges, ${sum} imports)`,
    );
    printTable(rows);
  }
  console.log(
    `\nTotal cross-slice imports across ${layers.join(', ')}: ${total}`,
  );
  console.log(
    'These are permitted today. Audit periodically and consider promoting hot edges.\n',
  );
}

} // end isMain
