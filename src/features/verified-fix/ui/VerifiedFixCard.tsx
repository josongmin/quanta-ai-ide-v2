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
        borderColor: 'rgba(149,131,184,0.30)',
        background: 'linear-gradient(180deg, rgba(149,131,184,0.06) 0%, rgba(149,131,184,0.02) 100%)',
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
    stage === 'done' ? '#5fa86c'
      : stage === 'aborted' ? '#c25a55'
      : stage === 'validate' || stage === 'critique' ? '#c2b3e0'
      : 'rgba(255,255,255,0.55)';
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.08]">
      <Wand2 className="w-3.5 h-3.5" style={{ color: '#c2b3e0' }} />
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/65">
        Verified Fix Pipeline
      </span>
      <span
        className="ml-auto inline-flex items-center gap-1.5 px-2 h-5 rounded text-[9px] font-mono uppercase tracking-[0.14em]"
        style={{ background: `${stageColor}1c`, color: stageColor, border: `1px solid ${stageColor}55` }}
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
  const sevColor = seed.severity === 'crit' ? '#c25a55'
    : seed.severity === 'high' ? '#a8893a'
    : seed.severity === 'med'  ? '#7aa7d4' : '#8b949e';
  return (
    <div className="px-4 py-3 border-b border-white/[0.06]">
      <div className="flex items-start gap-3">
        <div
          className="shrink-0 w-8 h-8 rounded-md flex items-center justify-center mt-0.5"
          style={{ background: `${sevColor}1f`, border: `1px solid ${sevColor}55` }}
        >
          <BadgeAlert className="w-3.5 h-3.5" style={{ color: sevColor }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className="text-[9px] font-mono uppercase tracking-[0.18em]"
              style={{ color: sevColor }}
            >
              {seed.severity}
            </span>
            <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-white/35">
              · {seed.kind}
            </span>
          </div>
          <div className="text-[12px] font-semibold text-white/85 leading-snug truncate">
            {seed.title}
          </div>
          <div className="text-[11px] text-white/55 leading-relaxed mt-1">
            <span className="text-white/35 mr-1">root cause —</span>{fixCase.rootCause}
          </div>
          {seed.evidenceRefs.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {seed.evidenceRefs.map((e, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-1.5 h-4 rounded-sm text-[9px] font-mono text-white/55"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
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
    <div className="px-4 py-3 border-b border-white/[0.06]">
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
  const tierColor = cand.tier === 'safe-mechanical' ? '#5fa86c'
    : cand.tier === 'guarded' ? '#a8893a' : '#c25a55';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="w-full text-left rounded-md px-3 py-2 transition-colors"
      style={{
        background: selected ? 'rgba(149,131,184,0.10)' : 'rgba(255,255,255,0.02)',
        border: selected ? '1px solid rgba(149,131,184,0.45)' : '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: tierColor, boxShadow: selected ? `0 0 6px ${tierColor}` : 'none' }}
        />
        <span className="text-[11px] font-bold text-white/85 truncate">{cand.title}</span>
        <span
          className="ml-auto shrink-0 text-[9px] font-mono uppercase tracking-[0.14em]"
          style={{ color: tierColor }}
        >
          {cand.tier}
        </span>
      </div>
      <div className="text-[10px] text-white/55 leading-relaxed mt-1 line-clamp-2">
        {cand.rationale}
      </div>
      <div className="flex items-center gap-3 text-[9px] font-mono text-white/35 mt-1.5">
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
    <div className="px-4 py-3 border-b border-white/[0.06]">
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
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
    >
      <Icon className="w-3 h-3 shrink-0 mt-0.5" style={{ color }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold text-white/85 truncate">{o.label}</span>
          <span
            className="text-[8px] font-mono uppercase tracking-[0.14em] shrink-0"
            style={{ color }}
          >
            {label}
          </span>
        </div>
        <div className="text-[9px] text-white/45 mt-0.5 leading-snug">{o.detail}</div>
      </div>
    </div>
  );
}

function CounterRow({ c }: { c: CounterEvidence }) {
  const color = c.severity === 'block' ? '#c25a55' : c.severity === 'concern' ? '#a8893a' : '#8b949e';
  const Icon = c.severity === 'block' ? AlertOctagon : AlertTriangle;
  return (
    <div
      className="flex items-start gap-2 px-2 py-1.5 rounded-md"
      style={{ background: `${color}0e`, border: `1px solid ${color}33` }}
    >
      <Icon className="w-3 h-3 shrink-0 mt-0.5" style={{ color }} />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-semibold text-white/85 leading-snug">{c.label}</div>
        <div className="text-[9px] text-white/45 mt-0.5 leading-snug">{c.detail}</div>
      </div>
    </div>
  );
}

function obligationVisual(s: ProofObligation['status']) {
  switch (s) {
    case 'pass':    return { color: '#5fa86c', Icon: Check, label: 'pass' };
    case 'fail':    return { color: '#c25a55', Icon: XIcon, label: 'fail' };
    case 'partial': return { color: '#a8893a', Icon: AlertTriangle, label: 'partial' };
    case 'unknown': return { color: '#7aa7d4', Icon: AlertTriangle, label: 'unknown' };
    default:        return { color: 'rgba(255,255,255,0.45)', Icon: Hourglass, label: 'pending' };
  }
}

// ─── 4. loop timeline ──────────────────────────────────────────────────

function LoopTimelinePane({ fixCase }: { fixCase: FixCase }) {
  if (fixCase.loop.iterations.length === 0) return null;
  return (
    <div className="px-4 py-3 border-b border-white/[0.06]">
      <PaneHeader label="Self-check loop" />
      <ol className="space-y-1">
        {fixCase.loop.iterations.map((it) => (
          <li key={it.index} className="flex items-center gap-2 text-[10px]">
            <span
              className="w-4 h-4 shrink-0 rounded-full flex items-center justify-center text-[8px] font-mono"
              style={{
                background: 'rgba(149,131,184,0.18)',
                color: '#c2b3e0',
                border: '1px solid rgba(149,131,184,0.45)',
              }}
            >
              {it.index + 1}
            </span>
            <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-white/55 w-[88px] shrink-0">
              {it.stage}
            </span>
            <span className="text-[10px] text-white/65 leading-snug">{it.note}</span>
            <span className="ml-auto text-[9px] font-mono text-white/30 shrink-0">
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
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <Hourglass className="w-3.5 h-3.5 text-white/45" />
          <div className="flex-1 min-w-0 text-[10px] text-white/55 leading-snug">
            {validating
              ? 'Running proof obligations against the selected candidate.'
              : 'Validation has not run yet. Proofs are pending.'}
          </div>
          <button
            type="button"
            onClick={onValidate}
            disabled={!canValidate}
            className="inline-flex items-center gap-1 h-7 px-3 rounded text-[10px] font-bold uppercase tracking-[0.14em] transition-colors disabled:opacity-50"
            style={{
              background: canValidate ? 'rgba(149,131,184,0.18)' : 'rgba(255,255,255,0.03)',
              color: canValidate ? '#c2b3e0' : 'rgba(255,255,255,0.35)',
              border: '1px solid rgba(149,131,184,0.45)',
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
  const gateColor = draft.gateDecision === 'auto-submit' ? '#5fa86c'
    : draft.gateDecision === 'needs-review' ? '#a8893a' : '#c25a55';
  const gateLabel = draft.gateDecision === 'auto-submit' ? 'Auto-submit eligible'
    : draft.gateDecision === 'needs-review' ? 'Needs reviewer sign-off' : 'Human checkpoint';
  return (
    <div
      className="rounded-md overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${gateColor}55` }}
    >
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ background: `${gateColor}10`, borderBottom: `1px solid ${gateColor}33` }}
      >
        <GitPullRequestArrow className="w-3.5 h-3.5" style={{ color: gateColor }} />
        <span className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: gateColor }}>
          {gateLabel}
        </span>
        <span className="ml-auto text-[9px] font-mono text-white/45">{candidate.patchKind}</span>
      </div>
      <div className="px-3 py-3 space-y-2">
        <Field label="Title" value={draft.title} />
        <Field label="Why" value={draft.whyThisFix} />
        <Field label="Validation" value={draft.validationSummary} />
        {draft.remainingUnknowns.length > 0 && (
          <Field label="Unknowns" value={draft.remainingUnknowns.join(' · ')} />
        )}
        <Field label="Reviewer" value={draft.reviewerSuggestion} />
        <div className="pt-1.5 mt-1 border-t border-white/[0.06] text-[9px] text-white/45 leading-snug">
          <span className="text-white/30 mr-1">gate —</span>{draft.gateReason}
        </div>
      </div>
      <div className="px-3 py-2 flex items-center gap-2 border-t border-white/[0.06]">
        <button
          type="button"
          disabled={draft.gateDecision !== 'auto-submit'}
          className="inline-flex items-center gap-1 h-6 px-2.5 rounded text-[10px] font-bold uppercase tracking-[0.14em] disabled:opacity-50"
          style={{
            background: 'rgba(95,168,108,0.18)',
            color: '#9fd0a8',
            border: '1px solid rgba(95,168,108,0.45)',
          }}
        >
          <ArrowRight className="w-2.5 h-2.5" />
          Open draft PR
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1 h-6 px-2.5 rounded text-[10px] font-bold uppercase tracking-[0.14em] text-white/65 hover:text-white"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)' }}
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
      <div className="text-[8px] font-mono uppercase tracking-[0.18em] text-white/35 mb-0.5">{label}</div>
      <div className="text-[10px] text-white/75 leading-snug">{value}</div>
    </div>
  );
}

// ─── shared ────────────────────────────────────────────────────────────

function PaneHeader({ label }: { label: string }) {
  return (
    <div className="text-[9px] font-black uppercase tracking-[0.18em] text-white/45 mb-2">
      {label}
    </div>
  );
}

function SubHeader({ label, tone }: { label: string; tone: 'ok' | 'warn' }) {
  const color = tone === 'ok' ? '#5fa86c' : '#a8893a';
  return (
    <div
      className="text-[8px] font-mono uppercase tracking-[0.18em] mb-1.5 flex items-center gap-1"
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
