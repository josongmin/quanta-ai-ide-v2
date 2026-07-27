import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IMPORT_RE, resolveSlice } from '../audit-cross-slice.mjs';

// Extract every specifier IMPORT_RE finds in a source string.
function specifiers(src) {
  const out = [];
  IMPORT_RE.lastIndex = 0;
  let m;
  while ((m = IMPORT_RE.exec(src)) !== null) out.push(m[1] ?? m[2] ?? m[3]);
  return out;
}

test('IMPORT_RE catches mid-line and multiple-per-line imports (XS-1 regression)', () => {
  // The old line-anchored regex missed everything but a line-start `from` import.
  assert.deepEqual(specifiers(`import {a} from './local'; import {b} from '../sib/index';`), ['./local', '../sib/index']);
  assert.deepEqual(specifiers(`const foo = 1; import {b} from '@features/other';`), ['@features/other']);
  assert.deepEqual(specifiers(`export * from '@features/other';`), ['@features/other']);
  assert.deepEqual(specifiers(`export { x } from '@widgets/other';`), ['@widgets/other']);
});

test('IMPORT_RE catches dynamic and bare side-effect imports', () => {
  assert.deepEqual(specifiers(`const m = import('@features/other');`), ['@features/other']);
  assert.deepEqual(specifiers(`import '@features/other/side-effect';`), ['@features/other/side-effect']);
});

test('IMPORT_RE does not mis-fire on plain identifiers/prose', () => {
  assert.deepEqual(specifiers(`const important = 1; const informed = 2;`), []);
  assert.deepEqual(specifiers(`// a comment mentioning import and from but no specifier`), []);
});

test('resolveSlice classifies alias + relative (any depth) but not cross-layer', () => {
  const shallow = 'src/features/password-strength/X.tsx';
  const deep = 'src/features/password-strength/parts/deep/X.tsx';
  assert.equal(resolveSlice('@features/control-palette', 'features', shallow), 'control-palette');
  // short climb to a sibling slice (the XS blind spot) — resolves to control-palette
  assert.equal(resolveSlice('../control-palette/index', 'features', shallow), 'control-palette');
  // deep file needs a longer climb to reach the sibling; three ../ = features/control-palette
  assert.equal(resolveSlice('../../../control-palette/index', 'features', deep), 'control-palette');
  // a shorter climb from the deep file stays inside its own slice (caller filters same-slice)
  assert.equal(resolveSlice('../../control-palette/index', 'features', deep), 'password-strength');
  assert.equal(resolveSlice('@shared/lib', 'features', shallow), null); // cross-layer, not our concern here
  assert.equal(resolveSlice('react', 'features', shallow), null);
});
