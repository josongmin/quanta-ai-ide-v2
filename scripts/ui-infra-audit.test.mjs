// Architecture fixture harness (WB-001).
//
// Runs the real ui-infra-audit guard against isolated fixture trees copied into a
// temp directory with an empty baseline, and asserts each invalid fixture fails
// with exactly one expected rule while the valid fixture passes.
//
// The guard is read-only, and every run happens on a temp copy — the real src
// tree and user files are never touched. Temp dirs are removed on success and
// failure.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..');
const AUDIT = join(HERE, 'ui-infra-audit.mjs');
const FIXTURES = join(REPO_ROOT, 'tools', 'ui-infra-fixtures');

// [fixture dir, expected rule id | null for the valid fixture]
const CASES = [
  ['valid', null],
  ['invalid-workbench-react', 'workbenchReactImport'],
  ['invalid-cross-family', 'crossFamilyImport'],
  ['invalid-deep-import', 'deepImport'],
  ['invalid-central-switch', 'centralSurfaceSwitch'],
  ['invalid-arbitrary-provider', 'arbitraryProvider'],
  ['invalid-surface-root-location', 'surfaceRootLocation'],
  ['invalid-hardcoded-surface-id', 'noHardcodedSurfaceId'],
];

function runAuditOnCopy(fixtureName) {
  const source = join(FIXTURES, fixtureName);
  if (!existsSync(source) || readdirSync(source).length === 0) {
    throw new Error(`fixture missing or empty: ${fixtureName}`);
  }
  const temp = mkdtempSync(join(tmpdir(), 'ui-infra-fixture-'));
  try {
    const root = join(temp, 'tree');
    cpSync(source, root, { recursive: true });
    const baseline = join(temp, 'baseline.json');
    writeFileSync(baseline, JSON.stringify({ version: 1, categories: {} }));
    try {
      const stdout = execFileSync('node', [AUDIT, '--root', root, '--baseline', baseline], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      return { code: 0, stdout, stderr: '' };
    } catch (error) {
      return { code: error.status ?? 1, stdout: error.stdout ?? '', stderr: error.stderr ?? '' };
    }
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

// Parse `- <ruleId>: <path> <n> > <limit>` violation lines into a rule->paths map.
function parseViolations(stderr) {
  const byRule = new Map();
  for (const line of stderr.split('\n')) {
    const match = line.match(/^-\s+([a-zA-Z]+):\s+(\S+)\s/);
    if (!match) continue;
    const [, rule, path] = match;
    if (!byRule.has(rule)) byRule.set(rule, []);
    byRule.get(rule).push(path);
  }
  return byRule;
}

for (const [fixture, expectedRule] of CASES) {
  test(`fixture ${fixture}`, () => {
    const result = runAuditOnCopy(fixture);
    if (expectedRule === null) {
      assert.equal(result.code, 0, `valid fixture must pass; stderr:\n${result.stderr}`);
      return;
    }
    assert.equal(result.code, 1, `invalid fixture must fail with a violation; stderr:\n${result.stderr}`);
    const byRule = parseViolations(result.stderr);
    assert.deepEqual(
      [...byRule.keys()].sort(),
      [expectedRule],
      `expected exactly rule ${expectedRule}; got ${JSON.stringify([...byRule.keys()])}`,
    );
    // The offending path is reported (rule ID + path, not just a count).
    assert.ok(byRule.get(expectedRule).length > 0, 'offending path must be reported');
  });
}

test('harness fails on a missing fixture', () => {
  assert.throws(() => runAuditOnCopy('fixture-that-does-not-exist'), /fixture missing or empty/);
});

// Robustness matrix (헬어딧 regression): run the audit against an inline temp tree
// with a single file of given content and an empty baseline. Locks the evasion /
// false-positive defects found in adversarial audit.
function auditSingleFile(relPath, content) {
  const temp = mkdtempSync(join(tmpdir(), 'ui-infra-src-'));
  try {
    const root = join(temp, 'tree');
    const file = join(root, relPath);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content);
    const baseline = join(temp, 'baseline.json');
    writeFileSync(baseline, JSON.stringify({ version: 1, categories: {} }));
    try {
      execFileSync('node', [AUDIT, '--root', root, '--baseline', baseline], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      return { code: 0, byRule: new Map() };
    } catch (error) {
      return { code: error.status ?? 1, byRule: parseViolations(error.stderr ?? '') };
    }
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

// arbitraryProvider — whitespace-evasion form must still be caught.
test('arbitraryProvider catches `Provider ?:` (whitespace evasion)', () => {
  const r = auditSingleFile('features/x/Def.ts', 'type D = { Provider ?: ComponentType };');
  assert.equal(r.code, 1);
  assert.deepEqual([...r.byRule.keys()], ['arbitraryProvider']);
});

// arbitraryProvider — prefixed identifier must NOT be flagged (false-positive guard).
test('arbitraryProvider ignores `myProvider?:` (prefixed identifier)', () => {
  const r = auditSingleFile('features/x/Def.ts', 'type D = { myProvider?: ComponentType };');
  assert.equal(r.code, 0);
});

// centralSurfaceSwitch — React-qualified form must still be caught.
test('centralSurfaceSwitch catches `Record<TabKind, React.ComponentType>`', () => {
  const r = auditSingleFile('app/x/Reg.ts', 'const M: Record<TabKind, React.ComponentType> = {};');
  assert.equal(r.code, 1);
  assert.deepEqual([...r.byRule.keys()], ['centralSurfaceSwitch']);
});

// centralSurfaceSwitch — multiline form must still be caught.
test('centralSurfaceSwitch catches multiline Record<TabKind, ...>', () => {
  const r = auditSingleFile('app/x/Reg.ts', 'const M: Record<\n  TabKind,\n  TabKindDef\n> = {};');
  assert.equal(r.code, 1);
  assert.deepEqual([...r.byRule.keys()], ['centralSurfaceSwitch']);
});

// centralSurfaceSwitch — innocent metadata map must NOT be flagged.
test('centralSurfaceSwitch ignores `Record<TabKind, TabMeta>` (metadata)', () => {
  const r = auditSingleFile('shared/config/x.ts', 'const M: Record<TabKind, TabMeta> = {};');
  assert.equal(r.code, 0);
});

// deepImport — same-package relative internal import must NOT be flagged.
test('deepImport ignores relative same-package imports', () => {
  const r = auditSingleFile(
    'shared/workbench/core/Registry.ts',
    "import { Node } from '../core/internal/ScopeNode';\nexport const x = Node;",
  );
  assert.equal(r.code, 0);
});

test('baseline schema/version error exits 2 (fail-closed)', () => {
  const temp = mkdtempSync(join(tmpdir(), 'ui-infra-baseline-'));
  try {
    const root = join(temp, 'tree');
    cpSync(join(FIXTURES, 'valid'), root, { recursive: true });
    const baseline = join(temp, 'baseline.json');
    writeFileSync(baseline, JSON.stringify({ version: 999, categories: {} }));
    let code = 0;
    try {
      execFileSync('node', [AUDIT, '--root', root, '--baseline', baseline], { stdio: 'ignore' });
    } catch (error) {
      code = error.status ?? 1;
    }
    assert.equal(code, 2, 'unsupported baseline version must exit 2');
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
