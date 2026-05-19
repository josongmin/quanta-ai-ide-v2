import { useMemo } from 'react';
import { GitMerge, GitPullRequest, AlertTriangle, ShieldCheck } from 'lucide-react';
import type { FileRecord } from '@entities/repo';
import { useTranslation } from '@shared/i18n';
import { semanticConflicts, type ConflictCandidate } from './symbolHistory';

// Semantic Conflict Detector — predicts merge collisions *before* they
// happen, using the call graph rather than git's textual line diff.
//
// Example: Alice's PR refactors `formatDate()` (signature change). Bob's
// PR doesn't touch `formatDate()` directly, but his change calls
// `formatDate()` from a new place. Git won't flag this — the files
// don't overlap on lines — but our index sees the call edge and knows
// the merge order matters.
//
// Severity is driven by how many files lie in the *intersection* of
// the two PRs' transitive closures. Production wires this into the
// host's open-PR list (GitHub API); the demo synthesises 0–3 candidate
// PRs per file from FileRecord.fanIn × churn.

const REASON_LABEL: Record<ConflictCandidate['reason'], string> = {
  'shared-callee':     'Both PRs call the same downstream',
  'shared-caller':     'Both PRs are reached from the same upstream',
  'signature-touch':   'Other PR changes a function this file calls',
  'dataflow-overlap':  'Same data flow path passes through both',
};

export function SemanticConflictCard({ file }: { file: FileRecord }) {
  const { t } = useTranslation('inspect');
  const conflicts = useMemo(() => semanticConflicts(file), [file]);

  if (conflicts.length === 0) {
    return (
      <div
        className="rounded-xl border px-3 py-2.5"
        style={{
          background: 'var(--bg-surface-muted)',
          borderColor: 'var(--border-default)',
        }}
      >
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3 h-3"
                       style={{ color: 'var(--intent-success-fg)' }} />
          <div
            className="text-[9px] font-black uppercase tracking-[var(--track-eyebrow)]"
            style={{ color: 'var(--fg-subtle)' }}
          >
            {t('semanticConflict.title', { defaultValue: 'Semantic conflict' })}
          </div>
          <span
            className="ml-auto text-[9px] font-black uppercase tracking-[var(--track-eyebrow)]"
            style={{ color: 'var(--intent-success-fg)' }}
          >
            {t('semanticConflict.clear', { defaultValue: 'Clear' })}
          </span>
        </div>
        <div
          className="mt-1.5 text-[10px] leading-relaxed"
          style={{ color: 'var(--fg-subtle)' }}
        >
          {t('semanticConflict.cleanHint', {
            defaultValue: 'No open PRs touch the same call-graph neighborhood. Safe to merge.',
          })}
        </div>
      </div>
    );
  }

  const highCount = conflicts.filter((c) => c.severity === 'high').length;
  const headerAccent =
    highCount > 0 ? 'var(--intent-danger-fg)'
                  : 'var(--intent-warn-fg)';

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        background: 'var(--bg-surface-muted)',
        borderColor: 'var(--border-default)',
      }}
    >
      <div
        className="flex items-center gap-1.5 px-3 py-2 border-b"
        style={{ borderColor: 'var(--border-muted)' }}
      >
        <GitMerge className="w-3 h-3" style={{ color: headerAccent }} />
        <div
          className="text-[9px] font-black uppercase tracking-[var(--track-eyebrow)]"
          style={{ color: 'var(--fg-subtle)' }}
        >
          {t('semanticConflict.title', { defaultValue: 'Semantic conflict' })}
        </div>
        <span
          className="ml-auto text-[9px] font-black uppercase tracking-[var(--track-eyebrow)]"
          style={{ color: headerAccent }}
        >
          {t('semanticConflict.summary', {
            n: conflicts.length,
            defaultValue: `${conflicts.length} candidate${conflicts.length === 1 ? '' : 's'}`,
          })}
        </span>
      </div>

      <div className="divide-y" style={{ borderColor: 'var(--border-muted)' }}>
        {conflicts.map((c) => (
          <ConflictRow key={c.prId} c={c} />
        ))}
      </div>

      <div
        className="px-3 py-2 border-t text-[9px] leading-relaxed"
        style={{
          borderColor: 'var(--border-muted)',
          color: 'var(--fg-subtle)',
          background: 'var(--bg-elevated)',
        }}
      >
        {t('semanticConflict.note', {
          defaultValue: 'Predicted from the call graph — git diff alone wouldn’t flag these.',
        })}
      </div>
    </div>
  );
}

function ConflictRow({ c }: { c: ConflictCandidate }) {
  const { t } = useTranslation('inspect');
  const sevColor =
    c.severity === 'high'   ? 'var(--intent-danger-fg)' :
    c.severity === 'medium' ? 'var(--intent-warn-fg)'   :
                              'var(--fg-subtle)';
  const sevLabel =
    c.severity === 'high'   ? t('semanticConflict.severity.high',   { defaultValue: 'High' })   :
    c.severity === 'medium' ? t('semanticConflict.severity.medium', { defaultValue: 'Medium' }) :
                              t('semanticConflict.severity.low',    { defaultValue: 'Low' });

  return (
    <div className="px-3 py-2 flex items-start gap-2">
      <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0"
                     style={{ color: sevColor }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <GitPullRequest className="w-2.5 h-2.5 shrink-0"
                          style={{ color: 'var(--fg-subtle)' }} />
          <span
            className="text-sm font-mono font-bold truncate"
            style={{ color: 'var(--fg-default)' }}
          >
            #{c.prId}
          </span>
          <span
            className="text-xs truncate"
            style={{ color: 'var(--fg-muted)' }}
          >
            {c.prTitle}
          </span>
        </div>
        <div
          className="mt-0.5 text-[9px] font-mono"
          style={{ color: 'var(--fg-subtle)' }}
        >
          {c.author} · {c.branch}
        </div>
        <div
          className="mt-0.5 text-xs"
          style={{ color: 'var(--fg-muted)' }}
        >
          {REASON_LABEL[c.reason]} ·
          {' '}
          <span style={{ color: sevColor }}>
            {c.overlapFiles} files
          </span>
        </div>
      </div>
      <span
        className="shrink-0 text-[9px] font-black uppercase tracking-[var(--track-eyebrow)]"
        style={{ color: sevColor }}
      >
        {sevLabel}
      </span>
    </div>
  );
}
