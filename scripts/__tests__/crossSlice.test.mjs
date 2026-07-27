import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractSpecifiers, resolveSlice } from '../audit-cross-slice.mjs';

test('extractSpecifiers catches static, dynamic, bare, export-star, and mid-line/multiple-per-line imports', () => {
  assert.deepEqual(extractSpecifiers(`import {a} from './local'; import {b} from '../sib/index';`), ['./local', '../sib/index']);
  assert.deepEqual(extractSpecifiers(`const foo = 1; import {b} from '@features/other';`), ['@features/other']);
  assert.deepEqual(extractSpecifiers(`export * from '@features/other';`), ['@features/other']);
  assert.deepEqual(extractSpecifiers(`export { x } from '@widgets/other';`), ['@widgets/other']);
  assert.deepEqual(extractSpecifiers(`const m = import('@features/other');`), ['@features/other']);
  assert.deepEqual(extractSpecifiers(`import '@features/other/side-effect';`), ['@features/other/side-effect']);
  assert.deepEqual(extractSpecifiers(`import type { T } from '@features/other';`), ['@features/other']);
});

test('extractSpecifiers catches `export * as ns from` and `/// <reference path` (XS-R4 gaps)', () => {
  // XS-R4-1: namespace re-export — preProcessFile drops this, we recover it via AST walk.
  assert.deepEqual(extractSpecifiers(`export * as ns from '@features/other';`), ['@features/other']);
  // no double-count against the plain forms preProcessFile already handles
  assert.deepEqual(extractSpecifiers(`export * from '@features/other';`), ['@features/other']);
  assert.deepEqual(extractSpecifiers(`import {a} from '@features/other';`), ['@features/other']);
  // XS-R4-2: relative reference-path directive — folded in from referencedFiles.
  assert.deepEqual(extractSpecifiers(`/// <reference path="../other/x.ts" />`), ['../other/x.ts']);
});

test('extractSpecifiers ignores import-shaped text in comments / strings / regex / templates (XS-R3 regressions)', () => {
  // commented out — not an import
  assert.deepEqual(extractSpecifiers(`// import { x } from '@features/other'\nexport const y = 1;`), []);
  assert.deepEqual(extractSpecifiers(`/* import { x } from '@features/other' */ export const y = 1;`), []);
  // XS-R3-1: division after an identifier ending in n/f/o, then a trailing line comment
  assert.deepEqual(extractSpecifiers(`const pct = info / total; // import { legacy } from '@features/other';`), []);
  // XS-R3-2: a regex literal is not division and its slashes don't open comments
  assert.deepEqual(extractSpecifiers(`const re = /[/]*x/; import { a } from '@features/other';`), ['@features/other']);
  assert.deepEqual(extractSpecifiers(`if (x) /re/.test(y); import { a } from '@features/other';`), ['@features/other']);
  // import-shaped text inside a string literal is not an import
  assert.deepEqual(extractSpecifiers(`const s = "import x from 'y'"; import { a } from '@features/real';`), ['@features/real']);
});

test('resolveSlice classifies alias + relative (any depth) but not cross-layer', () => {
  const shallow = 'src/features/password-strength/X.tsx';
  const deep = 'src/features/password-strength/parts/deep/X.tsx';
  assert.equal(resolveSlice('@features/control-palette', 'features', shallow), 'control-palette');
  assert.equal(resolveSlice('../control-palette/index', 'features', shallow), 'control-palette');
  assert.equal(resolveSlice('../../../control-palette/index', 'features', deep), 'control-palette');
  assert.equal(resolveSlice('../../control-palette/index', 'features', deep), 'password-strength'); // stays in own slice
  assert.equal(resolveSlice('@shared/lib', 'features', shallow), null); // cross-layer, not our concern
  assert.equal(resolveSlice('react', 'features', shallow), null);
});
