import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, ChevronRight, ShieldAlert } from 'lucide-react';
import {
  computePrRisk, engineFindings, engineSummary, summariseChecks,
  type EngineSeverity,
  type PullRequest,
} from '@entities/pr';
import type { RepoData } from '@entities/repo';

type StatusItem = { label: string; value: string; tone?: 'block' | 'warn' | 'ok' };

export function EngineFindingsPanel({
  pr,
  repo,
  onJumpToFinding,
  severityColors,
}: {
  pr: PullRequest;
  repo: RepoData;
  onJumpToFinding: () => void;
  severityColors: Record<EngineSeverity, string>;
}) {
  const findings = useMemo(() => engineFindings(pr, repo), [pr, repo]);
  const summary = useMemo(() => engineSummary(findings), [findings]);
  const [expanded, setExpanded] = useState(false);
  const lastPrRef = useRef(pr.number);

  useEffect(() => {
    if (lastPrRef.current !== pr.number) {
      setExpanded(false);
      lastPrRef.current = pr.number;
    }
  }, [pr.number]);

  const totalSevere = summary.blocker + summary.high;
  const accentTone = summary.blocker > 0 ? severityColors.blocker
    : summary.high > 0 ? severityColors.high
      : summary.medium > 0 ? severityColors.medium
        : 'var(--intent-success-fg)';

  return (
    <div className="shrink-0 border-b border-[var(--border-default)]">
      <button
        type="button"
        onClick={() => { setExpanded((v) => !v); }}
        className="w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-[var(--bg-surface-muted)] transition-colors"
      >
        <ShieldAlert
          className="w-3.5 h-3.5 shrink-0"
          style={{ color: accentTone }}
        />
        <span className="text-xs font-bold uppercase tracking-eyebrow text-[var(--fg-muted)] shrink-0">
          Engine
        </span>
        <span className="flex items-center gap-1.5 ml-auto text-xs font-mono">
          <SevCount n={summary.blocker} color={severityColors.blocker} />
          <SevCount n={summary.high} color={severityColors.high} />
          <SevCount n={summary.medium} color={severityColors.medium} />
          <SevCount n={summary.low} color={severityColors.low} />
        </span>
        <ChevronRight
          className={`w-3 h-3 shrink-0 text-[var(--fg-subtle)] transition-transform ${expanded ? 'rotate-90' : ''}`}
        />
      </button>
      {expanded && (
        <div className="max-h-[260px] overflow-auto px-2 pb-2 space-y-1">
          {findings.length === 0 ? (
            <div className="px-2 py-3 text-sm italic text-[var(--fg-subtle)]">
              No findings.
            </div>
          ) : (
            findings.slice(0, 20).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={onJumpToFinding}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-[var(--bg-hover)] transition-colors flex items-start gap-2"
              >
                <span
                  className="shrink-0 mt-0.5 inline-block w-1.5 h-1.5 rounded-full"
                  style={{ background: severityColors[f.severity] }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-[var(--fg-default)] leading-snug truncate">
                    {f.title}
                  </span>
                  <span className="block text-xs font-mono text-[var(--fg-subtle)] truncate">
                    {f.category}/{f.rule}
                  </span>
                </span>
              </button>
            ))
          )}
          {totalSevere > 0 && (
            <button
              type="button"
              onClick={onJumpToFinding}
              className="w-full mt-1 px-2 py-1.5 text-xs font-bold uppercase tracking-eyebrow rounded text-[var(--fg-muted)] hover:text-[var(--fg-default)] hover:bg-[var(--bg-hover)] transition-colors flex items-center justify-center gap-1"
            >
              View in spine
              <ArrowUpRight className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function SevCount({ n, color }: { n: number; color: string }) {
  if (n === 0) {
    return <span className="text-[var(--fg-subtle)]">·</span>;
  }
  return (
    <span
      className="font-bold tabular-nums"
      style={{ color }}
    >
      {n}
    </span>
  );
}

export function AmbientLayer() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none"
      style={{
        background: `
          radial-gradient(1200px 700px at -10% -10%, color-mix(in srgb, var(--intent-success-fg) 4%, transparent), transparent 60%),
          radial-gradient(1100px 600px at 110% 0%, color-mix(in srgb, var(--fg-link) 3%, transparent), transparent 60%)
        `,
      }}
    />
  );
}

export function StatusBar({
  prs,
  repo,
  viewerLogin,
  severityColors,
}: {
  prs: PullRequest[];
  repo: RepoData;
  viewerLogin: string;
  severityColors: Record<EngineSeverity, string>;
}) {
  const stats = useMemo(() => {
    const mineToReview = prs.filter((p) => p.reviewers.some(
      (r) => r.login === viewerLogin && r.state === 'pending',
    ));
    const myPrs = prs.filter((p) => p.author === viewerLogin);
    const myCritical = mineToReview.filter((p) => computePrRisk(p, repo).tier === 'critical').length;
    const conflicts = prs.filter((p) => p.hasConflicts).length;
    const failingCi = prs.filter((p) => summariseChecks(p.checks).required.failed > 0).length;
    return {
      mineToReview: mineToReview.length,
      myPrs: myPrs.length,
      myCritical,
      conflicts,
      failingCi,
    };
  }, [prs, repo, viewerLogin]);

  const items: StatusItem[] = [
    { label: 'to review', value: String(stats.mineToReview), tone: stats.mineToReview > 0 ? 'warn' : 'ok' },
    { label: 'critical', value: String(stats.myCritical), tone: stats.myCritical > 0 ? 'block' : 'ok' },
    { label: 'failing CI', value: String(stats.failingCi), tone: stats.failingCi > 0 ? 'block' : 'ok' },
    { label: 'conflicts', value: String(stats.conflicts), tone: stats.conflicts > 0 ? 'warn' : 'ok' },
    { label: 'my PRs', value: String(stats.myPrs) },
  ];

  const toneColor = (tone?: 'block' | 'warn' | 'ok'): string =>
    tone === 'block' ? severityColors.blocker
      : tone === 'warn' ? severityColors.medium
        : tone === 'ok' ? 'var(--intent-success-fg)'
          : 'var(--fg-default)';

  return (
    <div
      className="shrink-0 h-7 flex items-center gap-4 px-3 border-b border-[var(--border-default)]"
      style={{ backgroundColor: 'var(--bg-surface)' }}
    >
      <span className="text-xs font-semibold tracking-[0.08em] uppercase text-[var(--fg-muted)]">
        Review
      </span>
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-baseline gap-1.5">
          <span
            className="text-sm font-semibold tabular-nums"
            style={{ color: toneColor(it.tone) }}
          >
            {it.value}
          </span>
          <span className="text-xs text-[var(--fg-muted)] lowercase">
            {it.label}
          </span>
        </span>
      ))}
      <span className="ml-auto text-xs font-mono text-[var(--fg-subtle)]">@{viewerLogin}</span>
    </div>
  );
}
