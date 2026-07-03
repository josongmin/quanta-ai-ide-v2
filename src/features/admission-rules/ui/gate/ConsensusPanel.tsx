import { Layers, Sparkles } from 'lucide-react';
import type { FileRecord } from '@entities/repo';
import { SOURCE_GLYPH, SOURCE_LABEL } from '../sourceStyle';
import type { ConsensusFinding } from './consensus';
import { lowSignalCount } from './consensus';
import { scoreFindings, bandColor, aggregateRisk } from './risk';

// Consensus / dedupe panel (Gate §D). Replaces the implicit "every rule
// gets its own row" model with finding-shaped clusters. The contract:
//
//   • 2+ distinct analyzers agreeing on a file ⇒ "consensus" badge,
//     confidence ↑, surfaces at the top of the list.
//   • 1-source overapprox/unknown findings ⇒ candidates for the AI
//     auto-triage CTA (pluggable to a verifier service later).
//
// This sits at the *top* of the Action plan column so authors form a
// finding-first mental model — "I have 3 problems" — instead of being
// drowned by rule rows.

const SEVERITY_FG: Record<'block' | 'warn' | 'info', string> = {
  block: 'var(--intent-danger-fg)',
  warn:  'var(--intent-warn-fg)',
  info:  'var(--fg-subtle)',
};

const CONFIDENCE_LABEL: Record<'exact' | 'overapprox' | 'unknown', { label: string; fg: string }> = {
  exact:      { label: 'exact',      fg: 'var(--fg-strong)' },
  overapprox: { label: 'overapprox', fg: 'var(--intent-warn-fg)' },
  unknown:    { label: 'unknown',    fg: 'var(--intent-warn-fg)' },
};

export function ConsensusPanel({
  findings, fileById, onTriageRequest,
}: {
  findings: ConsensusFinding[];
  fileById: (id: number) => FileRecord | undefined;
  onTriageRequest?: () => void;
}) {
  if (findings.length === 0) return null;
  const lowSignal = lowSignalCount(findings);
  const scored = scoreFindings(findings, fileById);
  const total = aggregateRisk(scored);

  return (
    <section
      className="rounded-md overflow-hidden"
      style={{
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-default)',
      }}
    >
      <header
        className="flex items-center gap-2 px-4 h-9"
        style={{
          background: 'var(--bg-surface-muted)',
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        <Layers className="w-3 h-3" style={{ color: 'var(--fg-subtle)' }} />
        <h3
          className="text-sm uppercase tracking-eyebrow font-semibold"
          style={{ color: 'var(--fg-strong)' }}
        >
          Findings
        </h3>
        <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>
          deduped across analyzers
        </span>
        <div className="flex-1" />
        <span
          className="text-xs font-mono tabular-nums"
          style={{ color: 'var(--fg-subtle)' }}
        >
          {findings.length} finding{findings.length === 1 ? '' : 's'}
        </span>
        <span
          className="ml-2 text-xs font-mono tabular-nums"
          style={{ color: 'var(--fg-subtle)' }}
          title="Aggregate risk score (severity × confidence × blast, quadratic-mean)"
        >
          risk{' '}
          <strong style={{ color: 'var(--fg-strong)' }}>{total}</strong>
          /100
        </span>
        {lowSignal > 0 && onTriageRequest && (
          <button
            type="button"
            onClick={onTriageRequest}
            className="ml-2 inline-flex items-center gap-1 h-6 px-2 rounded text-xs font-medium transition-colors"
            style={{
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border-default)',
              color: 'var(--fg-strong)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-canvas)'; }}
            title={`Run AI verifier on ${String(lowSignal)} low-signal finding${lowSignal === 1 ? '' : 's'}`}
          >
            <Sparkles className="w-3 h-3" />
            Triage {lowSignal} low-signal
          </button>
        )}
      </header>

      <ul style={{ borderColor: 'var(--border-default)' }}>
        {scored.map(({ finding: f, risk }) => {
          const file = fileById(f.fileId);
          const path = file
            ? (file.folderPath ? `${file.folderPath}/${file.name}` : file.name)
            : `#${String(f.fileId)}`;
          const conf = CONFIDENCE_LABEL[f.confidence];
          return (
            <li
              key={f.fileId}
              className="px-4 py-2.5 flex items-start gap-3 [&:not(:first-child)]:border-t"
              style={{ borderColor: 'var(--border-default)' }}
            >
              <span
                className="shrink-0 mt-1 inline-flex items-center justify-center min-w-[28px] h-[20px] px-1 rounded-md text-xs font-mono tabular-nums font-bold"
                style={{
                  background: 'var(--bg-surface-muted)',
                  color: bandColor(risk.band),
                  border: '1px solid var(--border-default)',
                }}
                title={`Risk score: ${String(risk.score)}/100 (${risk.band})`}
              >
                {risk.score}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <code
                    className="text-sm font-mono truncate"
                    style={{ color: 'var(--fg-strong)' }}
                  >
                    {path}
                  </code>
                  <span
                    className="text-xs uppercase tracking-eyebrow font-mono"
                    style={{ color: SEVERITY_FG[f.severity] }}
                  >
                    {f.severity}
                  </span>
                  {f.consensus && (
                    <span
                      className="text-2xs uppercase tracking-eyebrow font-mono px-1.5 py-px rounded"
                      style={{
                        color: 'var(--fg-strong)',
                        background: 'var(--bg-active)',
                      }}
                      title={`${String(f.sources.length)} sources agree — high signal`}
                    >
                      consensus
                    </span>
                  )}
                  <span
                    className="text-2xs uppercase tracking-eyebrow font-mono"
                    style={{ color: conf.fg }}
                    title={`Composite confidence across ${String(f.sources.length)} source${f.sources.length === 1 ? '' : 's'}`}
                  >
                    {conf.label}
                  </span>
                </div>
                <div
                  className="mt-1 flex items-center gap-2 flex-wrap text-xs font-mono"
                  style={{ color: 'var(--fg-subtle)' }}
                >
                  {f.sources.map((s) => (
                    <span key={s} className="inline-flex items-center gap-1">
                      <span style={{ color: 'var(--fg-muted)' }}>{SOURCE_GLYPH[s]}</span>
                      {SOURCE_LABEL[s]}
                    </span>
                  ))}
                  <span className="opacity-50">·</span>
                  <span>{f.hits.length} hit{f.hits.length === 1 ? '' : 's'}</span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
