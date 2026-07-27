import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findStageLeaks } from '../stageLeakGuard.mjs';

// Minimal fake Rollup output bundle. Keys are fileNames; each chunk lists its
// static `imports` (other chunk fileNames) and its source `modules`.
function bundle(chunks) {
  return Object.fromEntries(chunks.map((c) => [c.fileName, { type: 'chunk', ...c }]));
}
const ROOT = '/repo';

test('clean: stages reachable only via dynamicImports are NOT leaks', () => {
  const b = bundle([
    { fileName: 'index.js', isEntry: true, imports: ['vendor.js'], dynamicImports: ['coding.js'],
      modules: { [`${ROOT}/src/app/App.tsx`]: {}, [`${ROOT}/src/widgets/app-shell/AppShell.tsx`]: {} } },
    { fileName: 'vendor.js', imports: [], modules: { [`${ROOT}/node_modules/react/index.js`]: {} } },
    { fileName: 'coding.js', imports: [], modules: { [`${ROOT}/src/widgets/coding-stage/index.ts`]: {} } },
  ]);
  assert.deepEqual(findStageLeaks(b), []);
});

test('leak: a stage module INLINED into the entry chunk is caught', () => {
  const b = bundle([
    { fileName: 'index.js', isEntry: true, imports: [],
      modules: { [`${ROOT}/src/app/App.tsx`]: {}, [`${ROOT}/src/widgets/coding-stage/CodingStage.tsx`]: {} } },
  ]);
  assert.deepEqual(findStageLeaks(b), [`${ROOT}/src/widgets/coding-stage/CodingStage.tsx`]);
});

test('leak: a stage pulled in via a STATIC import chunk is caught', () => {
  const b = bundle([
    { fileName: 'index.js', isEntry: true, imports: ['shared.js'], modules: { [`${ROOT}/src/app/App.tsx`]: {} } },
    { fileName: 'shared.js', imports: [], modules: { [`${ROOT}/src/features/switch-mode/lib/DotFieldMode.ts`]: {} } },
  ]);
  assert.deepEqual(findStageLeaks(b), [`${ROOT}/src/features/switch-mode/lib/DotFieldMode.ts`]);
});

test('non-stage app modules (app-shell, shared) are not flagged', () => {
  const b = bundle([
    { fileName: 'index.js', isEntry: true, imports: [],
      modules: { [`${ROOT}/src/widgets/app-shell/AppShell.tsx`]: {}, [`${ROOT}/src/shared/ui/index.ts`]: {} } },
  ]);
  assert.deepEqual(findStageLeaks(b), []);
});

test('chat-agent: eager theme model is allowlisted; UI and non-theme model are fenced', () => {
  const eager = bundle([
    { fileName: 'index.js', isEntry: true, imports: [],
      modules: {
        [`${ROOT}/src/features/chat-agent/model/TokensContext.tsx`]: {}, // eager theme — allowlisted
        [`${ROOT}/src/features/chat-agent/model/applyTokens.ts`]: {},
      } },
  ]);
  assert.deepEqual(findStageLeaks(eager), []);
  // UI leak
  assert.deepEqual(
    findStageLeaks(bundle([{ fileName: 'index.js', isEntry: true, imports: [], modules: { [`${ROOT}/src/features/chat-agent/ui/ChatAgent.tsx`]: {} } }])),
    [`${ROOT}/src/features/chat-agent/ui/ChatAgent.tsx`],
  );
  // a NON-theme model module (e.g. chat runtime) is NOT allowlisted → fenced (BB1-R2-002)
  assert.deepEqual(
    findStageLeaks(bundle([{ fileName: 'index.js', isEntry: true, imports: [], modules: { [`${ROOT}/src/features/chat-agent/model/useQuantaChat.ts`]: {} } }])),
    [`${ROOT}/src/features/chat-agent/model/useQuantaChat.ts`],
  );
});

test('every lazy surface is fenced: features (admission-rules, verified-fix) AND the non-`-stage` catalog widget (BB1-R2-001 / BB1-R3-001)', () => {
  for (const p of [
    'src/features/admission-rules/ui/AdmissionRoot.tsx',
    'src/features/verified-fix/ui/VerifiedFixRoot.tsx',
    'src/widgets/catalog/CatalogStage.tsx', // no `-stage` suffix — the round-3 gap
  ]) {
    assert.deepEqual(
      findStageLeaks(bundle([{ fileName: 'index.js', isEntry: true, imports: [], modules: { [`${ROOT}/${p}`]: {} } }])),
      [`${ROOT}/${p}`],
    );
  }
});
