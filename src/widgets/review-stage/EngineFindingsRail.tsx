import { useMemo } from 'react';
import { Wand2, ArrowUpRight, ShieldAlert } from 'lucide-react';
import type {
  EngineFinding, EngineSeverity, EngineSummary, PullRequest,
} from '@entities/pr';
import { engineFindings, engineSummary } from '@entities/pr';
import type { RepoData } from '@entities/repo';
import { trimMid } from './lib/format';

// Right-side rail. Surfaces the static-engine's auto-review for the active
// PR — severity rollup at the top, scrollable list of findings underneath.
// The rail is the centerpiece "AI engine" surface in the review stage; it
// shares the visual vocabulary of CodingStage's RiskLens / DotField rails
// but is scoped to PR-level findings produced by `engineFindings()`.
//
// Mounted alongside `<PrContextRail/>` and the diff body. Width is fixed
// 360px so the diff has a stable wrap point regardless of finding count.

type Props = {
  pr: PullRequest;
  repo: RepoData;
  isDark: boolean;
};

const SEVERITY_COLOR: Record<EngineSeverity, string> = {
  blocker: '#c25a55',
  high:    '#d98a85',
  medium:  '#a8893a',
  low:     '#5a8fce',
};

const SEVERITY_LABEL: Record<EngineSeverity, string> = {
  blocker: 'Blocker',
  high:    'High',
  medium:  'Medium',
  low:     'Low',
};

const SEVERITY_ORDER: EngineSeverity[] = ['blocker', 'high', 'medium', 'low'];

export default function EngineFindingsRail({ pr, repo, isDark }: Props) {
  const findings = useMemo(() => engineFindings(pr, repo), [pr, repo]);
  const summary  = useMemo(() => engineSummary(findings),    [findings]);

  const border     = 'border-[color:var(--border-muted)]';
  const textMuted  = 'text-[color:var(--fg-muted)]';
  const textFaint  = isDark ? 'text-white/30'  : 'text-black/40';
  const headerName = 'text-[color:var(--fg-strong)]';

  const fixCount = summary.autoFix;

  return (
    <aside
      className="shrink-0 w-[360px] flex flex-col"
      style={{
        backgroundColor: isDark ? 'rgba(8, 12, 20, 0.55)' : 'rgba(255, 255, 255, 0.55)',
        backdropFilter: 'blur(22px) saturate(160%)',
        WebkitBackdropFilter: 'blur(22px) saturate(160%)',
      }}
    >
      <div className={`shrink-0 flex flex-col gap-3 px-4 py-3 border-b ${border}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <ShieldAlert className={`w-3.5 h-3.5 shrink-0 ${textMuted}`} />
            <span className={`text-[11px] font-bold uppercase tracking-[0.18em] ${textMuted}`}>
              p0 engine auto-review
            </span>
          </div>
          <BatchFixButton count={fixCount} isDark={isDark} />
        </div>
        <SeverityChips summary={summary} isDark={isDark} />
        <div className={`flex items-center justify-between text-[11px] font-mono ${textFaint}`}>
          <span>{findings.length} finding{findings.length === 1 ? '' : 's'}</span>
          <span className={headerName}>#{pr.number}</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-3 space-y-2">
        {findings.length === 0 ? (
          <EmptyState isDark={isDark} />
        ) : (
          findings.map((f) => (
            <FindingCard key={f.id} finding={f} isDark={isDark} />
          ))
        )}
      </div>

      <div className={`shrink-0 px-4 py-2 border-t ${border} text-[10px] font-mono ${textFaint}`}>
        engine: static · deterministic · cached
      </div>
    </aside>
  );
}

// ─── Header bits ─────────────────────────────────────────────────────────

function BatchFixButton({ count, isDark }: { count: number; isDark: boolean }) {
  const enabled = count > 0;
  const onClick = () => {
    // TODO: dispatch batch auto-fix run for this PR's auto-fixable findings.
  };
  return (
    <button
      type="button"
      disabled={!enabled}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-bold transition-colors ${
        enabled
          ? (isDark
              ? 'bg-[#5a8fce] text-black hover:bg-[#4a98ff]'
              : 'bg-[#1f5b9c] text-white hover:bg-[#0a78e8]')
          : (isDark
              ? 'bg-white/[0.06] text-white/30 cursor-not-allowed'
              : 'bg-black/[0.05] text-black/30 cursor-not-allowed')
      }`}
      title={enabled ? `Apply ${String(count)} auto-fix${count === 1 ? '' : 'es'} in one batch` : 'No auto-fixable findings'}
    >
      <Wand2 className="w-3 h-3" />
      Fix {count} in batch
    </button>
  );
}

function SeverityChips({ summary, isDark }: { summary: EngineSummary; isDark: boolean }) {
  // Theme-agnostic via CSS var; keep `isDark` lookup so the prop is read.
  const sep = isDark ? 'text-[color:var(--fg-subtle)]' : 'text-[color:var(--fg-subtle)]';
  return (
    <div className="flex items-center flex-wrap gap-x-1 gap-y-1 text-[11px]">
      {SEVERITY_ORDER.map((sev, i) => (
        <span key={sev} className="inline-flex items-center gap-1">
          {i > 0 && <span className={`mx-0.5 ${sep}`}>·</span>}
          <SeverityDot severity={sev} />
          <span className="text-[color:var(--fg-default)]">
            {SEVERITY_LABEL[sev]} {summary[sev]}
          </span>
        </span>
      ))}
    </div>
  );
}

function SeverityDot({ severity }: { severity: EngineSeverity }) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full shrink-0"
      style={{ background: SEVERITY_COLOR[severity] }}
    />
  );
}

// ─── Finding card ────────────────────────────────────────────────────────

function FindingCard({ finding, isDark }: { finding: EngineFinding; isDark: boolean }) {
  const cardBg     = isDark ? 'bg-white/[0.025]'   : 'bg-black/[0.02]';
  const cardBorder = 'border-[color:var(--border-muted)]';
  const titleColor = 'text-[color:var(--fg-strong)]';
  const bodyColor  = 'text-[color:var(--fg-muted)]';
  const monoFaint  = 'text-[color:var(--fg-subtle)]';
  const linkColor  = isDark ? 'text-[#7aa7ff]'     : 'text-[#1f5b9c]';

  const onJump = () => {
    // TODO: scroll the diff body to `finding.filePath` (and `finding.line`).
  };

  const onAutoFix = () => {
    // TODO: kick off the engine's one-click auto-fix for `finding.id`.
  };

  const lineSuffix = finding.line !== null ? `:${String(finding.line)}` : '';

  return (
    <div className={`rounded-lg border px-3 py-2.5 ${cardBg} ${cardBorder}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <SeverityPill severity={finding.severity} />
        <span className={`text-[10px] font-mono truncate ${monoFaint}`}>
          {finding.category}/{finding.rule}
        </span>
        <span className={`ml-auto text-[10px] font-mono truncate text-right ${monoFaint}`} title={`${finding.filePath}${lineSuffix}`}>
          {trimMid(finding.filePath, 28)}{lineSuffix}
        </span>
      </div>

      <div className={`text-[13px] font-bold leading-snug ${titleColor}`}>
        {finding.title}
      </div>
      <div className={`mt-1 text-[11px] leading-snug ${bodyColor}`}>
        {finding.body}
      </div>

      {finding.autoFixable && finding.fixRationale !== null && (
        <div className={`mt-1.5 text-[11px] italic ${monoFaint}`}>
          why safe — {finding.fixRationale}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between gap-2">
        {finding.autoFixable ? (
          <button
            type="button"
            onClick={onAutoFix}
            className={`inline-flex items-center gap-1 h-6 px-2 rounded-md text-[11px] font-bold transition-colors ${
              isDark
                ? 'bg-[#5a8fce]/15 text-[#7aa7ff] hover:bg-[#5a8fce]/25'
                : 'bg-[#1f5b9c]/10 text-[#1f5b9c] hover:bg-[#1f5b9c]/20'
            }`}
          >
            <Wand2 className="w-2.5 h-2.5" />
            Auto-fix
          </button>
        ) : (
          <span className={`text-[11px] ${monoFaint}`}>
            Needs manual review
          </span>
        )}

        <button
          type="button"
          onClick={onJump}
          className={`inline-flex items-center gap-0.5 text-[11px] font-medium hover:underline ${linkColor}`}
        >
          Jump to file
          <ArrowUpRight className="w-2.5 h-2.5" />
        </button>
      </div>
    </div>
  );
}

function SeverityPill({ severity }: { severity: EngineSeverity }) {
  const color = SEVERITY_COLOR[severity];
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-[0.18em]"
      style={{ background: `${color}26`, color }}
    >
      {SEVERITY_LABEL[severity]}
    </span>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────

function EmptyState({ isDark }: { isDark: boolean }) {
  // Theme-agnostic via CSS vars; keep `isDark` lookup so the prop is read.
  const muted = isDark ? 'text-[color:var(--fg-subtle)]' : 'text-[color:var(--fg-subtle)]';
  const faint = 'text-[color:var(--fg-subtle)]';
  return (
    <div className="flex flex-col items-center justify-center text-center px-4 py-10 rounded-lg border border-dashed border-[color:var(--border-default)]">
      <ShieldAlert className={`w-5 h-5 mb-2 ${faint}`} />
      <div className={`text-[12px] font-bold ${muted}`}>
        Engine has no findings on this PR.
      </div>
      <div className={`mt-1 text-[11px] italic ${faint}`}>
        All checked rules cleared their thresholds.
      </div>
    </div>
  );
}

// ─── Helpers — see ./lib/format.ts ───────────────────────────────────────
