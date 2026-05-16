// Synthetic agent helpers — pure builders for the demo's
// "looks alive" stream. Extracted from CodingStage so the
// orchestrator only needs to wire them into setTasks/setDraft.

import type { AgentBlock, DiffBlock } from '../parts/types';
import { pickKeyword } from '../lib/codingStageHelpers';
import {
  candidatesFromFinding,
  seedFromFinding,
} from '@features/verified-fix';
import type { EngineFinding } from '@entities/pr';

// Synthetic agent response — shared by single-model and side-by-side
// paths so the two streams use the same block sequence.
export function buildSyntheticResponse(trimmed: string): AgentBlock[] {
  return [
    { kind: 'thinking', durationMs: 1600, text: '입력을 분석하고 변경 범위를 추정합니다.' },
    { kind: 'text', text: `요청 접수: \`${trimmed.slice(0, 80)}${trimmed.length > 80 ? '…' : ''}\`. 컨텍스트를 모으는 중입니다.` },
    { kind: 'tool', tool: 'search', label: `rg "${pickKeyword(trimmed)}"`, detail: '8 results · 5 files', status: 'ok' },
    { kind: 'tool', tool: 'read', label: 'src/index.ts', detail: 'L1-80', status: 'ok' },
    { kind: 'plan', title: 'change plan', items: [
      { id: 'p1', text: '변경 영향 범위 식별', done: true },
      { id: 'p2', text: '핵심 시그니처 보존하며 구현 교체', done: false },
      { id: 'p3', text: '단위 테스트 추가 + 회귀 검증', done: false },
    ] },
    { kind: 'text', text: '계획대로 진행하겠습니다. 다음 메시지에서 변경 사항을 적용합니다.' },
  ];
}

// Build a synthetic EngineFinding from the agent's diff block and
// funnel it through the same fixtures pipeline the demo seeds use.
// The `rule` we pick determines which validation outcome bucket the
// mock engine will produce — so we choose deterministically based on
// diff size: tiny → console-usage (first-pass success), medium →
// edit-safety (post-critique success), large/api → public-surface
// (human checkpoint). That way a long agent run *feels* like a
// human-checkpoint candidate without us hard-coding it.
//
// Returns `null` when the diff has no files — caller should no-op.
export function buildVerifiedFixSeed(
  taskId: string,
  diff: DiffBlock,
): { seed: ReturnType<typeof seedFromFinding>; candidates: ReturnType<typeof candidatesFromFinding> } | null {
  const totalChanged = diff.added + diff.removed;
  const firstFile = diff.files[0];
  if (firstFile === undefined) return null;

  const isApi = firstFile.path.includes('/api/') || firstFile.path.endsWith(".d.ts");
  const rule = isApi ? 'public-surface'
    : totalChanged > 80 ? 'edit-safety'
    : 'console-usage';
  const finding: EngineFinding = {
    id: `coding-${taskId}-${String(Date.now())}`,
    severity: rule === 'public-surface' ? 'medium' : rule === 'edit-safety' ? 'high' : 'low',
    category: rule === 'public-surface' ? 'API' : rule === 'edit-safety' ? 'STRUCT-INTEGRITY' : 'STYLE',
    rule,
    title: `Agent edits to ${firstFile.path.split('/').pop() ?? firstFile.path}`,
    body: `${String(diff.added)} additions, ${String(diff.removed)} removals across ${String(diff.files.length)} file${diff.files.length === 1 ? '' : 's'}.`,
    filePath: firstFile.path,
    fileId: null,
    line: firstFile.hunks[0]?.startLine ?? null,
    autoFixable: true,
    fixRationale: rule === 'console-usage'
      ? 'Mechanical replacement; tests cover all callsites.'
      : null,
  };
  const seed = seedFromFinding(finding);
  const candidates = candidatesFromFinding(seed, finding);
  return { seed, candidates };
}
