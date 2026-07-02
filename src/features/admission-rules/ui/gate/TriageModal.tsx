import { useEffect, useRef, useState } from 'react';
import { Sparkles, Check, X, AlertTriangle } from 'lucide-react';
import { Portal, ModalBackdrop, useDialogA11y, IconButton } from '@shared/ui';
import type { FileRecord } from '@entities/repo';
import type { ConsensusFinding } from './consensus';
import { lowSignalCount } from './consensus';

// AI auto-triage modal (Gate §G2). When the consensus panel has 1-source
// overapprox/unknown findings, the user can ask an "LLM verifier" to run
// over them. The verifier is simulated client-side: deterministic per
// (ruleId, fileId) so the demo behaves the same on every run, but
// realistic in shape — the user sees:
//
//   • A row per low-signal finding being examined.
//   • A 200ms-staggered "evaluating…" → verdict transition (false-positive
//     dismissed / promoted to exact / kept as-is).
//   • A summary at the end: "AI dismissed 2 of 5 low-signal findings."
//
// This is the seam where you'd POST each finding (path, span, evidence,
// surrounding code) to a verifier service. The interface is small enough
// that swapping the simulator for a real call is one function change.

type VerdictKind = 'evaluating' | 'kept' | 'dismissed' | 'promoted';

type Verdict =
  | { kind: 'evaluating' }
  | { kind: 'kept' }
  | { kind: 'dismissed';   reason: string }
  | { kind: 'promoted';    reason: string };

// Single per-kind config (OCP): color, row icon, the description shown when a
// verdict carries no inline reason, and whether the kind contributes to the
// summary tally. Adding a verdict kind is one entry here, not edits across
// VerdictIcon / verdictColor / summarise / the row JSX.
const VERDICT_CONFIG: Record<VerdictKind, {
  color: string;
  icon: React.ReactNode;
  /** Fallback description when the verdict carries no `reason`. */
  fallbackText: string;
  /** Summary bucket this kind counts toward, if any. */
  countKey: 'dismissed' | 'promoted' | 'kept' | null;
}> = {
  evaluating: {
    color: 'var(--fg-subtle)',
    icon: (
      <span
        aria-hidden
        className="shrink-0 mt-1 inline-flex items-center justify-center w-4 h-4"
      >
        <span className="w-1 h-1 rounded-full" style={{ background: 'var(--fg-subtle)' }} />
        <span className="w-1 h-1 rounded-full mx-0.5" style={{ background: 'var(--fg-subtle)', opacity: 0.7 }} />
        <span className="w-1 h-1 rounded-full" style={{ background: 'var(--fg-subtle)', opacity: 0.4 }} />
      </span>
    ),
    fallbackText: 'Evaluating…',
    countKey: null,
  },
  dismissed: {
    color: 'var(--intent-success-fg)',
    icon: <Check className="shrink-0 mt-1 w-3.5 h-3.5" style={{ color: 'var(--intent-success-fg)' }} />,
    fallbackText: '',
    countKey: 'dismissed',
  },
  promoted: {
    color: 'var(--intent-warn-fg)',
    icon: <AlertTriangle className="shrink-0 mt-1 w-3.5 h-3.5" style={{ color: 'var(--intent-warn-fg)' }} />,
    fallbackText: '',
    countKey: 'promoted',
  },
  kept: {
    color: 'var(--fg-subtle)',
    icon: <X className="shrink-0 mt-1 w-3.5 h-3.5" style={{ color: 'var(--fg-subtle)' }} />,
    fallbackText: 'Verifier could not increase confidence — kept as-is.',
    countKey: 'kept',
  },
};

function verdictText(v: Verdict): string {
  if (v.kind === 'dismissed' || v.kind === 'promoted') return v.reason;
  return VERDICT_CONFIG[v.kind].fallbackText;
}

function djb2(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

// Deterministic verifier — picks a verdict from (ruleId, fileId).
function runVerifier(
  finding: ConsensusFinding,
  file: FileRecord | undefined,
): { kind: 'kept' } | { kind: 'dismissed'; reason: string } | { kind: 'promoted'; reason: string } {
  const seed = djb2(`${finding.fileId}:${finding.hits[0]?.evaluation.ruleId ?? ''}`);
  // 35% dismiss, 15% promote, 50% keep — biased so the user *feels*
  // the verifier doing useful work without being implausibly accurate.
  const roll = seed % 100;
  if (roll < 35) {
    const reasons = [
      'Sanitiser detected upstream — taint cannot reach the sink.',
      'String literal is constant; no user input flows here.',
      'Path is whitelisted by an enclosing decorator.',
      'Generic-bound prevents the unsafe cast at runtime.',
      'Public API barrel re-exports from a tested module.',
    ];
    return { kind: 'dismissed', reason: reasons[seed % reasons.length] ?? reasons[0] };
  }
  if (roll < 50 && file?.metrics.publicApi) {
    return {
      kind: 'promoted',
      reason: 'File is public API; even unknown-confidence findings warrant a closer look.',
    };
  }
  return { kind: 'kept' };
}

export function TriageModal({
  findings, fileById, onClose, onApply,
}: {
  findings: ConsensusFinding[];
  fileById: (id: number) => FileRecord | undefined;
  onClose: () => void;
  /** Called with the set of fileIds the verifier dismissed. The page can
      then fold those into the suppression ledger as auto-suppressions. */
  onApply: (dismissedFileIds: number[]) => void;
}) {
  const candidates = findings.filter((f) => !f.consensus && f.confidence !== 'exact');
  const [verdicts, setVerdicts] = useState<Map<number, Verdict>>(
    () => new Map(candidates.map((f) => [f.fileId, { kind: 'evaluating' as const }])),
  );
  const [done, setDone] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogA11y(dialogRef, true, onClose);

  useEffect(() => {
    let cancelled = false;
    const timeouts: number[] = [];
    candidates.forEach((f, i) => {
      const t = window.setTimeout(() => {
        if (cancelled) return;
        setVerdicts((prev) => {
          const next = new Map(prev);
          next.set(f.fileId, runVerifier(f, fileById(f.fileId)));
          return next;
        });
        if (i === candidates.length - 1) setDone(true);
      }, 220 * (i + 1));
      timeouts.push(t);
    });
    return () => {
      cancelled = true;
      for (const t of timeouts) window.clearTimeout(t);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = summarise(verdicts);

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <ModalBackdrop onClick={onClose} z="z-50" blur="sm" alpha={0.55} />
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          className="relative w-[640px] max-w-[94vw] max-h-[80vh] flex flex-col rounded-md overflow-hidden outline-none"
          style={{
            background: 'var(--bg-canvas)',
            border: '1px solid var(--border-default)',
            boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
          }}
        >
          <header
            className="flex items-center gap-2 px-4 h-11 shrink-0"
            style={{ borderBottom: '1px solid var(--border-default)' }}
          >
            <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--fg-strong)' }} />
            <h3
              className="flex-1 text-[12px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: 'var(--fg-strong)' }}
            >
              AI auto-triage · {String(candidates.length)} low-signal finding{candidates.length === 1 ? '' : 's'}
            </h3>
            <IconButton icon={X} label="Close" onClick={onClose} size="sm" />
          </header>

          <p className="px-4 pt-3 text-[11px]" style={{ color: 'var(--fg-muted)' }}>
            The verifier examines findings the analyzers were uncertain about
            and re-judges them with code context. Dismissals are recorded as
            time-bound suppressions so the original finding isn&apos;t silently
            lost.
          </p>

          <ul className="flex-1 min-h-0 overflow-auto px-2 py-2">
            {candidates.map((f) => {
              const file = fileById(f.fileId);
              const path = file
                ? (file.folderPath ? `${file.folderPath}/${file.name}` : file.name)
                : `#${String(f.fileId)}`;
              const v = verdicts.get(f.fileId) ?? { kind: 'evaluating' };
              const cfg = VERDICT_CONFIG[v.kind];
              return (
                <li
                  key={f.fileId}
                  className="px-3 py-2.5 rounded-md flex items-start gap-3 [&:not(:first-child)]:border-t"
                  style={{
                    borderColor: 'var(--border-default)',
                    background: v.kind === 'evaluating' ? 'var(--bg-surface-muted)' : 'transparent',
                  }}
                >
                  {cfg.icon}
                  <div className="flex-1 min-w-0">
                    <code
                      className="text-[11px] font-mono truncate"
                      style={{ color: 'var(--fg-strong)' }}
                    >
                      {path}
                    </code>
                    <div className="text-[10px] mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                      {verdictText(v)}
                    </div>
                  </div>
                  <span
                    className="text-[10px] uppercase tracking-[0.14em] font-mono shrink-0"
                    style={{ color: cfg.color }}
                  >
                    {v.kind}
                  </span>
                </li>
              );
            })}
            {candidates.length === 0 && (
              <li className="px-4 py-8 text-center text-[11px]" style={{ color: 'var(--fg-subtle)' }}>
                No low-signal findings to triage.
              </li>
            )}
          </ul>

          <footer
            className="flex items-center gap-2 px-4 py-3 shrink-0"
            style={{ borderTop: '1px solid var(--border-default)' }}
          >
            <span className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>
              {done
                ? `Verifier completed: ${String(summary.dismissed)} dismissed · ${String(summary.promoted)} promoted · ${String(summary.kept)} kept.`
                : 'Running verifier…'}
            </span>
            <div className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              className="h-7 px-3 rounded-md text-[11px]"
              style={{
                border: '1px solid var(--border-default)',
                color: 'var(--fg-muted)',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                const dismissed: number[] = [];
                for (const [fileId, v] of verdicts) {
                  if (v.kind === 'dismissed') dismissed.push(fileId);
                }
                onApply(dismissed);
              }}
              disabled={!done || summary.dismissed === 0}
              className="h-7 px-3 rounded-md text-[11px] font-medium"
              style={{
                background: 'var(--fg-strong)',
                color: 'var(--bg-canvas)',
                opacity: (done && summary.dismissed > 0) ? 1 : 0.4,
                cursor: (done && summary.dismissed > 0) ? 'pointer' : 'not-allowed',
              }}
            >
              Apply {summary.dismissed} dismissal{summary.dismissed === 1 ? '' : 's'}
            </button>
          </footer>
        </div>
      </div>
    </Portal>
  );
}

// Convenience export for callers that want to know if a triage CTA makes
// sense at all (used by ConsensusPanel to hide the button when 0).
export function triageCandidateCount(findings: ConsensusFinding[]): number {
  return lowSignalCount(findings);
}

function summarise(verdicts: Map<number, Verdict>): { dismissed: number; promoted: number; kept: number } {
  const counts = { dismissed: 0, promoted: 0, kept: 0 };
  for (const v of verdicts.values()) {
    const key = VERDICT_CONFIG[v.kind].countKey;
    if (key) counts[key] += 1;
  }
  return counts;
}
