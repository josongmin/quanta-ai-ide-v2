// Deterministic factory: turn an EngineFinding into a verified-fix Seed
// + 1–2 CandidateFix entries. We don't generate randomly so screenshots
// stay stable and self-critique transitions are reproducible.

import type { EngineFinding } from '@entities/pr';
import type {
  CandidateFix, CounterEvidence, DiffHunk, ProofObligation, Seed,
} from './types';

export function seedFromFinding(f: EngineFinding): Seed {
  return {
    id: `seed-${f.id}`,
    kind: 'alert',
    title: f.title,
    symptom: f.body,
    evidenceRefs: [
      { kind: 'symbol', label: shortName(f.filePath), path: f.filePath },
      ...(f.category === 'SECURITY'
        ? [{ kind: 'sarif' as const, label: `${f.category}/${f.rule}` }]
        : []),
    ],
    suspectedRootCause: f.fixRationale ?? undefined,
    blastHint: blastHintFor(f),
    constraints: constraintsFor(f),
    age: 'just-flagged',
    severity: severityFromFinding(f.severity),
  };
}

export function candidatesFromFinding(seed: Seed, f: EngineFinding): CandidateFix[] {
  const primary = primaryCandidate(seed, f);
  // Only emit an alternative for rules where two real strategies exist;
  // otherwise the second candidate is filler and dilutes the screen.
  const alt = alternativeCandidate(seed, f);
  return alt ? [primary, alt] : [primary];
}

// ─── primary ────────────────────────────────────────────────────────────

function primaryCandidate(seed: Seed, f: EngineFinding): CandidateFix {
  const obligations = obligationsFor(f);
  const counter = counterEvidenceFor(f);
  const weakest = obligations.find((o) => o.status !== 'pass')?.id ?? null;
  return {
    id: `cand-${f.id}-a`,
    seedId: seed.id,
    title: titleFor(f, 'primary'),
    rationale: f.fixRationale ?? rationaleFor(f),
    pros: prosFor(f),
    cons: consFor(f),
    diffSummary: diffSummaryFor(f),
    changedLines: estimateChangedLines(f),
    changedFiles: 1,
    blastModules: estimateBlastModules(f),
    publicApiChange: f.category === 'API',
    obligations,
    counterEvidence: counter,
    confidence: confidenceFor(f),
    weakestObligationId: weakest,
    tier: tierFor(f),
    diffPreview: diffPreviewFor(f),
    patchKind: f.rule,
  };
}

function alternativeCandidate(seed: Seed, f: EngineFinding): CandidateFix | null {
  // Strategy switch: only rules where a second realistic strategy exists.
  const altMap: Record<string, string> = {
    'blast-radius': 'extract-seam',
    'public-surface': 'deprecate-and-shim',
    'sast': 'sanitiser-injection',
    'edit-safety': 'split-and-test',
  };
  const altKind = altMap[f.rule];
  if (altKind === undefined) return null;
  const obligations = obligationsFor(f).map((o) => ({ ...o, id: `${o.id}-b` }));
  // Mark the alternative as a touch riskier so the primary stays the
  // recommended path — avoids decision paralysis.
  obligations[0] = { ...obligations[0], status: 'unknown' };
  return {
    id: `cand-${f.id}-b`,
    seedId: seed.id,
    title: titleFor(f, 'alt'),
    rationale: `Alternative: ${altKind}. Larger surface but addresses the underlying coupling, not just the symptom.`,
    pros: ['Removes the structural cause, not just the symptom', 'Easier to keep clean over time'],
    cons: ['Larger blast', 'Needs owner sign-off on the seam', 'Slower to validate'],
    diffSummary: 'multi-file refactor',
    changedLines: estimateChangedLines(f) * 3,
    changedFiles: 3,
    blastModules: estimateBlastModules(f) + 2,
    publicApiChange: f.category === 'API',
    obligations,
    counterEvidence: counterEvidenceFor(f).slice(0, 1),
    confidence: 0.55,
    weakestObligationId: obligations[0]?.id ?? null,
    tier: 'human-required',
    diffPreview: [],
    patchKind: altKind,
  };
}

// ─── builders ───────────────────────────────────────────────────────────

function obligationsFor(f: EngineFinding): ProofObligation[] {
  const base: ProofObligation[] = [
    {
      id: 'static-typecheck',
      label: 'Type checker still passes',
      category: 'static',
      status: 'pending',
      detail: 'tsc on the affected package',
    },
    {
      id: 'affected-tests',
      label: 'Affected tests pass',
      category: 'dynamic',
      status: 'pending',
      detail: `tests touching ${shortName(f.filePath)} and its callers`,
    },
    {
      id: 'public-api',
      label: 'Public API unchanged',
      category: 'static',
      status: f.category === 'API' ? 'pending' : 'pass',
      detail: f.category === 'API'
        ? 'A migration shim must be added or the change explicitly accepted.'
        : 'No exported symbols touched.',
    },
  ];
  if (f.category === 'SECURITY') {
    base.push({
      id: 'taint-no-worse',
      label: 'Taint flow no worse than baseline',
      category: 'static',
      status: 'pending',
      detail: 'Source→sink reachability re-analysed.',
    });
  }
  if (f.rule === 'blast-radius' || f.rule === 'edit-safety') {
    base.push({
      id: 'unknown-bounded',
      label: 'Unknown zone bounded',
      category: 'static',
      status: 'unknown',
      detail: 'Some downstream callers have no test coverage.',
    });
  }
  return base;
}

// The differentiator: counter-evidence rendered with the same weight
// as the proofs. Plan doc explicitly demands this be primary surface.
function counterEvidenceFor(f: EngineFinding): CounterEvidence[] {
  const out: CounterEvidence[] = [];
  if (f.category === 'SECURITY') {
    out.push({
      id: 'ce-1',
      label: 'Sanitiser may be inadequate for non-ASCII payloads',
      detail: 'The escape table covers ASCII metacharacters only; UTF-8 multi-byte sequences are untested.',
      severity: 'concern',
    });
  }
  if (f.rule === 'blast-radius' || f.rule === 'edit-safety') {
    out.push({
      id: 'ce-2',
      label: 'Two transitive callers have no test coverage',
      detail: 'A regression here would not surface in CI; consider adding probes before merging.',
      severity: 'concern',
    });
  }
  if (f.category === 'API') {
    out.push({
      id: 'ce-3',
      label: 'External consumers may rely on the previous signature',
      detail: 'Public-API change without a migration window can break downstream packages.',
      severity: 'block',
    });
  }
  // Always include at least one note so the surface is never empty —
  // an empty counter-evidence list is suspicious by itself.
  if (out.length === 0) {
    out.push({
      id: 'ce-default',
      label: 'No counter-evidence found by the engine',
      detail: 'Absence of a flag is not a positive signal — a careful reviewer should still confirm intent.',
      severity: 'note',
    });
  }
  return out;
}

function diffPreviewFor(f: EngineFinding): DiffHunk[] {
  if (f.line === null) return [];
  return [{
    file: f.filePath,
    startLine: f.line,
    before: previewBeforeFor(f),
    after: previewAfterFor(f),
  }];
}

function previewBeforeFor(f: EngineFinding): string[] {
  switch (f.rule) {
    case 'console-usage': return ['console.log("debug:", payload);'];
    case 'any-density':   return ['function handle(input: any) {'];
    case 'sast':          return ['db.query(`SELECT * FROM users WHERE id = ${id}`);'];
    case 'secrets':       return ['const apiKey = "sk_live_4242424242424242";'];
    case 'todo-density':  return ['// TODO: handle the empty-state case'];
    default:              return [`// ${f.title}`];
  }
}
function previewAfterFor(f: EngineFinding): string[] {
  switch (f.rule) {
    case 'console-usage': return ['logger.debug("payload", { payload });'];
    case 'any-density':   return ['function handle(input: HandleInput) {'];
    case 'sast':          return ['db.query("SELECT * FROM users WHERE id = ?", [id]);'];
    case 'secrets':       return ['const apiKey = process.env.API_KEY ?? "";'];
    case 'todo-density':  return ['// Tracked: BACKLOG-2421 (empty-state handling)'];
    default:              return [`// fixed: ${f.rule}`];
  }
}

// ─── small helpers ──────────────────────────────────────────────────────

function severityFromFinding(s: EngineFinding['severity']): Seed['severity'] {
  return s === 'blocker' ? 'crit' : s === 'high' ? 'high' : s === 'medium' ? 'med' : 'low';
}

function tierFor(f: EngineFinding): CandidateFix['tier'] {
  if (f.category === 'API' || f.category === 'SECURITY') return 'human-required';
  if (f.severity === 'blocker' || f.severity === 'high') return 'guarded';
  return 'safe-mechanical';
}

function confidenceFor(f: EngineFinding): number {
  if (f.category === 'STYLE' || f.category === 'TESTS') return 0.92;
  if (f.category === 'API') return 0.62;
  if (f.category === 'SECURITY') return 0.74;
  return 0.81;
}

function blastHintFor(f: EngineFinding): string[] {
  if (f.rule === 'blast-radius') return ['transitive callers > 8', 'spans 3 packages'];
  if (f.category === 'API')      return ['public surface', 'external consumers possible'];
  if (f.category === 'SECURITY') return ['source→sink path active'];
  return ['localised'];
}
function constraintsFor(f: EngineFinding): string[] {
  if (f.category === 'API') return ['preserve external contract'];
  if (f.category === 'SECURITY') return ['no regression in taint baseline'];
  return [];
}
function titleFor(f: EngineFinding, kind: 'primary' | 'alt'): string {
  return kind === 'primary'
    ? f.title.replace(/^(.{0,40}).*$/, '$1') + ' — minimal patch'
    : f.title.replace(/^(.{0,40}).*$/, '$1') + ' — refactor seam';
}
function rationaleFor(f: EngineFinding): string {
  return `Patch closes the ${f.category}/${f.rule} finding without expanding the surface.`;
}
function diffSummaryFor(f: EngineFinding): string {
  return f.line !== null ? `1 hunk @ ${shortName(f.filePath)}:${String(f.line)}` : '1 hunk';
}
function prosFor(f: EngineFinding): string[] {
  return [
    'Smallest viable change',
    f.fixRationale !== null ? 'Engine-validated template' : 'Direct address of the symptom',
  ];
}
function consFor(f: EngineFinding): string[] {
  if (f.category === 'API') return ['Public-API impact requires migration'];
  if (f.category === 'SECURITY') return ['Security fix needs a regression probe'];
  return ['Does not address structural causes'];
}
function estimateChangedLines(f: EngineFinding): number {
  switch (f.severity) {
    case 'blocker': return 6;
    case 'high':    return 4;
    case 'medium':  return 3;
    default:        return 2;
  }
}
function estimateBlastModules(f: EngineFinding): number {
  return f.rule === 'blast-radius' ? 4 : f.category === 'API' ? 3 : 1;
}
function shortName(p: string): string {
  return p.split('/').pop() ?? p;
}
