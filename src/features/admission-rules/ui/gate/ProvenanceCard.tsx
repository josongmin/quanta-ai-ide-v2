import { GitCommit, Rocket, AlertOctagon, GitPullRequest, Timer } from 'lucide-react';
import type { TimelineEvent } from './timeline';
import { heldDurationMs } from './timeline';
import { formatDate } from '@shared/i18n';

// Provenance / timeline card. Shows the chain of events that led to the
// current verdict — *when* the PR was opened, which commits landed, when a
// gate rule was deployed (anti-pattern: "rule deployed after my PR
// opened"), and how the verdict flipped at each step.
//
// Renders to the right of the action plan list so the user can simul-read
// "what's wrong" and "why it became wrong" without scrolling.

const ICON: Record<TimelineEvent['kind'], React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  'pr-opened':     GitPullRequest,
  'commit':        GitCommit,
  'rule-deployed': Rocket,
  'rule-fired':    AlertOctagon,
  'override':      AlertOctagon,
};

export function ProvenanceCard({
  events, currentVerdict,
}: {
  events: TimelineEvent[];
  currentVerdict: 'allow' | 'warn' | 'block';
}) {
  const heldMs = heldDurationMs(events, currentVerdict);
  const heldLabel = heldMs > 0 ? formatHeld(heldMs) : null;

  // Outlined card — no background fill. Previously this card shared
  // `bg-surface` with its sibling SafetyNet and with the DecisionHeader,
  // collapsing all three into one indistinguishable grey block. Just the
  // border + a subtle header band gives clear card boundaries without
  // stacking three near-identical greys.
  return (
    <section
      className="rounded-md overflow-hidden"
      style={{ border: '1px solid var(--border-default)' }}
    >
      <header
        className="flex items-center gap-2 px-4 h-9"
        style={{
          background: 'var(--bg-surface-muted)',
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        <h3
          className="text-sm uppercase tracking-eyebrow font-semibold"
          style={{ color: 'var(--fg-strong)' }}
        >
          Provenance
        </h3>
        <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>
          how this verdict happened
        </span>
        <div className="flex-1" />
        {heldLabel && currentVerdict !== 'allow' && (
          <span
            className="inline-flex items-center gap-1 text-xs font-mono"
            style={{ color: 'var(--intent-warn-fg)' }}
            title="Time since the first non-passing event"
          >
            <Timer className="w-3 h-3" />
            held {heldLabel}
          </span>
        )}
      </header>

      <ol className="relative px-4 py-3 flex flex-col gap-0">
        {events.map((e, i) => {
          const Icon = ICON[e.kind];
          const isLast = i === events.length - 1;
          const verdictColor = e.verdict === 'block'
            ? 'var(--intent-danger-fg)'
            : e.verdict === 'warn'
              ? 'var(--intent-warn-fg)'
              : e.verdict === 'allow'
                ? 'var(--intent-success-fg)'
                : 'var(--fg-subtle)';
          return (
            <li key={i} className="relative flex gap-3 pb-3">
              {/* Spine — vertical line connecting events. */}
              {!isLast && (
                <span
                  aria-hidden
                  className="absolute left-[10px] top-5 bottom-0 w-px"
                  style={{ background: 'var(--border-default)' }}
                />
              )}
              <span
                aria-hidden
                className="relative z-10 mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full shrink-0"
                style={{
                  background: 'var(--bg-canvas)',
                  border: '1px solid var(--border-default)',
                  color: verdictColor,
                }}
              >
                <Icon className="w-2.5 h-2.5" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span
                    className="text-base font-medium"
                    style={{ color: isLast ? 'var(--fg-strong)' : 'var(--fg-muted)', fontWeight: isLast ? 600 : 500 }}
                  >
                    {e.title}
                  </span>
                  <span
                    className="text-xs font-mono"
                    style={{ color: 'var(--fg-subtle)' }}
                    title={formatDate(e.at, { dateStyle: 'medium', timeStyle: 'short' })}
                  >
                    {formatRel(e.at)}
                  </span>
                  {e.verdict && (
                    <span
                      className="text-2xs uppercase tracking-eyebrow font-mono"
                      style={{ color: verdictColor }}
                    >
                      {e.verdict}
                    </span>
                  )}
                </div>
                {e.detail && (
                  <div
                    className="mt-0.5 text-xs truncate"
                    style={{ color: 'var(--fg-subtle)' }}
                  >
                    {e.detail}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function formatRel(at: number): string {
  const diff = Date.now() - at;
  const min = Math.round(diff / 60_000);
  if (min < 1) return 'now';
  if (min < 60) return `${String(min)}m ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${String(h)}h ago`;
  const d = Math.round(h / 24);
  return `${String(d)}d ago`;
}

function formatHeld(ms: number): string {
  const min = Math.round(ms / 60_000);
  if (min < 60) return `${String(min)}m`;
  const h = Math.round(min / 60);
  return `${String(h)}h`;
}
