// ─────────────────────────────────────────────────────────────────────────
// ReviewCopilot — AI-native triage layer.
//
// Three slots, each with explicit *provenance* badge so the reviewer
// knows which signals are deterministic-static vs. LLM-derived. From
// Wickens (2002) on automation trust: trust calibration improves when
// users can see whether a recommendation is rule-based or model-based.
//
//   1. One-line take      — synthesised from prSummary + risk + findings.
//   2. Inspection path    — ordered ranked list of "what to read first",
//                            keyed off blast × symbol-importance × findings.
//   3. Why-this-matters   — per-finding explanation + suggested patch.
//
// All three are deterministic functions of the diff for now (no actual
// LLM call — this is a UI placeholder for an AI-native surface). The
// "AI" badge means "this would be model-derived in production"; the
// "static" badge means "this is rule-based and won't change".
//
// Visual treatment: subtle iridescent border on the AI-derived bits.
// No exclamation, no robot mascot — Bansal et al. (2021): heavy AI
// signage *reduces* trust in expert users.
// ─────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import { Sparkles, ChevronRight, ListOrdered, BrainCircuit } from 'lucide-react';
import {
  computePrRisk, engineFindings, engineSummary, type EngineFinding,
  type PullRequest,
} from '@entities/pr';
import type { RepoData } from '@entities/repo';
import { prSummary, symbolChanges, intentMismatch } from '../lib/sota';
import V2Card from './V2Card';

const SEV_COLOR: Record<EngineFinding['severity'], string> = {
  blocker: '#c25a55', high: '#d98a85', medium: '#a8893a', low: '#5a8fce',
};

// ── Slot 1: One-line take ────────────────────────────────────────────────

export function CopilotTake({ pr, repo }: { pr: PullRequest; repo: RepoData }) {
  const take = useMemo(() => buildOneLineTake(pr, repo), [pr, repo]);
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono min-w-0 max-w-full"
      style={{
        background: 'linear-gradient(90deg, rgba(149,131,184,0.10), rgba(122,167,212,0.10))',
        border: '1px solid rgba(149,131,184,0.35)',
        color: 'var(--fg-default)',
      }}
      title={take.long}
    >
      <Sparkles className="w-2.5 h-2.5 shrink-0" style={{ color: '#b8a4dc' }} />
      <span className="truncate min-w-0">{take.short}</span>
    </span>
  );
}

function buildOneLineTake(
  pr: PullRequest, repo: RepoData,
): { short: string; long: string } {
  const findings = engineFindings(pr, repo);
  const summary = engineSummary(findings);
  const risk = computePrRisk(pr, repo);
  const mismatch = intentMismatch(pr);
  const ps = prSummary(pr, repo, symbolChanges(pr));

  // Single-clause take. The decision bar already carries the verdict
  // word + critical-signal cluster, and the "where to look" hint is
  // redundant with RiskScene / ReviewerExpectations downstream — so we
  // keep only the lead clause here. Full narrative still ships via
  // `title`/long for hover.
  let short: string;
  if (summary.blocker > 0) {
    short = `${String(summary.blocker)} blocker${summary.blocker === 1 ? '' : 's'} — don't merge yet`;
  } else if (pr.hasConflicts) {
    short = 'merge conflicts — resolve before review';
  } else if (summary.high > 0) {
    short = `${String(summary.high)} high-severity finding${summary.high === 1 ? '' : 's'} — read carefully`;
  } else if (risk.tier === 'critical') {
    short = `high blast radius (${String(risk.blastSum)}) — verify dependents`;
  } else if (mismatch.detected) {
    short = 'description and changed files disagree';
  } else {
    short = 'low-risk profile — quick read';
  }

  return { short, long: ps.narrative };
}

// ── Slot 2: Inspection path ──────────────────────────────────────────────

type InspectionStep = {
  rank: number;
  filePath: string;
  reason: string;
  // Signal taxonomy — drives the right-edge tag colour.
  signal: 'blocker' | 'high' | 'public-api' | 'hot' | 'incident' | 'symbol';
};

/** Weights for the inspection-path ranker. 0..1 each. */
export type InspectionWeights = {
  severity: number;
  surface:  number;
  hotness:  number;
};

const DEFAULT_WEIGHTS: InspectionWeights = {
  severity: 0.7,
  surface:  0.5,
  hotness:  0.3,
};

export function InspectionPath({
  pr, repo, onJumpToFile, weights = DEFAULT_WEIGHTS,
}: {
  pr: PullRequest;
  repo: RepoData;
  onJumpToFile: (path: string) => void;
  weights?: InspectionWeights;
}) {
  const steps = useMemo<InspectionStep[]>(() => buildPath(pr, repo, weights), [pr, repo, weights]);
  const [expanded, setExpanded] = useState(true);
  if (steps.length === 0) return null;

  return (
    <V2Card className="p-5 relative overflow-hidden">
      {/* Faint chromatic border to mark "AI-derived" without being shouty. */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none rounded-xl"
        style={{
          background:
            'linear-gradient(135deg, rgba(149,131,184,0.04) 0%, transparent 35%, transparent 65%, rgba(122,167,212,0.04) 100%)',
        }}
      />
      <button
        type="button"
        onClick={() => { setExpanded((v) => !v); }}
        className="relative w-full flex items-center gap-2 mb-3 text-left"
      >
        <ListOrdered className="w-3.5 h-3.5 text-white/55" />
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">
          Recommended inspection path
        </span>
        <ProvenanceBadge kind="ai" />
        <span className="text-[10px] font-mono text-white/40">
          {steps.length} {steps.length === 1 ? 'stop' : 'stops'}
        </span>
        <ChevronRight
          className={`ml-auto w-3 h-3 text-white/40 transition-transform ${expanded ? 'rotate-90' : ''}`}
        />
      </button>

      {expanded && (
        <ol className="relative space-y-1.5">
          {steps.map((s) => (
            <li key={s.rank}>
              <button
                type="button"
                onClick={() => { onJumpToFile(s.filePath); }}
                className="w-full flex items-start gap-3 px-2 py-2 rounded-md text-left hover:bg-white/[0.03] transition-colors"
              >
                <span
                  className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-mono font-bold tabular-nums"
                  style={{
                    background: 'rgba(149,131,184,0.18)',
                    color: '#c2b3e0',
                    border: '1px solid rgba(149,131,184,0.40)',
                  }}
                >
                  {s.rank}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-mono text-white/85 truncate">
                    {s.filePath}
                  </span>
                  <span className="block mt-0.5 text-[11px] text-white/55 leading-snug">
                    {s.reason}
                  </span>
                </span>
                <SignalTag signal={s.signal} />
              </button>
            </li>
          ))}
        </ol>
      )}
    </V2Card>
  );
}

function buildPath(pr: PullRequest, repo: RepoData, weights: InspectionWeights): InspectionStep[] {
  const findings = engineFindings(pr, repo);
  // Each axis is multiplied by its weight (0..1). Default weights
  // were calibrated to match the previous fixed scoring (severity
  // dominates), so weights={1,1,1} doesn't drift from the original
  // ordering on a typical PR.
  const wSev  = weights.severity;
  const wSurf = weights.surface;
  const wHot  = weights.hotness;
  type Scored = {
    path: string;
    score: number;
    reasons: string[];
    signal: InspectionStep['signal'];
  };
  const scored: Scored[] = [];
  for (const f of pr.files) {
    if (f.fileId === null) {
      scored.push({
        path: f.path,
        score: (f.added + f.removed) * wHot,
        reasons: ['outside the indexed source — read by hand'],
        signal: 'symbol',
      });
      continue;
    }
    const file = repo.files[f.fileId];
    if (!file) continue;
    const fileFindings = findings.filter((x) => x.filePath === f.path);
    const blocker = fileFindings.find((x) => x.severity === 'blocker');
    const high = fileFindings.find((x) => x.severity === 'high');
    const isPublicApi = file.metrics.publicApi;
    const blast = file.deps.length;
    const total = f.added + f.removed;
    const isHot = f.hunks.length >= 3 && total >= 40;

    // Compose score = severity-component + surface-component + hot-component.
    // Each component carries its own scale so the weights stay [0..1].
    let sevScore = 0;
    let surfScore = 0;
    let hotScore = 0;
    const reasons: string[] = [];
    let signal: InspectionStep['signal'] = 'symbol';

    if (blocker !== undefined) {
      sevScore = 10000;
      reasons.push(blocker.title);
      signal = 'blocker';
    } else if (high !== undefined) {
      sevScore = 5000;
      reasons.push(high.title);
      signal = 'high';
    }
    if (isPublicApi) {
      surfScore = 2000 + blast * 50;
      if (signal === 'symbol') {
        reasons.push(`Public API surface · ${String(blast)} dependents`);
        signal = 'public-api';
      }
    } else {
      surfScore = blast * 5;
    }
    if (isHot) {
      hotScore = 1000;
      if (signal === 'symbol') {
        reasons.push(`${String(f.hunks.length)} hunks across ${String(total)} LOC — scan for hidden regressions`);
        signal = 'hot';
      }
    } else if (file.metrics.recentPRs >= 5 && file.metrics.churn > 0.5) {
      hotScore = 500 + file.metrics.recentPRs * 20;
      if (signal === 'symbol') {
        reasons.push(`Hot file: ${String(file.metrics.recentPRs)} PRs in 90d, high churn`);
        signal = 'incident';
      }
    } else {
      hotScore = total;
    }
    if (reasons.length === 0) {
      const sym = f.path.split('/').pop() ?? f.path;
      reasons.push(`${String(total)} LOC delta on ${sym}`);
    }

    const score = sevScore * wSev + surfScore * wSurf + hotScore * wHot;
    scored.push({ path: f.path, score, reasons, signal });
  }
  scored.sort((a, b) => b.score - a.score);
  // Cap at 5 — past that, the "ranked recommendation" loses meaning
  // and the reviewer should just read in path order.
  return scored.slice(0, 5).map((s, i) => ({
    rank: i + 1,
    filePath: s.path,
    reason: s.reasons[0],
    signal: s.signal,
  }));
}

function SignalTag({ signal }: { signal: InspectionStep['signal'] }) {
  const map: Record<InspectionStep['signal'], { label: string; color: string }> = {
    blocker:    { label: 'BLOCK',  color: SEV_COLOR.blocker },
    high:       { label: 'HIGH',   color: SEV_COLOR.high },
    'public-api': { label: 'API',    color: '#7aa7d4' },
    hot:        { label: 'HOT',    color: '#d3b264' },
    incident:   { label: 'CHURN',  color: '#b8a4dc' },
    symbol:     { label: 'EDIT',   color: '#8b949e' },
  };
  const m = map[signal];
  return (
    <span
      className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-[0.14em]"
      style={{ background: `${m.color}26`, color: m.color }}
    >
      {m.label}
    </span>
  );
}

// ── Provenance badge ─────────────────────────────────────────────────────

export function ProvenanceBadge({ kind }: { kind: 'ai' | 'static' }) {
  if (kind === 'ai') {
    return (
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[8.5px] font-bold uppercase tracking-[0.14em]"
        style={{
          background: 'linear-gradient(90deg, rgba(149,131,184,0.18), rgba(122,167,212,0.18))',
          color: '#c2b3e0',
          border: '1px solid rgba(149,131,184,0.40)',
        }}
        title="Synthesised — would be LLM-derived in production"
      >
        <BrainCircuit className="w-2 h-2" />
        ai
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[8.5px] font-bold uppercase tracking-[0.14em] text-white/55"
      style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-strong)' }}
      title="Deterministic static analysis"
    >
      static
    </span>
  );
}
