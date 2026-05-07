// Bundle-size guard run after `vite build`. Fails with non-zero exit if any
// budget is exceeded so CI can gate on it. We measure gzipped size of the
// emitted JS in `dist/assets`; CSS and HTML are out of scope (covered by Vite's
// own warnings). Budgets are tight-but-not-fragile: ~15% headroom over current
// usage so a stray import is loud, but a benign React patch upgrade isn't.
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST = 'dist/assets';
const HTML = 'dist/index.html';

// The entry chunk's hashed filename comes from dist/index.html so we don't
// confuse it with feature `index.ts` barrels that Rollup also names `index-*`.
function readEntryFromHtml() {
  if (!fs.existsSync(HTML)) {
    console.error(`bundle-budget: ${HTML} does not exist; run \`vite build\` first.`);
    process.exit(1);
  }
  const html = fs.readFileSync(HTML, 'utf8');
  const m = html.match(/<script[^>]+src="\/assets\/(index-[^"]+\.js)"/);
  if (!m) {
    console.error('bundle-budget: could not find entry <script> in dist/index.html.');
    process.exit(1);
  }
  return m[1];
}

const ENTRY = readEntryFromHtml();

const BUDGETS = {
  // Initial path: chunks that load before the user does anything. Entry,
  // React, i18n vendor (we await loadNamespaces at boot), icons. Lazy
  // feature barrels (also named `index-*`) are excluded by pinning the entry
  // to whatever index.html actually loads.
  initial: {
    files: [ENTRY, 'vendor-react-*.js', 'vendor-icons-*.js', 'vendor-i18n-*.js'],
    maxGz: 130 * 1024,
  },
  // three.js is lazy (loaded by viz-modes on demand) but big enough to deserve
  // its own ceiling separate from the initial budget.
  vendorThree: {
    files: ['vendor-three-*.js'],
    maxGz: 130 * 1024,
  },
  // No single non-vendor chunk should balloon past 50 KB gz; if one does, it
  // probably needs to be split further or moved behind a dynamic import. We
  // exclude `vendor-*` (covered by their own budgets) and the entry itself
  // (covered by the initial budget). Lazy feature `index-*` chunks DO count.
  largestNonVendor: {
    excludePrefixes: ['vendor-'],
    excludeNames: [ENTRY],
    maxGz: 50 * 1024,
  },
};

function matchAny(name, patterns) {
  return patterns.some((p) => {
    const r = new RegExp('^' + p.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
    return r.test(name);
  });
}

function gzSize(filePath) {
  const buf = fs.readFileSync(filePath);
  return gzipSync(buf).length;
}

if (!fs.existsSync(DIST)) {
  console.error(`bundle-budget: ${DIST} does not exist; run \`vite build\` first.`);
  process.exit(1);
}

const allFiles = fs.readdirSync(DIST).filter((f) => f.endsWith('.js'));
const sizes = new Map();
for (const f of allFiles) sizes.set(f, gzSize(path.join(DIST, f)));

let failed = false;

// Initial bundle: sum of matched files.
{
  const matched = allFiles.filter((f) => matchAny(f, BUDGETS.initial.files));
  const total = matched.reduce((acc, f) => acc + sizes.get(f), 0);
  const ok = total <= BUDGETS.initial.maxGz;
  const line = `${ok ? 'OK ' : 'FAIL'} initial: ${(total / 1024).toFixed(1)} KB gz (budget ${(BUDGETS.initial.maxGz / 1024).toFixed(0)} KB) -> ${matched.join(', ')}`;
  (ok ? console.log : console.error)(line);
  if (!ok) failed = true;
}

// vendor-three on its own.
{
  const matched = allFiles.filter((f) => matchAny(f, BUDGETS.vendorThree.files));
  const total = matched.reduce((acc, f) => acc + sizes.get(f), 0);
  const ok = total <= BUDGETS.vendorThree.maxGz;
  const line = `${ok ? 'OK ' : 'FAIL'} vendor-three: ${(total / 1024).toFixed(1)} KB gz (budget ${(BUDGETS.vendorThree.maxGz / 1024).toFixed(0)} KB)`;
  (ok ? console.log : console.error)(line);
  if (!ok) failed = true;
}

// Largest non-vendor chunk.
{
  const candidates = allFiles.filter(
    (f) =>
      !BUDGETS.largestNonVendor.excludePrefixes.some((p) => f.startsWith(p)) &&
      !BUDGETS.largestNonVendor.excludeNames.includes(f),
  );
  let worst = { name: '(none)', size: 0 };
  for (const f of candidates) {
    const s = sizes.get(f);
    if (s > worst.size) worst = { name: f, size: s };
  }
  const ok = worst.size <= BUDGETS.largestNonVendor.maxGz;
  const line = `${ok ? 'OK ' : 'FAIL'} largest-non-vendor: ${worst.name} ${(worst.size / 1024).toFixed(1)} KB gz (budget ${(BUDGETS.largestNonVendor.maxGz / 1024).toFixed(0)} KB)`;
  (ok ? console.log : console.error)(line);
  if (!ok) failed = true;
}

if (failed) {
  console.error('\nbundle-budget: at least one budget exceeded.');
  process.exit(1);
}
console.log('\nbundle-budget: all budgets within limits.');
