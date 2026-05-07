import { useMemo } from 'react';
import {
  ArrowDownRight, ArrowUpRight, Play, Sparkles, Zap,
} from 'lucide-react';
import {
  computePrRisk, coverageDeltas, displayName, engineFindings, engineSummary,
  failedTestsRow, summariseConversation,
  type EngineSummary, type PullRequest, type RiskTier,
} from '@entities/pr';
import type { RepoData } from '@entities/repo';
import { Avatar } from '@features/review-pr';
import { useTranslation } from '@shared/i18n';
import PastIncidentsCard from '../ui/PastIncidentsCard';
import CallGraphChangesCard from '../ui/CallGraphChangesCard';

// Insights tab — the "what does the engine see in this PR?" canvas.
// Aggregates the static-analysis projections (engine findings, blast/risk
// numbers, coverage deltas, failing tests, unresolved threads, past
// incidents, call-graph diff) into a single scannable surface that
// complements the EngineFindingsRail docked on the right.

type Props = {
  pr: PullRequest;
  repo: RepoData;
  isDark: boolean;
};

const STRUCTURAL_RISK: Record<RiskTier, number> = {
  safe: 0.2,
  attention: 0.55,
  critical: 0.85,
};

export default function InsightsTab({ pr, repo, isDark }: Props) {
  const findings = useMemo(() => engineFindings(pr, repo), [pr, repo]);
  const summary = useMemo(() => engineSummary(findings), [findings]);
  const risk = useMemo(() => computePrRisk(pr, repo), [pr, repo]);

  const avgCognitive = useMemo(() => {
    let sum = 0;
    let n = 0;
    for (const f of pr.files) {
      if (f.fileId === null) continue;
      const file = repo.files[f.fileId];
      if (!file) continue;
      sum += file.metrics.cognitive;
      n++;
    }
    return n > 0 ? sum / n : 0;
  }, [pr.files, repo]);

  const tiles = useMemo(() => {
    const blast = risk.blastSum;
    const structural = STRUCTURAL_RISK[risk.tier];
    const coveragePct = risk.avgCoverage !== null
      ? Math.round(risk.avgCoverage * 100)
      : 0;
    return [
      {
        key: 'blast',
        label: 'Blast Radius',
        value: blast.toString(),
        deltaSign: 'up' as const,
        delta: `+${Math.max(1, Math.round(blast * 0.2)).toString()}`,
        context: `${pr.files.length.toString()} file${pr.files.length === 1 ? '' : 's'} changed`,
        spark: spark(pr.number, blast, 0),
        tone: blast >= 25 ? '#c25a55' : blast >= 10 ? '#a8893a' : '#4f9a5c',
      },
      {
        key: 'struct',
        label: 'Structural Risk',
        value: structural.toFixed(2),
        deltaSign: risk.tier === 'safe' ? ('down' as const) : ('up' as const),
        delta: risk.tier === 'safe' ? '-0.05' : '+0.12',
        context: `tier: ${risk.tier}`,
        spark: spark(pr.number, Math.round(structural * 100), 1),
        tone: risk.tier === 'critical' ? '#c25a55'
          : risk.tier === 'attention' ? '#a8893a' : '#4f9a5c',
      },
      {
        key: 'cov',
        label: 'Coverage',
        value: `${coveragePct.toString()}%`,
        deltaSign: 'down' as const,
        delta: '-3pp',
        context: 'avg across changed files',
        spark: spark(pr.number, coveragePct, 2),
        tone: coveragePct >= 70 ? '#4f9a5c' : coveragePct >= 50 ? '#a8893a' : '#c25a55',
      },
      {
        key: 'cog',
        label: 'Complexity',
        value: Math.round(avgCognitive).toString(),
        deltaSign: 'up' as const,
        delta: `+${Math.max(1, Math.round(avgCognitive * 0.08)).toString()}`,
        context: 'cognitive · avg',
        spark: spark(pr.number, Math.round(avgCognitive), 3),
        tone: avgCognitive >= 50 ? '#c25a55' : avgCognitive >= 25 ? '#a8893a' : '#4f9a5c',
      },
    ];
  }, [pr, risk, avgCognitive]);

  const covRows = useMemo(() => coverageDeltas(pr, repo), [pr, repo]);
  const tests = useMemo(() => failedTestsRow(pr), [pr]);
  const threads = useMemo(() => summariseConversation(pr), [pr]);

  const focusRail = () => {
    const el = document.getElementById('engine-findings-rail');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-6">
      <EngineSummaryCard
        summary={summary}
        total={findings.length}
        onOpenRail={focusRail}
        isDark={isDark}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <StatTile
            key={t.key}
            label={t.label}
            value={t.value}
            deltaSign={t.deltaSign}
            delta={t.delta}
            context={t.context}
            spark={t.spark}
            tone={t.tone}
            isDark={isDark}
          />
        ))}
      </div>

      <CoverageDeltaCard rows={covRows} isDark={isDark} />

      {tests !== null && <FailedTestsCard tests={tests} isDark={isDark} />}

      <UnresolvedThreadsCard threads={threads} isDark={isDark} />

      <PastIncidentsCard pr={pr} repo={repo} isDark={isDark} />

      <CallGraphChangesCard pr={pr} repo={repo} isDark={isDark} />
    </div>
  );
}

// ─── Engine summary card ─────────────────────────────────────────────────

function EngineSummaryCard({
  summary, total, onOpenRail, isDark,
}: {
  summary: EngineSummary;
  total: number;
  onOpenRail: () => void;
  isDark: boolean;
}) {
  const card = isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white border-black/5';
  const fg = isDark ? 'text-white/85' : 'text-black/85';
  const muted = isDark ? 'text-white/55' : 'text-black/55';
  const btn = isDark
    ? 'bg-white/[0.06] hover:bg-white/[0.10] text-white/85 border-white/10'
    : 'bg-black/[0.04] hover:bg-black/[0.08] text-black/85 border-black/10';

  return (
    <section className={`rounded-xl border ${card} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={`mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] ${muted}`}>
            <Sparkles className="w-3 h-3" />
            Engine summary
          </div>
          <div className={`text-[13px] font-bold ${fg}`}>
            Static engine surfaced {total} finding{total === 1 ? '' : 's'}
            <span className={`ml-2 font-mono text-[11px] ${muted}`}>
              (Blocker {summary.blocker} / High {summary.high} / Medium {summary.medium} / Low {summary.low})
            </span>
          </div>
          <div className={`mt-0.5 text-[12px] ${muted}`}>
            {summary.autoFix} auto-fixable.
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenRail}
          className={`shrink-0 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border text-[11px] font-bold ${btn}`}
        >
          <Zap className="w-3 h-3" />
          Open Auto-Review
        </button>
      </div>
    </section>
  );
}

// ─── Stat tile ───────────────────────────────────────────────────────────

function StatTile({
  label, value, deltaSign, delta, context, spark, tone, isDark,
}: {
  label: string;
  value: string;
  deltaSign: 'up' | 'down';
  delta: string;
  context: string;
  spark: number[];
  tone: string;
  isDark: boolean;
}) {
  const card = isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white border-black/5';
  const fg = isDark ? 'text-white/85' : 'text-black/85';
  const muted = isDark ? 'text-white/40' : 'text-black/40';
  const Arrow = deltaSign === 'up' ? ArrowUpRight : ArrowDownRight;
  return (
    <div className={`rounded-xl border ${card} p-3`}>
      <div className={`text-[10px] font-bold uppercase tracking-[0.18em] ${muted}`}>
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className={`text-[24px] font-black tabular-nums leading-none ${fg}`}>
          {value}
        </span>
        <span className="inline-flex items-center gap-0.5 text-[10px] font-mono" style={{ color: tone }}>
          <Arrow className="w-3 h-3" />
          {delta}
        </span>
      </div>
      <div className={`mt-1.5 text-[11px] ${muted}`}>{context}</div>
      <Sparkline values={spark} tone={tone} />
    </div>
  );
}

function Sparkline({ values, tone }: { values: number[]; tone: string }) {
  const max = Math.max(1, ...values);
  return (
    <div className="mt-2 flex items-end gap-[2px] h-5">
      {values.map((v, i) => (
        <span
          key={`bar-${i.toString()}`}
          className="w-[3px] rounded-sm"
          style={{
            height: `${((v / max) * 100).toString()}%`,
            background: tone,
            opacity: 0.55 + (i / values.length) * 0.45,
          }}
        />
      ))}
    </div>
  );
}

// Deterministic 10-bar sparkline seeded by PR number + tile index + value.
function spark(prNumber: number, value: number, salt: number): number[] {
  const out: number[] = [];
  let s = (prNumber * 9301 + salt * 7919 + value * 131) % 233280;
  for (let i = 0; i < 10; i++) {
    s = (s * 9301 + 49297) % 233280;
    const norm = s / 233280;
    // Trend slightly toward `value` so the line "ends" at the displayed number.
    const target = Math.max(1, value);
    const v = Math.round(target * (0.4 + norm * 0.7));
    out.push(v);
  }
  return out;
}

// ─── Coverage delta per file ─────────────────────────────────────────────

function CoverageDeltaCard({
  rows, isDark,
}: {
  rows: ReturnType<typeof coverageDeltas>;
  isDark: boolean;
}) {
  const card = isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white border-black/5';
  const fg = isDark ? 'text-white/85' : 'text-black/85';
  const muted = isDark ? 'text-white/40' : 'text-black/40';
  const mono = isDark ? 'text-white/70' : 'text-black/70';
  return (
    <section className={`rounded-xl border ${card} p-4`}>
      <div className={`mb-2 text-[10px] font-bold uppercase tracking-[0.18em] ${muted}`}>
        Coverage delta per file
      </div>
      {rows.length === 0 ? (
        <div className={`text-[12px] italic ${muted}`}>
          Coverage didn&apos;t move significantly.
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {rows.map((r) => {
            const dropPct = Math.min(100, Math.max(0, r.drop));
            return (
              <div key={r.filePath} className="grid grid-cols-[1fr_auto] items-center gap-3">
                <div className="min-w-0">
                  <div className={`truncate font-mono text-[11px] ${mono}`}>{r.filePath}</div>
                  <div className="mt-1 h-1 rounded-full overflow-hidden" style={{ background: '#c25a5522' }}>
                    <div
                      className="h-full"
                      style={{ width: `${dropPct.toString()}%`, background: '#c25a55' }}
                    />
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2 font-mono text-[11px] tabular-nums">
                  <span className={muted}>{r.before}%</span>
                  <span className={muted}>→</span>
                  <span className={fg}>{r.after}%</span>
                  <span style={{ color: r.drop > 0 ? '#c25a55' : '#4f9a5c' }}>
                    {r.drop > 0 ? `-${r.drop.toString()}pp` : `+${(-r.drop).toString()}pp`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ─── Failed tests ────────────────────────────────────────────────────────

function FailedTestsCard({
  tests, isDark,
}: {
  tests: NonNullable<ReturnType<typeof failedTestsRow>>;
  isDark: boolean;
}) {
  const { t } = useTranslation('review');
  const card = isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white border-black/5';
  const muted = isDark ? 'text-white/40' : 'text-black/40';
  const mono = isDark ? 'text-white/85' : 'text-black/85';
  const total = tests.passed + tests.failed;
  return (
    <section className={`rounded-xl border ${card} p-4`}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className={`text-[10px] font-bold uppercase tracking-[0.18em] ${muted}`}>
          Failed tests
        </div>
        <span
          className="inline-flex items-center px-2 h-5 rounded-full text-[10px] font-mono tabular-nums"
          style={{ background: '#4f9a5c22', color: '#4f9a5c' }}
        >
          {tests.passed}/{total} passing
        </span>
      </div>
      {tests.failingNames.length === 0 ? (
        <div className={`text-[12px] italic ${muted}`}>{t('empty.noFailingTests')}</div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {tests.failingNames.map((name) => (
            <li key={name} className="flex items-center justify-between gap-3">
              <span className={`font-mono text-[11px] truncate ${mono}`}>{name}</span>
              <button
                type="button"
                className={`shrink-0 inline-flex items-center gap-1 h-6 px-2 rounded-md border text-[10px] font-bold ${
                  isDark
                    ? 'bg-white/[0.04] hover:bg-white/[0.08] text-white/70 border-white/10'
                    : 'bg-black/[0.03] hover:bg-black/[0.06] text-black/70 border-black/10'
                }`}
                onClick={() => { /* no-op: test runner integration is out of scope */ }}
              >
                <Play className="w-3 h-3" />
                Open in test runner
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ─── Unresolved threads ──────────────────────────────────────────────────

function UnresolvedThreadsCard({
  threads, isDark,
}: {
  threads: ReturnType<typeof summariseConversation>;
  isDark: boolean;
}) {
  const { t } = useTranslation('review');
  const card = isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white border-black/5';
  const fg = isDark ? 'text-white/85' : 'text-black/85';
  const muted = isDark ? 'text-white/40' : 'text-black/40';
  const mono = isDark ? 'text-white/55' : 'text-black/55';
  return (
    <section className={`rounded-xl border ${card} p-4`}>
      <div className={`mb-2 text-[10px] font-bold uppercase tracking-[0.18em] ${muted}`}>
        Unresolved threads
      </div>
      {threads.length === 0 ? (
        <div className={`text-[12px] italic ${muted}`}>{t('empty.allResolved')}</div>
      ) : (
        <>
          <div className={`mb-2 text-[12px] ${fg}`}>
            {threads.length} unresolved thread{threads.length === 1 ? '' : 's'}:
          </div>
          <ul className="flex flex-col gap-1.5">
            {threads.map((th, i) => (
              <li
                key={th.threadId}
                onClick={() => { /* no-op: scroll to file integration is out of scope */ }}
                className={`grid grid-cols-[auto_auto_1fr_auto] items-center gap-2 py-1 px-1 rounded-md cursor-pointer ${
                  isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-black/[0.03]'
                }`}
              >
                <span className={`font-mono text-[10px] ${muted}`}>({i + 1})</span>
                <span title={displayName(th.ownerLogin)} className="inline-flex">
                  <Avatar login={th.ownerLogin} size={16} />
                </span>
                <span className={`min-w-0 truncate text-[12px] ${fg}`}>{th.oneLiner}</span>
                <span className={`shrink-0 font-mono text-[10px] ${mono}`}>
                  {th.filePath}:{th.line}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
