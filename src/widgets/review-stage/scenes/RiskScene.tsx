// ─────────────────────────────────────────────────────────────────────────
// RISK SCENE — profile + per-file table + coverage drops + failed tests
// ─────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { KeyRound, Play, ShieldAlert } from 'lucide-react';
import {
  computePrRisk, coverageDeltas, failedTestsRow,
  type PullRequest,
} from '@entities/pr';
import type { RepoData } from '@entities/repo';
import { OK, SEV, TIER_COLOR, TIER_LABEL } from '../lib/tones';
import V2Card from '../ui/V2Card';

export default function RiskScene({ pr, repo }: { pr: PullRequest; repo: RepoData }) {
  const risk = useMemo(() => computePrRisk(pr, repo), [pr, repo]);
  const cov = useMemo(() => coverageDeltas(pr, repo), [pr, repo]);
  const tests = useMemo(() => failedTestsRow(pr), [pr]);
  const accent = TIER_COLOR[risk.tier];

  return (
    <V2Card className="p-5">
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-3.5 h-3.5 text-white/55" />
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">
          Risk profile
        </span>
        <span
          className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-[0.18em]"
          style={{ background: `${accent}26`, color: accent }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
          {TIER_LABEL[risk.tier]}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <RiskStat label="Blast"      value={String(risk.blastSum)} accent={risk.blastSum >= 25 ? SEV.medium : null} />
        <RiskStat label="Public API" value={String(risk.publicApiCount)} accent={risk.publicApiCount > 0 ? SEV.medium : null} />
        <RiskStat label="Low safety" value={String(risk.lowSafetyCount)} accent={risk.lowSafetyCount > 0 ? SEV.medium : null} />
        <RiskStat label="SAST"       value={String(risk.sastFindings)}   accent={risk.sastFindings > 0 ? SEV.blocker : null} />
        <RiskStat label="Coverage"   value={risk.avgCoverage === null ? '—' : `${String(Math.round(risk.avgCoverage * 100))}%`} accent={risk.avgCoverage !== null && risk.avgCoverage < 0.5 ? SEV.medium : null} />
        <RiskStat label="Cyclic"     value={String(risk.cyclicCount)} accent={risk.cyclicCount > 0 ? SEV.medium : null} />
      </div>

      {risk.secretsRisk && (
        <div
          className="mt-3 flex items-center gap-2 px-3 py-2 rounded-md text-[12px]"
          style={{ background: `${SEV.blocker}1a`, color: SEV.blocker, border: `1px solid ${SEV.blocker}55` }}
        >
          <KeyRound className="w-3.5 h-3.5 shrink-0" />
          A changed file matched the secrets-likely heuristic. Treat with care.
        </div>
      )}

      {risk.reasons.length > 0 && (
        <div className="mt-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
            Why this score
          </div>
          <ul className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[12px] text-white/70">
            {risk.reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span style={{ color: accent }}>▸</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Coverage drops */}
      {cov.length > 0 && (
        <div className="mt-5">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
            Coverage delta
          </div>
          <div className="mt-2 flex flex-col gap-1.5">
            {cov.map((r) => {
              const dropPct = Math.min(100, Math.max(0, r.drop));
              return (
                <div key={r.filePath} className="grid grid-cols-[1fr_auto] items-center gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-mono text-[11px] text-white/70">{r.filePath}</div>
                    <div className="mt-1 h-1 rounded-full overflow-hidden" style={{ background: `${SEV.blocker}22` }}>
                      <div className="h-full" style={{ width: `${String(dropPct)}%`, background: SEV.blocker }} />
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2 font-mono text-[11px] tabular-nums">
                    <span className="text-white/40">{r.before}%</span>
                    <span className="text-white/30">→</span>
                    <span className="text-white/85">{r.after}%</span>
                    <span style={{ color: r.drop > 0 ? SEV.blocker : TIER_COLOR.safe }}>
                      {r.drop > 0 ? `-${String(r.drop)}pp` : `+${String(-r.drop)}pp`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tests !== null && (
        <div className="mt-5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
              Failed tests
            </span>
            <span
              className="ml-auto inline-flex items-center px-2 h-5 rounded-full text-[10px] font-mono tabular-nums"
              style={{ background: `${OK}22`, color: OK }}
            >
              {tests.passed}/{tests.passed + tests.failed} passing
            </span>
          </div>
          {tests.failingNames.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1">
              {tests.failingNames.map((name) => (
                <li key={name} className="flex items-center justify-between gap-3 px-2 py-1 rounded-md bg-white/[0.025]">
                  <span className="font-mono text-[11px] truncate text-white/85">{name}</span>
                  <button
                    type="button"
                    className="shrink-0 inline-flex items-center gap-1 h-6 px-2 rounded-md text-[10px] font-bold bg-white/[0.06] text-white/70 hover:bg-white/[0.10]"
                  >
                    <Play className="w-3 h-3" />
                    Run
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </V2Card>
  );
}

function RiskStat({
  label, value, accent,
}: { label: string; value: string; accent: string | null }) {
  return (
    <div
      className="rounded-lg p-2.5"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: `1px solid ${accent ?? 'rgba(255,255,255,0.06)'}`,
        boxShadow: 'none',
      }}
    >
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">{label}</div>
      <div
        className="mt-0.5 text-[18px] font-black tabular-nums leading-none"
        style={{ color: accent ?? 'rgba(255,255,255,0.92)' }}
      >
        {value}
      </div>
    </div>
  );
}
