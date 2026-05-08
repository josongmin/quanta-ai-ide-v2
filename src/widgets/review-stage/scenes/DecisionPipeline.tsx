// ─────────────────────────────────────────────────────────────────────────
// DECISION PIPELINE — gates → mergeable. Inspired by the way GitLab's
// merge-request widget shows status, but as a horizontal ribbon so the
// reviewer sees *which* gate is failing without scrolling.
// ─────────────────────────────────────────────────────────────────────────

import {
  Activity, AlertTriangle, CheckCircle2, Loader2, MinusCircle, X,
} from 'lucide-react';
import {
  computePrRisk, engineFindings, engineSummary, summariseChecks,
  type PullRequest,
} from '@entities/pr';
import type { RepoData } from '@entities/repo';
import { OK, SEV, TIER_LABEL } from '../lib/tones';
import V2Card from '../ui/V2Card';

type GateState = 'pass' | 'warn' | 'fail' | 'pending' | 'idle';

export default function DecisionPipeline({ pr, repo }: { pr: PullRequest; repo: RepoData }) {
  const ci = summariseChecks(pr.checks);
  const findings = engineFindings(pr, repo);
  const summary = engineSummary(findings);
  const risk = computePrRisk(pr, repo);
  const reviewersDone = pr.reviewers.length > 0
    && pr.reviewers.every((r) => r.state === 'approved' || r.state === 'commented');

  const gates: { key: string; label: string; state: GateState; detail: string }[] = [
    {
      key: 'lint',
      label: 'Lint',
      state: ci.required.failed > 0 ? 'fail' : ci.required.pending > 0 ? 'pending' : 'pass',
      detail: `${String(ci.required.passed)}✓ / ${String(ci.required.failed)}✕`,
    },
    {
      key: 'sast',
      label: 'SAST',
      state: summary.blocker > 0 ? 'fail' : summary.high > 0 ? 'warn' : 'pass',
      detail: summary.blocker > 0 ? `${String(summary.blocker)} blocker` : `${String(findings.length)} finding`,
    },
    {
      key: 'risk',
      label: 'Risk',
      state: risk.tier === 'critical' ? 'fail' : risk.tier === 'attention' ? 'warn' : 'pass',
      detail: TIER_LABEL[risk.tier],
    },
    {
      key: 'cov',
      label: 'Coverage',
      state: risk.avgCoverage === null ? 'idle'
        : risk.avgCoverage >= 0.7 ? 'pass'
        : risk.avgCoverage >= 0.5 ? 'warn'
        : 'fail',
      detail: risk.avgCoverage === null ? '—' : `${String(Math.round(risk.avgCoverage * 100))}%`,
    },
    {
      key: 'review',
      label: 'Reviewers',
      state: reviewersDone ? 'pass' : pr.reviewers.length === 0 ? 'idle' : 'pending',
      detail: `${String(pr.reviewers.filter((r) => r.state === 'approved').length)}/${String(pr.reviewers.length)}`,
    },
    {
      key: 'merge',
      label: 'Mergeable',
      state: pr.hasConflicts ? 'fail' : 'pass',
      detail: pr.hasConflicts ? 'conflicts' : `${String(pr.ahead)}↑${String(pr.behind)}↓`,
    },
  ];

  const stateColor = (s: GateState): string =>
    s === 'fail' ? SEV.blocker : s === 'warn' ? SEV.medium : s === 'pass' ? OK
      : s === 'pending' ? SEV.low : '#8b949e';

  return (
    <V2Card className="px-4 py-3">
      <div className="flex items-center gap-1.5 mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">
        <Activity className="w-3 h-3" />
        Merge pipeline
        <span className="ml-auto text-[10px] font-mono text-white/40">
          {gates.filter((g) => g.state === 'pass').length}/{gates.length} gates clear
        </span>
      </div>
      <div className="flex items-stretch gap-0">
        {gates.map((g, i) => {
          const c = stateColor(g.state);
          return (
            <div key={g.key} className="flex items-center flex-1 min-w-0">
              <div
                className="flex-1 min-w-0 rounded-lg px-2.5 py-2 relative overflow-hidden"
                style={{
                  background: `linear-gradient(140deg, ${c}1a, ${c}06)`,
                  border: `1px solid ${c}40`,
                }}
              >
                <div className="flex items-center gap-1.5">
                  <GateGlyph state={g.state} color={c} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/85">
                    {g.label}
                  </span>
                </div>
                <div className="mt-0.5 text-[10px] font-mono tabular-nums truncate" style={{ color: c }}>
                  {g.detail}
                </div>
              </div>
              {i < gates.length - 1 && (
                <div className="shrink-0 w-3 flex items-center justify-center">
                  <span className="block w-2 h-px bg-white/15" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </V2Card>
  );
}

function GateGlyph({ state, color }: { state: GateState; color: string }) {
  if (state === 'pass')    return <CheckCircle2 className="w-3 h-3" style={{ color }} />;
  if (state === 'fail')    return <X            className="w-3 h-3" style={{ color }} />;
  if (state === 'warn')    return <AlertTriangle className="w-3 h-3" style={{ color }} />;
  if (state === 'pending') return <Loader2     className="w-3 h-3 animate-spin" style={{ color }} />;
  return <MinusCircle className="w-3 h-3" style={{ color }} />;
}
