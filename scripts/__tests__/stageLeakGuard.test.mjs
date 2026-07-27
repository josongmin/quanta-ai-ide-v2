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

test('chat-agent MODEL (eager app theme) is NOT a leak, but chat-agent UI is', () => {
  const eager = bundle([
    { fileName: 'index.js', isEntry: true, imports: [],
      modules: { [`${ROOT}/src/features/chat-agent/model/TokensContext.tsx`]: {} } }, // TokensProvider at app root
  ]);
  assert.deepEqual(findStageLeaks(eager), []);
  const lazyLeak = bundle([
    { fileName: 'index.js', isEntry: true, imports: [],
      modules: { [`${ROOT}/src/features/chat-agent/ui/ChatAgent.tsx`]: {} } },
  ]);
  assert.deepEqual(findStageLeaks(lazyLeak), [`${ROOT}/src/features/chat-agent/ui/ChatAgent.tsx`]);
});
