#!/usr/bin/env node
// UI infrastructure + workbench architecture debt guard.
//
// Two rule families run over a source tree and compare per-path counts against a
// committed baseline ledger. Any path whose count exceeds its baseline entry is a
// new violation (fail-new); decreases are always allowed.
//
//   • content rules   — banned primitives in feature/widget code
//                        (directDialog/directPortal/globalKeydown/magicZIndex/headlessImport)
//   • architecture rules — canonical-workbench boundaries and closed-union coupling
//                        (workbenchReactImport/crossFamilyImport/deepImport/
//                         centralSurfaceSwitch/arbitraryProvider)
//
// Flags:
//   --update             rewrite the baseline ledger from the current tree
//   --root <dir>         scan <dir> instead of ./src (paths reported relative to <dir>)
//   --baseline <file>    read the baseline from <file> instead of tools/ui-infra-ledger.json
//
// --root/--baseline exist so the architecture fixture harness
// (scripts/ui-infra-audit.test.mjs) can run this guard against isolated fixture
// trees with an empty baseline. --update is never invoked from CI or verify.

import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE_VERSION = 1;

function parseArgs(argv) {
  const out = { update: false, root: null, baseline: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--update') out.update = true;
    else if (arg === '--root') out.root = argv[(i += 1)];
    else if (arg === '--baseline') out.baseline = argv[(i += 1)];
    else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(2);
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const SCAN_ROOT = args.root ?? join(REPO_ROOT, 'src');
// Real runs keep the historical `src/` prefix so the committed ledger keys stay
// valid; fixture runs (--root) report paths relative to the given root.
const PATH_PREFIX = args.root === null ? 'src/' : '';
const BASELINE_PATH = args.baseline ?? join(REPO_ROOT, 'tools', 'ui-infra-ledger.json');

function isTest(path) {
  return path.includes('/__tests__/') || /\.test\.[cm]?[jt]sx?$/.test(path);
}

function isSharedUi(path) {
  return path.includes('/shared/ui/');
}

function countMatches(source, pattern) {
  return [...source.matchAll(pattern)].length;
}

// Import specifiers, extracted once per file for the architecture rules. Covers
// `from '...'` (static/type) and `import('...')` (dynamic).
function importSpecifiers(source) {
  const specs = [];
  for (const m of source.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)) specs.push(m[1]);
  return specs;
}

// ── AST-backed surface-admission rules (WBT-A5R) ──
// The structural surface rules parse the real TypeScript AST instead of scanning
// text, so they see *semantic* positions only: comments, `core.${kind}` template
// expressions, and command-id strings in unrelated syntax are naturally excluded
// (they are not the node kinds we look at), and evasion via aliasing/multiline/
// mixed Promise.all cannot slip past a regex that never ran. Parsed once per file.
const astCache = new Map();
function parseAst(path, source) {
  let sf = astCache.get(source);
  if (sf === undefined) {
    sf = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, /*setParentNodes*/ true, ts.ScriptKind.TSX);
    astCache.set(source, sf);
  }
  return sf;
}
function walkAst(node, visit) {
  visit(node);
  node.forEachChild((child) => { walkAst(child, visit); });
}
// String-literal argument of every dynamic `import(...)` expression.
function astDynamicImportTargets(path, source) {
  const targets = [];
  walkAst(parseAst(path, source), (node) => {
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1 &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      targets.push(node.arguments[0].text);
    }
  });
  return targets;
}
// Every plain string-literal's text (NOT template expressions — a `core.${x}`
// template is not a hardcoded id — and NOT comments, which are not nodes).
function astStringLiterals(path, source) {
  const out = [];
  walkAst(parseAst(path, source), (node) => {
    if (ts.isStringLiteral(node)) out.push(node.text);
    else if (ts.isNoSubstitutionTemplateLiteral(node)) out.push(node.text);
  });
  return out;
}

// A built-in surface's view must live in a widgets/ or features/ slice — never
// the app/ layer (that was the Intelligence asymmetry WBT-06R closed).
function isSurfaceRootSpecifier(spec) {
  return spec.startsWith('@widgets/') || spec.startsWith('@features/');
}
// A canonical surface id literal (`core.<surface>`). Object keys in the ONE
// activator map and the metadata SoT are the sanctioned registration points and
// live outside the scanned dirs; anywhere else this is a hardcoded id.
const SURFACE_ID_LITERAL = /^core\.[a-z][a-z0-9-]*$/;

const BANNED_WORKBENCH_IMPORT =
  /^(?:react|react-dom|zustand|@tanstack\/react-router|@tauri-apps\/.+)$/;

const RULES = [
  // ── content rules (unchanged semantics) ──
  {
    id: 'directDialog',
    ignore: (path) => isSharedUi(path) || isTest(path),
    detect: (path, source) => countMatches(source, /role\s*=\s*["']dialog["']/g),
  },
  {
    id: 'directPortal',
    ignore: (path) => isSharedUi(path) || isTest(path),
    detect: (path, source) => countMatches(source, /\bcreatePortal\s*\(/g),
  },
  {
    id: 'globalKeydown',
    ignore: (path) => path.endsWith('/shared/ui/runtime/UIRuntimeProvider.tsx') || isTest(path),
    detect: (path, source) =>
      countMatches(source, /(?:window|document)\.addEventListener\(\s*["']keydown["']/g),
  },
  {
    id: 'magicZIndex',
    ignore: (path) => isTest(path),
    detect: (path, source) => countMatches(source, /\bz-(?:\[(?:-?\d+)\]|[1-9]\d*)\b/g),
  },
  {
    id: 'headlessImport',
    ignore: (path) => isSharedUi(path) || isTest(path),
    detect: (path, source) =>
      countMatches(
        source,
        /from\s+["'](?:@radix-ui|@react-aria|react-aria|@floating-ui|@base-ui|@headlessui)[^"']*["']/g,
      ),
  },

  // ── architecture rules (WB-002): canonical-workbench boundaries ──
  // These are 0 today (src/shared/workbench does not exist yet); they exist to
  // fail-new as the canonical kernel is built.
  {
    // contract/core are the host-neutral kernel — no React/DOM/router/state/Tauri.
    id: 'workbenchReactImport',
    ignore: (path) => isTest(path),
    detect: (path, source) => {
      if (!/(?:^|\/)shared\/workbench\/(?:contract|core)\//.test(`/${path}`)) return 0;
      return importSpecifiers(source).filter((spec) => BANNED_WORKBENCH_IMPORT.test(spec)).length;
    },
  },
  {
    // A workbench family must not import another family directly.
    id: 'crossFamilyImport',
    ignore: (path) => isTest(path),
    detect: (path, source) => {
      const self = (`/${path}`.match(/\/shared\/workbench\/families\/([^/]+)\//) ?? [])[1];
      if (!self) return 0;
      let count = 0;
      for (const spec of importSpecifiers(source)) {
        const other = (spec.match(/(?:^|\/|@[^/]*\/)families\/([^/]+)\b/) ?? [])[1];
        if (other && other !== self) count += 1;
      }
      return count;
    },
  },
  {
    // Consumers must import a workbench package via its public barrel, not a deep
    // internal path (aliased deep imports into contract/core).
    id: 'deepImport',
    ignore: (path) => isTest(path),
    detect: (path, source) => {
      let count = 0;
      for (const spec of importSpecifiers(source)) {
        // Relative imports are same-package internals (allowed); barrel bypass we
        // care about is the aliased/bare deep path into contract/core internals.
        if (spec.startsWith('.')) continue;
        if (/(?:^|\/|@[^/]*\/)workbench\/(?:contract|core)\/.+$/.test(spec)) count += 1;
      }
      return count;
    },
  },

  // ── fail-new structural rules (WB-003): closed-union coupling ──
  // Baselined against the current tree; the canonical registry (WBT-05) removes
  // these, so only decreases are expected.
  {
    // Central component/provider switch keyed on the closed TabKind union.
    id: 'centralSurfaceSwitch',
    ignore: (path) => isTest(path),
    detect: (path, source) =>
      countMatches(source, /Record<\s*TabKind\s*,\s*(?:React\.)?(?:ComponentType|TabKindDef)\b/g),
  },
  {
    // Arbitrary per-surface Provider slot (`Provider?: ComponentType`). The
    // leading \b avoids matching identifiers like `myProvider?:`; `Provider\s*\?`
    // catches the whitespace-evasion form `Provider ?:`.
    id: 'arbitraryProvider',
    ignore: (path) => isTest(path),
    detect: (path, source) =>
      countMatches(source, /\bProvider\s*\?\s*:\s*(?:React\.)?ComponentType\b/g),
  },

  // ── AST admission rules (WBT-A5R): strict-zero, not baseline-exemptable ──
  // These lock the convergence 06R + A4R achieved. Being AST-backed, they cannot
  // be evaded by aliasing, multiline formatting, or mixed Promise.all, and they
  // never false-fire on comments/template ids/command strings.
  {
    // A built-in surface activator must resolve its view from widgets/ or
    // features/ — never the app/ layer (the Intelligence asymmetry 06R removed).
    id: 'surfaceRootLocation',
    ignore: (path) => isTest(path) || !path.endsWith('/app/workbench/builtinSurfaces.ts'),
    detect: (path, source) =>
      astDynamicImportTargets(path, source).filter((t) => !isSurfaceRootSpecifier(t)).length,
  },
  {
    // No hardcoded `core.<surface>` id literal in feature/route code — surface
    // identity flows from the metadata SoT + the one activator map (both outside
    // these dirs). A4R removed the last of these; this keeps them from returning.
    id: 'noHardcodedSurfaceId',
    ignore: (path) => isTest(path) || !/\/(?:features|app\/router)\//.test(path),
    detect: (path, source) =>
      astStringLiterals(path, source).filter((s) => SURFACE_ID_LITERAL.test(s)).length,
  },
];

function filesUnder(dir) {
  const output = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) output.push(...filesUnder(path));
    else if (/\.[cm]?[jt]sx?$/.test(name)) output.push(path);
  }
  return output;
}

function inventory() {
  const categories = Object.fromEntries(RULES.map((rule) => [rule.id, {}]));
  for (const absolutePath of filesUnder(SCAN_ROOT)) {
    const path = `${PATH_PREFIX}${relative(SCAN_ROOT, absolutePath)}`;
    const source = readFileSync(absolutePath, 'utf8');
    for (const rule of RULES) {
      if (rule.ignore(`/${path}`)) continue;
      const count = rule.detect(path, source);
      if (count > 0) categories[rule.id][path] = count;
    }
  }
  return { version: BASELINE_VERSION, categories };
}

const current = inventory();

if (args.update) {
  writeFileSync(BASELINE_PATH, `${JSON.stringify(current, null, 2)}\n`);
  console.log(`Updated ${relative(REPO_ROOT, BASELINE_PATH)}`);
  process.exit(0);
}

let baseline;
try {
  baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
} catch (error) {
  console.error(`UI infrastructure baseline is missing or invalid: ${String(error)}`);
  process.exit(2);
}

if (baseline.version !== BASELINE_VERSION || typeof baseline.categories !== 'object' || baseline.categories === null) {
  console.error(
    `UI infrastructure baseline schema is unsupported (version ${String(baseline.version)}); expected version ${String(BASELINE_VERSION)} with a categories object.`,
  );
  process.exit(2);
}

const violations = [];
for (const rule of RULES) {
  const allowed = baseline.categories[rule.id] ?? {};
  const observed = current.categories[rule.id];
  for (const [path, count] of Object.entries(observed)) {
    const limit = allowed[path] ?? 0;
    if (count > limit) violations.push(`${rule.id}: ${path} ${String(count)} > ${String(limit)}`);
  }
}

if (violations.length > 0) {
  console.error('New UI infrastructure / architecture debt is not allowed:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

const totals = Object.fromEntries(
  RULES.map((rule) => [rule.id, Object.values(current.categories[rule.id]).reduce((sum, count) => sum + count, 0)]),
);
console.log(`UI infrastructure ledger green: ${JSON.stringify(totals)}`);
