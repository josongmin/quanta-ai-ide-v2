// ── BackgroundMonitor ─────────────────────────────────────────────────
// Popover content: list of PRs with running CI, the specific check
// names, and a progress bar (passed/total). 1.5s tick to nudge the
// progress so it feels live without re-fetching anything.

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { summariseChecks, type PullRequest } from '@entities/pr';

export function BackgroundMonitor({
  prs, onJumpToPr,
}: { prs: PullRequest[]; onJumpToPr: (n: number) => void }) {
  // Soft tick — used purely as a tie-breaker so the progress reads
  // as "moving" while a check is in `running` state.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => { setTick((n) => n + 1); }, 1500);
    return () => { window.clearInterval(id); };
  }, []);

  const items = useMemo(() => {
    const out: {
      pr: PullRequest;
      passed: number;
      pending: number;
      failed: number;
      total: number;
      runningNames: string[];
    }[] = [];
    for (const pr of prs) {
      if (pr.status === 'closed' || pr.status === 'merged') continue;
      const ci = summariseChecks(pr.checks);
      if (ci.required.pending === 0) continue;
      const total = ci.required.passed + ci.required.failed + ci.required.pending;
      const runningNames = pr.checks
        .filter((c) => c.required && (c.status === 'running' || c.status === 'pending'))
        .slice(0, 3)
        .map((c) => c.name);
      out.push({
        pr,
        passed: ci.required.passed,
        pending: ci.required.pending,
        failed: ci.required.failed,
        total,
        runningNames,
      });
    }
    return out;
  }, [prs]);

  if (items.length === 0) {
    return (
      <div className="px-3 py-4 text-[12px] text-white/45 italic">
        진행 중인 작업이 없습니다.
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.06]">
        <Loader2 className="w-3 h-3 text-[#9cc4ea] animate-spin" />
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">
          백그라운드 작업
        </span>
        <span className="ml-auto text-[10px] font-mono text-white/40 tabular-nums">
          {items.length}개 진행 중
        </span>
      </div>
      <div className="max-h-[320px] overflow-auto py-1">
        {items.map((it) => {
          const ratio = it.total === 0 ? 0 : it.passed / it.total;
          // Soft animation — small wave on top of the static ratio so
          // the bar reads as "live, not stuck".
          const wave = 0.02 * Math.sin(tick * 0.7);
          const visualRatio = Math.max(0.04, Math.min(1, ratio + wave));
          return (
            <button
              key={it.pr.number}
              type="button"
              onClick={() => { onJumpToPr(it.pr.number); }}
              className="w-full text-left px-3 py-2 hover:bg-white/[0.04] transition-colors"
            >
              <div className="flex items-baseline gap-2">
                <span className="text-[12px] font-medium text-white/85 truncate flex-1">
                  {it.pr.title}
                </span>
                <span className="text-[10px] font-mono text-white/35 shrink-0">
                  #{it.pr.number}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-[10px] font-mono text-white/45">
                <span className="tabular-nums">
                  <span className="text-emerald-400/80">{it.passed}</span>
                  <span className="text-white/25">/</span>
                  <span>{it.total}</span>
                </span>
                {it.failed > 0 && (
                  <span className="text-[#e88a85] tabular-nums">{it.failed} 실패</span>
                )}
                <span
                  className="flex-1 h-1.5 rounded-full overflow-hidden"
                  style={{ background: 'var(--bg-active)' }}
                >
                  <span
                    className="block h-full"
                    style={{
                      width: `${String(Math.round(visualRatio * 100))}%`,
                      background: it.failed > 0
                        ? 'linear-gradient(90deg, #c25a55, #d98a85)'
                        : 'linear-gradient(90deg, #5fa86c, #7aa7d4)',
                    }}
                  />
                </span>
              </div>
              {it.runningNames.length > 0 && (
                <div className="mt-1 text-[10px] font-mono text-white/40 truncate">
                  {it.runningNames.join(' · ')}
                  {it.pending > it.runningNames.length && ` +${String(it.pending - it.runningNames.length)}`}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
