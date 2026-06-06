import { useMemo, type CSSProperties } from 'react';
import { Database, GitBranch, FileCheck2, Coins, Bot, ListChecks } from 'lucide-react';
import { useFilterRepo } from '@entities/filter-state';
import { useFixPipelineStore } from '@features/fix-pipeline-state';
import { useActivityStore } from '@features/ai-activity';
import { useJobs } from '@features/investigation';

// Fixed-height bottom chrome. Surfaces the long-running, cross-stage signals
// the operator needs to keep in their head while flipping between stages:
// workspace freshness, the verified-fix pipeline narrative
// (seed → loop → proof → draft), live AI agents, accumulated cost, and
// drafts out. Everything else stays in its own stage.
export const STATUS_BAR_HEIGHT = 24;

type IndexCounts = {
  fresh: number;
  indexing: number;
  stale: number;
  timeout: number;
  total: number;
};

function useIndexCounts(): IndexCounts {
  const repo = useFilterRepo();
  return useMemo(() => {
    const counts: IndexCounts = { fresh: 0, indexing: 0, stale: 0, timeout: 0, total: 0 };
    for (const f of repo.files) {
      counts.total += 1;
      counts[f.metrics.indexState] += 1;
    }
    return counts;
  }, [repo]);
}

const cellStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '0 10px',
  height: '100%',
  color: 'var(--fg-muted)',
  fontSize: 10,
  fontFamily:
    'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  letterSpacing: '0.04em',
  // Cells must not overflow horizontally — a long workspace name or
  // many job kinds would otherwise push the right-hand cluster off the
  // visible status bar. `minWidth: 0` lets the flex child shrink below
  // its content width, and `whiteSpace: nowrap` keeps each cell on one
  // line so the truncate ellipsis lands cleanly.
  minWidth: 0,
  whiteSpace: 'nowrap',
};

const labelStyle: CSSProperties = {
  fontSize: 9,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.18em',
  color: 'var(--fg-subtle)',
};

const valueStyle: CSSProperties = {
  color: 'var(--fg-default)',
  // Per-value truncation guard so a long count or label inside a single
  // cell shrinks before the whole cell starts pushing siblings around.
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  minWidth: 0,
};

const dividerStyle: CSSProperties = {
  width: 1,
  height: 12,
  background: 'var(--border-default)',
  flexShrink: 0,
};

const barStyle: CSSProperties = {
  height: STATUS_BAR_HEIGHT,
  borderTop: '1px solid var(--border-muted)',
  background: 'var(--bg-overlay)',
  color: 'var(--fg-muted)',
};

const subtleStyle: CSSProperties = { color: 'var(--fg-subtle)' };

const subtleIconStyle: CSSProperties = { color: 'var(--fg-subtle)' };

const inlineRowStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 3,
};

const inlineGapStyle: CSSProperties = { display: 'inline-flex', gap: 3 };

function dotStyle(color: string, pulse = false): CSSProperties {
  return {
    width: 6,
    height: 6,
    borderRadius: 999,
    background: color,
    flexShrink: 0,
    boxShadow: pulse ? `0 0 0 0 ${color}` : undefined,
    animation: pulse ? 'statusbar-pulse 1.4s ease-out infinite' : undefined,
  };
}

function IndexCell({ counts }: { counts: IndexCounts }) {
  const isWorking = counts.indexing > 0;
  const isStale = counts.stale > 0 || counts.timeout > 0;
  const dotColor = isWorking
    ? 'var(--intent-info-vivid, #5b9dff)'
    : isStale
      ? 'var(--intent-warning-vivid)'
      : 'var(--intent-success-vivid)';
  const summary = isWorking
    ? `indexing ${counts.indexing}`
    : isStale
      ? `stale ${counts.stale + counts.timeout}`
      : `fresh ${counts.fresh}`;
  const tooltip = `Fresh ${counts.fresh} · Indexing ${counts.indexing} · Stale ${counts.stale} · Timeout ${counts.timeout}`;
  return (
    <span style={cellStyle} title={tooltip}>
      <span style={dotStyle(dotColor, isWorking)} aria-hidden="true" />
      <Database size={11} aria-hidden="true" style={subtleIconStyle} />
      <span style={labelStyle}>Index</span>
      <span style={valueStyle}>{summary}</span>
      <span style={subtleStyle}>· {counts.total} files</span>
    </span>
  );
}

// ─── Verified-fix pipeline narrative ─────────────────────────────────
// The four-stage spine of the product: seed → loop → proof → draft.
// We pick the active stage from the store's lifecycle (selection,
// generation, validation, submission) so the bar mirrors what the user
// is doing without coupling to the FixPipelineStage UI.
type PipelineStage = 'seed' | 'loop' | 'proof' | 'draft';

function usePipelineStage(): {
  stage: PipelineStage;
  iteration: number;
  maxIterations: number;
  terminated: boolean;
  reason: string | null;
  busy: boolean;
  seedId: string | null;
} {
  const selectedSeedId = useFixPipelineStore((s) => s.selectedSeedId);
  const generationStatus = useFixPipelineStore((s) => s.generationStatus);
  const validationStatus = useFixPipelineStore((s) => s.validationStatus);
  const loop = useFixPipelineStore((s) => s.loop);
  const submissions = useFixPipelineStore((s) => s.submissions);
  const selectedCandidateId = useFixPipelineStore((s) => s.selectedCandidateId);

  return useMemo(() => {
    // The submission stage wins as soon as a candidate is en-route or out;
    // otherwise validation > generation > seed picking.
    const sub = selectedCandidateId ? submissions[selectedCandidateId] : null;
    const inDraft =
      sub != null &&
      (sub.status === 'submitting' ||
        sub.status === 'auto-submitted' ||
        sub.status === 'manually-submitted' ||
        sub.status === 'submission-blocked');

    let stage: PipelineStage;
    if (inDraft) stage = 'draft';
    else if (validationStatus !== 'idle') stage = 'proof';
    else if (selectedSeedId && generationStatus !== 'idle') stage = 'loop';
    else stage = 'seed';

    const busy =
      generationStatus === 'generating' ||
      validationStatus === 'running' ||
      sub?.status === 'submitting';

    return {
      stage,
      iteration: loop.iteration,
      maxIterations: loop.maxIterations,
      terminated: loop.terminated,
      reason: loop.reason,
      busy,
      seedId: selectedSeedId,
    };
  }, [
    selectedSeedId,
    generationStatus,
    validationStatus,
    loop,
    submissions,
    selectedCandidateId,
  ]);
}

const STAGES: readonly PipelineStage[] = ['seed', 'loop', 'proof', 'draft'];

function PipelineCell() {
  const state = usePipelineStage();
  const activeIdx = STAGES.indexOf(state.stage);

  const dotColor = state.terminated
    ? state.reason === 'success'
      ? 'var(--intent-success-vivid)'
      : 'var(--intent-warning-vivid)'
    : state.busy
      ? 'var(--intent-info-vivid, #5b9dff)'
      : 'var(--fg-subtle)';

  const tail =
    state.stage === 'loop' && state.iteration > 0
      ? `· iter ${state.iteration}/${state.maxIterations}`
      : state.terminated && state.reason
        ? `· ${state.reason}`
        : state.seedId
          ? `· ${state.seedId}`
          : '· idle';

  const tooltip = state.terminated
    ? `Pipeline terminated: ${state.reason ?? 'unknown'}`
    : `Stage: ${state.stage}${
        state.iteration > 0 ? ` · iter ${state.iteration}/${state.maxIterations}` : ''
      }`;

  return (
    <span style={cellStyle} title={tooltip}>
      <span style={dotStyle(dotColor, state.busy)} aria-hidden="true" />
      <span style={labelStyle}>Pipeline</span>
      <span style={inlineRowStyle}>
        {STAGES.map((s, i) => {
          const isActive = i === activeIdx;
          const isPast = i < activeIdx;
          return (
            <span key={s} style={inlineRowStyle}>
              <span
                style={{
                  color: isActive
                    ? 'var(--fg-default)'
                    : isPast
                      ? 'var(--fg-muted)'
                      : 'var(--fg-subtle)',
                  fontWeight: isActive ? 700 : 400,
                }}
              >
                {s}
              </span>
              {i < STAGES.length - 1 ? (
                <span style={subtleStyle}>→</span>
              ) : null}
            </span>
          );
        })}
      </span>
      <span style={subtleStyle}>{tail}</span>
    </span>
  );
}

// ─── Live AI agents ───────────────────────────────────────────────────
// Mirrors the dot-field overlay: each chat session has a hue. We render
// one tiny dot per active session (capped) so the user can see at a glance
// how many agents are touching the workspace right now.
function AgentsCell() {
  const activities = useActivityStore((s) => s.activities);
  const live = activities.filter((a) => a.state !== 'done');
  const editing = live.filter((a) => a.state === 'editing').length;
  const thinking = live.filter((a) => a.state === 'thinking').length;

  const summary =
    live.length === 0
      ? 'idle'
      : editing > 0
        ? `${editing} editing${thinking ? ` · ${thinking} thinking` : ''}`
        : `${thinking} thinking`;

  const tooltip =
    live.length === 0
      ? 'No AI sessions active'
      : live.map((a) => `${a.agent}: ${a.task}`).join('\n');

  return (
    <span style={cellStyle} title={tooltip}>
      <Bot size={11} aria-hidden="true" style={subtleIconStyle} />
      <span style={labelStyle}>Agents</span>
      <span style={inlineGapStyle}>
        {live.slice(0, 4).map((a) => (
          <span
            key={a.chatId}
            style={dotStyle(a.hue, a.state === 'editing')}
            aria-hidden="true"
          />
        ))}
      </span>
      <span style={valueStyle}>{summary}</span>
    </span>
  );
}

// ─── Investigation jobs ───────────────────────────────────────────────
// Clickable cell — toggles the JobsTray popup (anchored just above the
// bar). Shows how many investigation jobs are still in flight so the
// operator knows there's work to look at without the tray floating.
function JobsCell() {
  const { jobs, open, setOpen } = useJobs();
  const active = jobs.filter(
    (j) => j.status !== 'completed' && j.status !== 'cancelled' && j.status !== 'failed',
  ).length;

  return (
    <button
      type="button"
      onClick={() => { setOpen(!open); }}
      title={`Investigation jobs — ${active} active${open ? ' (open)' : ''}`}
      aria-pressed={open}
      style={{
        ...cellStyle,
        background: open ? 'var(--bg-hover)' : 'none',
        border: 'none',
        cursor: 'pointer',
      }}
      className="hover:[background:var(--bg-hover)]"
    >
      <ListChecks size={11} aria-hidden="true" style={subtleIconStyle} />
      <span style={labelStyle}>Jobs</span>
      <span style={valueStyle}>{active > 0 ? active : 'idle'}</span>
    </button>
  );
}

// ─── Cost telemetry ───────────────────────────────────────────────────
// The unit-economics signal: cycles burned and cumulative USD across all
// candidates this session. Hidden when there's nothing to show.
function CostCell() {
  const cost = useFixPipelineStore((s) => s.cost);
  if (cost.cycles === 0) return null;
  const usd = cost.cumulative.usd;
  const usdText = usd >= 1 ? `$${usd.toFixed(2)}` : `${(usd * 100).toFixed(1)}¢`;
  const tooltip = `Cycles ${cost.cycles} · Tokens ${cost.cumulative.tokensIn}/${cost.cumulative.tokensOut} · CI ${cost.cumulative.ciSeconds}s · ${usdText}`;
  return (
    <span style={cellStyle} title={tooltip}>
      <Coins size={11} aria-hidden="true" style={subtleIconStyle} />
      <span style={labelStyle}>Cost</span>
      <span style={valueStyle}>
        {cost.cycles} {cost.cycles === 1 ? 'cycle' : 'cycles'}
      </span>
      <span style={subtleStyle}>· {usdText}</span>
    </span>
  );
}

// ─── Drafts out ───────────────────────────────────────────────────────
// Submission lifecycle counts. Auto + manual = shipped; blocked = needs
// the human checkpoint. Hidden when nothing's been submitted yet.
function DraftsCell() {
  const submissions = useFixPipelineStore((s) => s.submissions);
  const counts = useMemo(() => {
    let auto = 0;
    let manual = 0;
    let blocked = 0;
    let submitting = 0;
    for (const rec of Object.values(submissions)) {
      if (rec.status === 'auto-submitted') auto += 1;
      else if (rec.status === 'manually-submitted') manual += 1;
      else if (rec.status === 'submission-blocked') blocked += 1;
      else if (rec.status === 'submitting') submitting += 1;
    }
    return { auto, manual, blocked, submitting };
  }, [submissions]);

  const total = counts.auto + counts.manual + counts.blocked + counts.submitting;
  if (total === 0) return null;

  const dotColor =
    counts.submitting > 0
      ? 'var(--intent-info-vivid, #5b9dff)'
      : counts.blocked > 0
        ? 'var(--intent-warning-vivid)'
        : 'var(--intent-success-vivid)';

  const parts: string[] = [];
  if (counts.auto > 0) parts.push(`${counts.auto} auto`);
  if (counts.manual > 0) parts.push(`${counts.manual} manual`);
  if (counts.submitting > 0) parts.push(`${counts.submitting} sending`);
  if (counts.blocked > 0) parts.push(`${counts.blocked} blocked`);

  const tooltip = `Auto-submitted ${counts.auto} · Manual ${counts.manual} · Submitting ${counts.submitting} · Blocked ${counts.blocked}`;

  return (
    <span style={cellStyle} title={tooltip}>
      <span style={dotStyle(dotColor, counts.submitting > 0)} aria-hidden="true" />
      <FileCheck2 size={11} aria-hidden="true" style={subtleIconStyle} />
      <span style={labelStyle}>Drafts</span>
      <span style={valueStyle}>{parts.join(' · ')}</span>
    </span>
  );
}

// Cost + Drafts only carry meaning once a seed is in flight. Wrapping them
// lets us drop both — and their leading divider — cleanly when the
// pipeline hasn't started yet, so the right cluster doesn't show ghost
// dividers between Agents and Investigate.
function PipelineTelemetryGroup() {
  const cycles = useFixPipelineStore((s) => s.cost.cycles);
  const submissions = useFixPipelineStore((s) => s.submissions);
  const hasDrafts = useMemo(
    () =>
      Object.values(submissions).some(
        (r) => r.status !== 'unsubmitted',
      ),
    [submissions],
  );
  if (cycles === 0 && !hasDrafts) return null;
  return (
    <>
      <span style={dividerStyle} aria-hidden="true" />
      <CostCell />
      <DraftsCell />
    </>
  );
}

function WorkspaceCell() {
  const repo = useFilterRepo();
  const loc = repo.files.length;
  return (
    <span style={cellStyle} title="acme-monorepo · main">
      <GitBranch size={11} aria-hidden="true" style={subtleIconStyle} />
      <span style={valueStyle}>main</span>
      <span style={subtleStyle}>· {loc} files</span>
    </span>
  );
}

export default function StatusBar() {
  const indexCounts = useIndexCounts();

  return (
    <>
      <style>{`
        @keyframes statusbar-pulse {
          0%   { box-shadow: 0 0 0 0 currentColor; opacity: 1; }
          70%  { box-shadow: 0 0 0 4px transparent; opacity: 0.55; }
          100% { box-shadow: 0 0 0 0 transparent; opacity: 1; }
        }
        /* Dark-only blur: light theme uses near-opaque --bg-overlay, so the
           blur produces nothing visible but still burns GPU each frame. */
        html[data-theme="dark"] footer[aria-label="Workspace status"] {
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
        }
      `}</style>
      <footer
        className="shrink-0 flex items-stretch select-none overflow-hidden"
        style={barStyle}
        data-tauri-drag-region
        role="contentinfo"
        aria-label="Workspace status"
      >
        <div data-tauri-drag-region="false" className="flex items-stretch min-w-0">
          <WorkspaceCell />
          <span style={dividerStyle} aria-hidden="true" />
          <IndexCell counts={indexCounts} />
          <span style={dividerStyle} aria-hidden="true" />
          <PipelineCell />
        </div>

        <div data-tauri-drag-region className="flex-1" />

        <div data-tauri-drag-region="false" className="flex items-stretch min-w-0">
          <JobsCell />
          <span style={dividerStyle} aria-hidden="true" />
          <AgentsCell />
          <PipelineTelemetryGroup />
        </div>
      </footer>
    </>
  );
}
