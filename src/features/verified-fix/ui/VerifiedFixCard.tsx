// ─────────────────────────────────────────────────────────────────────────
// VerifiedFixCard — primary surface for the AI Verified Fix Pipeline.
//
// Reads as one card with five stacked panes:
//   1. Root cause + seed evidence
//   2. Candidates (max 3, primary pre-selected)
//   3. Proof obligations + counter-evidence (rendered side-by-side
//      with equal weight — this is the differentiator)
//   4. Validation timeline (attempt 1 → optional critique → attempt 2)
//   5. Delivery gate + draft PR package
//
// We deliberately do *not* show the diff at the top. The plan doc is
// explicit: root cause → proof → blast first, diff last. Diff lives in
// the candidate panel, opt-in.
// ─────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import {
  ShieldCheck, AlertTriangle, AlertOctagon, FileCode, GitPullRequestArrow,
  Wand2, RotateCcw, Check, Hourglass, X as XIcon, ArrowRight, BadgeAlert,
} from 'lucide-react';
import { useVerifiedFixStore } from '../model/store';
import type {
  CandidateFix, CounterEvidence, FixCase, ProofObligation, Seed,
  ValidationRun,
} from '../model/types';

type Props = { caseId: string };

// ─── token helpers ─────────────────────────────────────────────────────
// This card is routed entirely through the global semantic CSS vars so it
// themes correctly in both light and dark (it intentionally does NOT use
// the local vfxTokens SSOT — it has no useTheme/useVfx). Forked hex hues
// map to intent / accent tokens; alpha tints use color-mix so a CSS var
// can still be lightened to a fill / border.
const ACCENT = 'var(--fg-accent)';            // purple #c2b3e0 / 149,131,184
const SUCCESS = 'var(--intent-success-fg)';   // green #5fa86c / #9fd0a8
const DANGER = 'var(--intent-danger-fg)';     // red #c25a55
const WARN = 'var(--intent-warn-fg)';         // amber #a8893a
const INFO = 'var(--intent-info-fg)';         // blue #7aa7d4
const NEUTRAL = 'var(--fg-muted)';            // grey #8b949e
const mix = (c: string, pct: number) =>
  `color-mix(in srgb, ${c} ${String(pct)}%, transparent)`;

export function VerifiedFixCard({ caseId }: Props) {
  const fixCase = useVerifiedFixStore((s) => s.cases[caseId]);
  const seed = useVerifiedFixStore((s) =>
    fixCase ? s.seeds[fixCase.seedId] : undefined,
  );
  const selectCandidate = useVerifiedFixStore((s) => s.selectCandidate);
  const startValidation = useVerifiedFixStore((s) => s.startValidation);

  if (!fixCase || !seed) return null;
  const candidate = fixCase.candidates.find((c) => c.id === fixCase.selectedCandidateId)
    ?? fixCase.candidates[0];
  if (!candidate) return null;

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{
        borderColor: mix(ACCENT, 30),
        background: `linear-gradient(180deg, ${mix(ACCENT, 7)} 0%, ${mix(ACCENT, 3)} 100%)`,
      }}
    >
      <Header fixCase={fixCase} />
      <RootCausePane seed={seed} fixCase={fixCase} />
      <CandidatesPane fixCase={fixCase} onSelect={(id) => { selectCandidate(caseId, id); }} />
      <ProofPane candidate={candidate} validations={fixCase.validations} />
      <LoopTimelinePane fixCase={fixCase} />
      <DeliveryPane
        fixCase={fixCase}
        candidate={candidate}
        onValidate={() => { startValidation(caseId); }}
      />
    </div>
  );
}

// ─── header ────────────────────────────────────────────────────────────

function Header({ fixCase }: { fixCase: FixCase }) {
  const stage = fixCase.loop.currentStage;
  const stageLabel: Record<string, string> = {
    investigate: 'Investigating',
    patch: 'Drafting candidates',
    validate: 'Validating',
    critique: 'Self-critique',
    package: 'Packaging',
    done: 'Ready',
    aborted: 'Human checkpoint',
  };
  const stageColor =
    stage === 'done' ? SUCCESS
      : stage === 'aborted' ? DANGER
      : stage === 'validate' || stage === 'critique' ? ACCENT
      : NEUTRAL;
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--border-default)]">
      <Wand2 className="w-3.5 h-3.5" style={{ color: ACCENT }} />
      <span className="text-[10px] font-black uppercase tracking-[var(--track-eyebrow)] text-[var(--fg-default)]">
        Verified Fix Pipeline
      </span>
      <span
        className="ml-auto inline-flex items-center gap-1.5 px-2 h-5 rounded text-[9px] font-mono uppercase tracking-[var(--track-eyebrow)]"
        style={{ background: mix(stageColor, 11), color: stageColor, border: `1px solid ${mix(stageColor, 33)}` }}
      >
        {stage === 'validate' || stage === 'critique'
          ? <Hourglass className="w-2.5 h-2.5 animate-pulse" />
          : null}
        {stageLabel[stage] ?? stage}
      </span>
    </div>
  );
}

// ─── 1. root cause ─────────────────────────────────────────────────────

function RootCausePane({ seed, fixCase }: { seed: Seed; fixCase: FixCase }) {
  const sevColor = seed.severity === 'crit' ? DANGER
    : seed.severity === 'high' ? WARN
    : seed.severity === 'med'  ? INFO : NEUTRAL;
  return (
    <div className="px-4 py-3 border-b border-[var(--border-muted)]">
      <div className="flex items-start gap-3">
        <div
          className="shrink-0 w-8 h-8 rounded-md flex items-center justify-center mt-0.5"
          style={{ background: mix(sevColor, 12), border: `1px solid ${mix(sevColor, 33)}` }}
        >
          <BadgeAlert className="w-3.5 h-3.5" style={{ color: sevColor }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className="text-[9px] font-mono uppercase tracking-[var(--track-eyebrow)]"
              style={{ color: sevColor }}
            >
              {seed.severity}
            </span>
            <span className="text-[9px] font-mono uppercase tracking-[var(--track-eyebrow)] text-[var(--fg-subtle)]">
              · {seed.kind}
            </span>
          </div>
          <div className="text-[12px] font-semibold text-[var(--fg-default)] leading-snug truncate">
            {seed.title}
          </div>
          <div className="text-[11px] text-[var(--fg-muted)] leading-relaxed mt-1">
            <span className="text-[var(--fg-subtle)] mr-1">root cause —</span>{fixCase.rootCause}
          </div>
          {seed.evidenceRefs.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {seed.evidenceRefs.map((e, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-1.5 h-4 rounded-sm text-[9px] font-mono text-[var(--fg-muted)]"
                  style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-default)' }}
                  title={e.path}
                >
                  <FileCode className="w-2.5 h-2.5" />
                  {e.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 2. candidates ─────────────────────────────────────────────────────

function CandidatesPane({
  fixCase, onSelect,
}: { fixCase: FixCase; onSelect: (id: string) => void }) {
  return (
    <div className="px-4 py-3 border-b border-[var(--border-muted)]">
      <PaneHeader label={`Candidates · ${String(fixCase.candidates.length)}`} />
      <div className="space-y-1.5">
        {fixCase.candidates.slice(0, 3).map((c) => (
          <CandidateRow
            key={c.id}
            cand={c}
            selected={c.id === fixCase.selectedCandidateId}
            onClick={() => { onSelect(c.id); }}
          />
        ))}
      </div>
    </div>
  );
}

function CandidateRow({
  cand, selected, onClick,
}: { cand: CandidateFix; selected: boolean; onClick: () => void }) {
  const tierColor = cand.tier === 'safe-mechanical' ? SUCCESS
    : cand.tier === 'guarded' ? WARN : DANGER;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="w-full text-left rounded-md px-3 py-2 transition-colors"
      style={{
        background: selected ? mix(ACCENT, 10) : 'var(--bg-surface-muted)',
        border: selected ? `1px solid ${mix(ACCENT, 33)}` : '1px solid var(--border-muted)',
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: tierColor, boxShadow: selected ? `0 0 6px ${tierColor}` : 'none' }}
        />
        <span className="text-[11px] font-bold text-[var(--fg-default)] truncate">{cand.title}</span>
        <span
          className="ml-auto shrink-0 text-[9px] font-mono uppercase tracking-[var(--track-eyebrow)]"
          style={{ color: tierColor }}
        >
          {cand.tier}
        </span>
      </div>
      <div className="text-[10px] text-[var(--fg-muted)] leading-relaxed mt-1 line-clamp-2">
        {cand.rationale}
      </div>
      <div className="flex items-center gap-3 text-[9px] font-mono text-[var(--fg-subtle)] mt-1.5">
        <span>{cand.diffSummary}</span>
        <span>·</span>
        <span>{cand.changedLines}L · {String(cand.changedFiles)}f</span>
        <span>·</span>
        <span>blast {String(cand.blastModules)} mod</span>
        <span className="ml-auto" style={{ color: tierColor }}>
          conf {(cand.confidence * 100).toFixed(0)}%
        </span>
      </div>
    </button>
  );
}

// ─── 3. proof + counter-evidence (side-by-side, equal weight) ──────────

function ProofPane({
  candidate, validations,
}: { candidate: CandidateFix; validations: ValidationRun[] }) {
  // Use the most recent validation's obligations if present, else the
  // candidate's own (pending) ones. This way the panel lights up live as
  // attempts complete.
  const obligations = validations.length > 0
    ? validations[validations.length - 1].obligations
    : candidate.obligations;
  return (
    <div className="px-4 py-3 border-b border-[var(--border-muted)]">
      <PaneHeader label="Coverage of risk" />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <SubHeader label="Proof obligations" tone="ok" />
          <div className="space-y-1">
            {obligations.map((o) => <ObligationRow key={o.id} o={o} />)}
          </div>
        </div>
        <div>
          <SubHeader label="Counter-evidence" tone="warn" />
          <div className="space-y-1">
            {candidate.counterEvidence.map((c) => <CounterRow key={c.id} c={c} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

function ObligationRow({ o }: { o: ProofObligation }) {
  const { color, Icon, label } = obligationVisual(o.status);
  return (
    <div
      className="flex items-start gap-2 px-2 py-1.5 rounded-md"
      style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-muted)' }}
    >
      <Icon className="w-3 h-3 shrink-0 mt-0.5" style={{ color }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold text-[var(--fg-default)] truncate">{o.label}</span>
          <span
            className="text-[8px] font-mono uppercase tracking-[var(--track-eyebrow)] shrink-0"
            style={{ color }}
          >
            {label}
          </span>
        </div>
        <div className="text-[9px] text-[var(--fg-subtle)] mt-0.5 leading-snug">{o.detail}</div>
      </div>
    </div>
  );
}

function CounterRow({ c }: { c: CounterEvidence }) {
  const color = c.severity === 'block' ? DANGER : c.severity === 'concern' ? WARN : NEUTRAL;
  const Icon = c.severity === 'block' ? AlertOctagon : AlertTriangle;
  return (
    <div
      className="flex items-start gap-2 px-2 py-1.5 rounded-md"
      style={{ background: mix(color, 5), border: `1px solid ${mix(color, 20)}` }}
    >
      <Icon className="w-3 h-3 shrink-0 mt-0.5" style={{ color }} />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-semibold text-[var(--fg-default)] leading-snug">{c.label}</div>
        <div className="text-[9px] text-[var(--fg-subtle)] mt-0.5 leading-snug">{c.detail}</div>
      </div>
    </div>
  );
}

function obligationVisual(s: ProofObligation['status']) {
  switch (s) {
    case 'pass':    return { color: SUCCESS, Icon: Check, label: 'pass' };
    case 'fail':    return { color: DANGER, Icon: XIcon, label: 'fail' };
    case 'partial': return { color: WARN, Icon: AlertTriangle, label: 'partial' };
    case 'unknown': return { color: INFO, Icon: AlertTriangle, label: 'unknown' };
    default:        return { color: 'var(--fg-subtle)', Icon: Hourglass, label: 'pending' };
  }
}

// ─── 4. loop timeline ──────────────────────────────────────────────────

function LoopTimelinePane({ fixCase }: { fixCase: FixCase }) {
  if (fixCase.loop.iterations.length === 0) return null;
  return (
    <div className="px-4 py-3 border-b border-[var(--border-muted)]">
      <PaneHeader label="Self-check loop" />
      <ol className="space-y-1">
        {fixCase.loop.iterations.map((it) => (
          <li key={it.index} className="flex items-center gap-2 text-[10px]">
            <span
              className="w-4 h-4 shrink-0 rounded-full flex items-center justify-center text-[8px] font-mono"
              style={{
                background: mix(ACCENT, 18),
                color: ACCENT,
                border: `1px solid ${mix(ACCENT, 33)}`,
              }}
            >
              {it.index + 1}
            </span>
            <span className="text-[10px] font-mono uppercase tracking-[var(--track-eyebrow)] text-[var(--fg-muted)] w-[88px] shrink-0">
              {it.stage}
            </span>
            <span className="text-[10px] text-[var(--fg-default)] leading-snug">{it.note}</span>
            <span className="ml-auto text-[9px] font-mono text-[var(--fg-subtle)] shrink-0">
              {it.costTokens.toLocaleString()} tok
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ─── 5. delivery gate + draft package ─────────────────────────────────

function DeliveryPane({
  fixCase, candidate, onValidate,
}: {
  fixCase: FixCase;
  candidate: CandidateFix;
  onValidate: () => void;
}) {
  const draft = fixCase.draft;
  const stage = fixCase.loop.currentStage;
  const validating = stage === 'validate' || stage === 'critique';
  const canValidate = !validating && stage !== 'done' && stage !== 'aborted';

  return (
    <div className="px-4 py-3">
      <PaneHeader label="Delivery" />
      {draft === null ? (
        <div
          className="rounded-md px-3 py-3 flex items-center gap-3"
          style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-muted)' }}
        >
          <Hourglass className="w-3.5 h-3.5 text-[var(--fg-subtle)]" />
          <div className="flex-1 min-w-0 text-[10px] text-[var(--fg-muted)] leading-snug">
            {validating
              ? 'Running proof obligations against the selected candidate.'
              : 'Validation has not run yet. Proofs are pending.'}
          </div>
          <button
            type="button"
            onClick={onValidate}
            disabled={!canValidate}
            className="inline-flex items-center gap-1 h-7 px-3 rounded text-[10px] font-bold uppercase tracking-[var(--track-eyebrow)] transition-colors disabled:opacity-50"
            style={{
              background: canValidate ? mix(ACCENT, 18) : 'var(--bg-surface-muted)',
              color: canValidate ? ACCENT : 'var(--fg-subtle)',
              border: `1px solid ${mix(ACCENT, 33)}`,
            }}
          >
            {validating ? <RotateCcw className="w-2.5 h-2.5 animate-spin" /> : <ShieldCheck className="w-2.5 h-2.5" />}
            {validating ? 'Validating' : 'Run validation'}
          </button>
        </div>
      ) : (
        <DraftPackage candidate={candidate} draft={draft} />
      )}
    </div>
  );
}

function DraftPackage({
  candidate, draft,
}: { candidate: CandidateFix; draft: NonNullable<FixCase['draft']> }) {
  const gateColor = draft.gateDecision === 'auto-submit' ? SUCCESS
    : draft.gateDecision === 'needs-review' ? WARN : DANGER;
  const gateLabel = draft.gateDecision === 'auto-submit' ? 'Auto-submit eligible'
    : draft.gateDecision === 'needs-review' ? 'Needs reviewer sign-off' : 'Human checkpoint';
  return (
    <div
      className="rounded-md overflow-hidden"
      style={{ background: 'var(--bg-surface-muted)', border: `1px solid ${mix(gateColor, 33)}` }}
    >
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ background: mix(gateColor, 6), borderBottom: `1px solid ${mix(gateColor, 20)}` }}
      >
        <GitPullRequestArrow className="w-3.5 h-3.5" style={{ color: gateColor }} />
        <span className="text-[10px] font-black uppercase tracking-[var(--track-eyebrow)]" style={{ color: gateColor }}>
          {gateLabel}
        </span>
        <span className="ml-auto text-[9px] font-mono text-[var(--fg-subtle)]">{candidate.patchKind}</span>
      </div>
      <div className="px-3 py-3 space-y-2">
        <Field label="Title" value={draft.title} />
        <Field label="Why" value={draft.whyThisFix} />
        <Field label="Validation" value={draft.validationSummary} />
        {draft.remainingUnknowns.length > 0 && (
          <Field label="Unknowns" value={draft.remainingUnknowns.join(' · ')} />
        )}
        <Field label="Reviewer" value={draft.reviewerSuggestion} />
        <div className="pt-1.5 mt-1 border-t border-[var(--border-muted)] text-[9px] text-[var(--fg-subtle)] leading-snug">
          <span className="text-[var(--fg-subtle)] mr-1">gate —</span>{draft.gateReason}
        </div>
      </div>
      <div className="px-3 py-2 flex items-center gap-2 border-t border-[var(--border-muted)]">
        <button
          type="button"
          disabled={draft.gateDecision !== 'auto-submit'}
          className="inline-flex items-center gap-1 h-6 px-2.5 rounded text-[10px] font-bold uppercase tracking-[var(--track-eyebrow)] disabled:opacity-50"
          style={{
            background: mix(SUCCESS, 18),
            color: SUCCESS,
            border: `1px solid ${mix(SUCCESS, 33)}`,
          }}
        >
          <ArrowRight className="w-2.5 h-2.5" />
          Open draft PR
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1 h-6 px-2.5 rounded text-[10px] font-bold uppercase tracking-[var(--track-eyebrow)] text-[var(--fg-default)] hover:text-[var(--fg-strong)]"
          style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-default)' }}
        >
          <FileCode className="w-2.5 h-2.5" />
          Open evidence
        </button>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[8px] font-mono uppercase tracking-[var(--track-eyebrow)] text-[var(--fg-subtle)] mb-0.5">{label}</div>
      <div className="text-[10px] text-[var(--fg-default)] leading-snug">{value}</div>
    </div>
  );
}

// ─── shared ────────────────────────────────────────────────────────────

function PaneHeader({ label }: { label: string }) {
  return (
    <div className="text-[9px] font-black uppercase tracking-[var(--track-eyebrow)] text-[var(--fg-subtle)] mb-2">
      {label}
    </div>
  );
}

function SubHeader({ label, tone }: { label: string; tone: 'ok' | 'warn' }) {
  const color = tone === 'ok' ? SUCCESS : WARN;
  return (
    <div
      className="text-[8px] font-mono uppercase tracking-[var(--track-eyebrow)] mb-1.5 flex items-center gap-1"
      style={{ color }}
    >
      <span className="w-1 h-1 rounded-full" style={{ background: color }} />
      {label}
    </div>
  );
}

// Convenience: render the active case from the store. Lets review-stage
// drop a single component without juggling caseId.
export function VerifiedFixCardActive() {
  const activeCaseId = useVerifiedFixStore((s) => s.activeCaseId);
  // Memo the empty-fallback so we don't allocate per render.
  return useMemo(
    () => (activeCaseId !== null ? <VerifiedFixCard caseId={activeCaseId} /> : null),
    [activeCaseId],
  );
}
