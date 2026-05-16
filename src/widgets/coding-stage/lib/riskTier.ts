import type { AgentTurn, DiffBlock, ToolBlock } from '../parts/types';

export type RiskTier = 'safe' | 'review' | 'blast-radius';

export type RiskAssessment = {
  tier: RiskTier;
  filesTouched: number;
  publicSurface: boolean;
  largeChange: boolean;
  ranCommands: boolean;
  largestDiffLines: number;
  reasons: string[];
};

const PUBLIC_SURFACE_PATTERNS: RegExp[] = [
  /\/api\//,
  /\.d\.ts$/,
  /\/public\//,
  /index\.(ts|tsx)$/,
];

function isPublicPath(path: string): boolean {
  return PUBLIC_SURFACE_PATTERNS.some((re) => re.test(path));
}

export function assessTurn(turn: AgentTurn): RiskAssessment | null {
  const toolBlocks: ToolBlock[] = turn.blocks.filter((b): b is ToolBlock => b.kind === 'tool');
  const diffBlocks: DiffBlock[] = turn.blocks.filter((b): b is DiffBlock => b.kind === 'diff');

  if (toolBlocks.length === 0 && diffBlocks.length === 0) return null;

  const touchedPaths = new Set<string>();
  for (const tb of toolBlocks) {
    if ((tb.tool === 'edit' || tb.tool === 'read') && tb.label) {
      touchedPaths.add(tb.label);
    }
  }
  for (const db of diffBlocks) {
    for (const f of db.files) touchedPaths.add(f.path);
  }

  const filesTouched = touchedPaths.size;
  const publicSurface = Array.from(touchedPaths).some(isPublicPath);

  let largestDiff = 0;
  for (const db of diffBlocks) {
    const total = db.added + db.removed;
    if (total > largestDiff) largestDiff = total;
  }
  const largeChange = largestDiff > 80;

  const ranCommands = toolBlocks.some((tb) => tb.tool === 'run');

  const reasons: string[] = [];
  if (publicSurface) reasons.push('publicSurface');
  if (largeChange) reasons.push('largeChange');
  if (filesTouched >= 3) reasons.push('manyFiles');
  if (ranCommands) reasons.push('ranCommand');

  let tier: RiskTier;
  if ((publicSurface && (largeChange || filesTouched >= 3)) || (ranCommands && largeChange)) {
    tier = 'blast-radius';
  } else if (publicSurface || largeChange || filesTouched >= 5 || ranCommands) {
    tier = 'review';
  } else {
    tier = 'safe';
  }

  return {
    tier,
    filesTouched,
    publicSurface,
    largeChange,
    ranCommands,
    largestDiffLines: largestDiff,
    reasons,
  };
}

export function reasonKeys(a: RiskAssessment): { key: string; vars?: Record<string, number> }[] {
  const out: { key: string; vars?: Record<string, number> }[] = [];
  if (a.publicSurface) out.push({ key: 'reason.publicSurface' });
  if (a.largeChange) out.push({ key: 'reason.largeChange', vars: { n: a.largestDiffLines } });
  if (a.filesTouched >= 3) out.push({ key: 'reason.manyFiles', vars: { n: a.filesTouched } });
  if (a.ranCommands) out.push({ key: 'reason.ranCommand' });
  return out;
}
