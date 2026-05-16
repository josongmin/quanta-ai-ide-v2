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
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'src');

const LAYERS = ['features', 'widgets', 'entities'];

const args = process.argv.slice(2);
const layerFilter = args
  .find((a) => a.startsWith('--layer='))
  ?.split('=')[1];
const asJson = args.includes('--json');

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

const IMPORT_RE =
  /(?:^|\n)\s*(?:import|export)[^'"]*?from\s+['"]([^'"]+)['"]/g;

/**
 * Extract the target slice name from a module specifier given the layer.
 * Returns null if not a cross-layer import.
 *
 * Matches both alias (`@features/foo`) and relative-traversal forms
 * (`../../features/foo/...`). Same-slice imports are filtered out by
 * the caller.
 */
function resolveSlice(spec, layer) {
  // Alias form.
  const aliasRe = new RegExp(`^@${layer}/([^/]+)(?:/|$)`);
  const aliasMatch = aliasRe.exec(spec);
  if (aliasMatch) return aliasMatch[1];
  // Relative traversal form.
  const relRe = new RegExp(`(?:^|/)${layer}/([^/]+)(?:/|$)`);
  if (spec.startsWith('.')) {
    const relMatch = relRe.exec(spec);
    if (relMatch) return relMatch[1];
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
      const src = readFileSync(file, 'utf8');
      let m;
      IMPORT_RE.lastIndex = 0;
      while ((m = IMPORT_RE.exec(src)) !== null) {
        const spec = m[1];
        const target = resolveSlice(spec, layer);
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

const layers = layerFilter ? [layerFilter] : LAYERS;
const all = {};
for (const layer of layers) {
  all[layer] = summarize(layer, auditLayer(layer));
}

if (asJson) {
  console.log(JSON.stringify(all, null, 2));
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
