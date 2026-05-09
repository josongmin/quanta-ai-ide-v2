import { AlertTriangle, Trash2, Sparkles, Send, ShieldCheck, FlaskConical, Loader2 } from 'lucide-react';
import type { CandidateFix, CounterEvidence, FixCase } from '../../model/types';
import { useVerifiedFixStore } from '../../model/store';
import { useVfx, tierColor, tierLabel } from './tokens';

export function TrustPanel({
  candidate, fixCase, onDismiss,
}: {
  candidate: CandidateFix | undefined;
  fixCase: FixCase;
  onDismiss: (candidateId: string) => void;
}) {
  const t = useVfx();
  const draft = fixCase.draft;
  // Validation is the user-triggered action that produces the draft
  // package. Without exposing the trigger here, picking a different
  // candidate leaves the gate panel empty with no way to recover.
  const startValidation = useVerifiedFixStore((s) => s.startValidation);
  const stage = fixCase.loop.currentStage;
  const validating = stage === 'validate' || stage === 'critique';
  const canValidate = !validating && stage !== 'done' && stage !== 'aborted'
    && candidate !== undefined && fixCase.draft === null;

  if (!candidate) {
    return (
      <aside
        className="shrink-0 w-[320px] h-full overflow-auto border-l p-4"
        style={{ background: t.sidebar, backdropFilter: t.sidebarBlur, borderColor: t.border }}
      >
        <div className="text-[10px] font-black uppercase tracking-[0.18em] mb-2" style={{ color: t.textMuted }}>
          trust signal
        </div>
        <div className="text-[11px]" style={{ color: t.textFaint }}>
          select a candidate to inspect its trust profile.
        </div>
      </aside>
    );
  }

  const tc = tierColor(t, candidate.tier);
  const weakest = candidate.weakestObligationId
    ? candidate.obligations.find((o) => o.id === candidate.weakestObligationId)
    : null;
  const counter = candidate.counterEvidence;

  return (
    <aside
      className="shrink-0 w-[320px] h-full overflow-auto border-l"
      style={{ background: t.sidebar, backdropFilter: t.sidebarBlur, borderColor: t.border }}
    >
      <div className="p-4 space-y-3.5">
        <div>
          <div
            className="text-[10px] font-black uppercase tracking-[0.18em] mb-2"
            style={{ color: t.textMuted }}
          >
            trust signal
          </div>

          {/* confidence dial */}
          <div
            className="rounded-lg border p-3.5"
            style={{ background: t.cardBacking, borderColor: t.border }}
          >
            <ConfidenceDial value={candidate.confidence} />

            <div className="mt-3 pt-3 border-t" style={{ borderColor: t.borderSoft }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: t.textFaint }}>
                  delivery tier
                </span>
                <span
                  className="text-[9px] font-bold uppercase tracking-[0.14em] px-1.5 py-0.5 rounded"
                  style={{ background: tc.bg, color: tc.fg }}
                >
                  {tierLabel(candidate.tier)}
                </span>
              </div>
              <div className="text-[10.5px] mb-2" style={{ color: t.textMuted }}>
                {tierExplain(candidate.tier)}
              </div>
              <TierRuleChecklist candidate={candidate} />
            </div>
          </div>
        </div>

        {/* weakest obligation — the "why might I reject this in 5s" surface */}
        {weakest && (
          <div>
            <div
              className="text-[9px] font-bold uppercase tracking-[0.14em] mb-1.5"
              style={{ color: t.textFaint }}
            >
              weakest link
            </div>
            <div
              className="rounded-lg border-l-0 border p-3"
              style={{
                background: t.cardBacking,
                borderColor: weakest.status === 'fail' ? t.bad + '40' : t.warn + '40',
              }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle
                  className="w-3 h-3"
                  style={{ color: weakest.status === 'fail' ? t.bad : t.warn }}
                />
                <span
                  className="text-[10.5px] font-bold"
                  style={{ color: weakest.status === 'fail' ? t.bad : t.warn }}
                >
                  {weakest.label}
                </span>
              </div>
              <div className="text-[10.5px] leading-snug" style={{ color: t.textBody }}>
                {weakest.detail}
              </div>
            </div>
          </div>
        )}

        {/* counter-evidence — equal weight to proofs per plan doc */}
        {counter.length > 0 && (
          <div>
            <div
              className="text-[9px] font-bold uppercase tracking-[0.14em] mb-1.5"
              style={{ color: t.textFaint }}
            >
              counter-evidence ({counter.length})
            </div>
            <div className="space-y-1.5">
              {counter.map((c) => (
                <CounterEvidenceRow key={c.id} item={c} />
              ))}
            </div>
          </div>
        )}

        {/* gate decision */}
        {draft && (
          <div>
            <div
              className="text-[9px] font-bold uppercase tracking-[0.14em] mb-1.5"
              style={{ color: t.textFaint }}
            >
              delivery gate
            </div>
            <DeliveryGate gateDecision={draft.gateDecision} gateReason={draft.gateReason} />
          </div>
        )}

        {/* actions */}
        <div className="space-y-1.5 pt-1">
          {/* Validation trigger — present until a draft package exists.
              Without it, swapping candidates would leave the gate panel
              empty and unrecoverable. While running, the button degrades
              into a status pill so the user knows the loop is alive. */}
          {(canValidate || validating) && (
            <button
              type="button"
              onClick={() => { if (canValidate) startValidation(fixCase.id); }}
              disabled={!canValidate}
              className="w-full rounded-md py-2 text-[11px] font-bold uppercase tracking-[0.14em] flex items-center justify-center gap-1.5 border transition-colors disabled:opacity-70"
              style={{
                background: validating ? t.infoSoft : t.accentSoft,
                borderColor: validating ? t.info + '60' : t.accent + '60',
                color: validating ? t.info : t.accent,
              }}
            >
              {validating
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <FlaskConical className="w-3 h-3" />}
              {validating ? `running ${stage}` : 'run validation'}
            </button>
          )}
          {draft?.gateDecision === 'auto-submit' && (
            <button
              type="button"
              className="w-full rounded-md py-2 text-[11px] font-bold uppercase tracking-[0.14em] flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90"
              style={{ background: t.ok, color: t.isDark ? '#0d1117' : '#fff' }}
            >
              <Sparkles className="w-3 h-3" />
              one-click draft pr
            </button>
          )}
          {draft?.gateDecision === 'needs-review' && (
            <button
              type="button"
              className="w-full rounded-md py-2 text-[11px] font-bold uppercase tracking-[0.14em] flex items-center justify-center gap-1.5 border transition-colors"
              style={{ borderColor: t.info + '60', color: t.info, background: t.infoSoft }}
            >
              <Send className="w-3 h-3" />
              open draft pr
            </button>
          )}
          {draft?.gateDecision === 'blocked' && (
            <button
              type="button"
              className="w-full rounded-md py-2 text-[11px] font-bold uppercase tracking-[0.14em] flex items-center justify-center gap-1.5 border"
              style={{ borderColor: t.warn + '60', color: t.warn, background: t.warnSoft }}
            >
              <ShieldCheck className="w-3 h-3" />
              route to human review
            </button>
          )}
          <button
            type="button"
            onClick={() => { onDismiss(candidate.id); }}
            className="w-full rounded-md py-2 text-[11px] font-bold uppercase tracking-[0.14em] flex items-center justify-center gap-1.5 border transition-colors hover:opacity-90"
            style={{ borderColor: t.border, color: t.textMuted, background: 'transparent' }}
          >
            <Trash2 className="w-3 h-3" />
            dismiss + log reason
          </button>
        </div>
      </div>
    </aside>
  );
}

function CounterEvidenceRow({ item }: { item: CounterEvidence }) {
  const t = useVfx();
  const sevColor =
    item.severity === 'block'   ? t.bad
    : item.severity === 'concern' ? t.warn
    : t.textMuted;
  const sevBg =
    item.severity === 'block'   ? t.badSoft
    : item.severity === 'concern' ? t.warnSoft
    : t.badgeBg;
  return (
    <div
      className="rounded border p-2"
      style={{ background: t.cardBacking, borderColor: t.borderSoft }}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span
          className="text-[8.5px] font-bold uppercase tracking-[0.14em] px-1 py-px rounded font-mono"
          style={{ background: sevBg, color: sevColor }}
        >
          {item.severity}
        </span>
        <span className="text-[10.5px] font-semibold" style={{ color: t.textHi }}>
          {item.label}
        </span>
      </div>
      <div className="text-[10.5px] leading-snug" style={{ color: t.textMuted }}>
        {item.detail}
      </div>
    </div>
  );
}

function ConfidenceDial({ value }: { value: number }) {
  const t = useVfx();
  const pct = Math.round(value * 100);
  const arc = 2 * Math.PI * 22;
  const dashed = (value * arc).toFixed(2);
  const color = value >= 0.85 ? t.ok : value >= 0.7 ? t.info : value >= 0.5 ? t.warn : t.bad;
  return (
    <div className="flex items-center gap-3">
      <div className="relative w-[60px] h-[60px] shrink-0">
        <svg viewBox="0 0 56 56" className="w-[60px] h-[60px] -rotate-90">
          <circle cx="28" cy="28" r="22" stroke={t.borderSoft} strokeWidth="4" fill="none" />
          <circle
            cx="28" cy="28" r="22"
            stroke={color} strokeWidth="4" fill="none"
            strokeDasharray={`${dashed} ${arc.toFixed(2)}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[16px] font-black font-mono" style={{ color }}>{pct}</span>
          <span className="text-[8px] font-bold uppercase tracking-[0.12em]" style={{ color: t.textFaint }}>
            conf
          </span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: t.textFaint }}>
          patch confidence
        </div>
        <div className="text-[10.5px] mt-0.5 leading-snug" style={{ color: t.textBody }}>
          {confidenceLabel(value)}
        </div>
      </div>
    </div>
  );
}

function DeliveryGate({ gateDecision, gateReason }: { gateDecision: string; gateReason: string }) {
  const t = useVfx();
  const color =
    gateDecision === 'auto-submit'  ? t.ok
    : gateDecision === 'needs-review' ? t.info
    : t.warn;
  const bg =
    gateDecision === 'auto-submit'  ? t.okSoft
    : gateDecision === 'needs-review' ? t.infoSoft
    : t.warnSoft;
  return (
    <div className="rounded border p-2.5" style={{ background: t.cardBacking, borderColor: t.borderSoft }}>
      <div className="flex items-center gap-1.5 mb-1">
        <span
          className="text-[9px] font-bold uppercase tracking-[0.14em] px-1.5 py-0.5 rounded"
          style={{ background: bg, color }}
        >
          {gateDecision.replace('-', ' ')}
        </span>
      </div>
      <div className="text-[10.5px] leading-snug" style={{ color: t.textMuted }}>
        {gateReason}
      </div>
    </div>
  );
}

// Quantitative gate rules for safe-mechanical tier — exposed inline so
// reviewers can see why this candidate did or didn't qualify, instead
// of trusting an opaque label. Plan doc demands this be measurable.
function TierRuleChecklist({ candidate }: { candidate: CandidateFix }) {
  const t = useVfx();
  const allPass = candidate.obligations.every((o) => o.status === 'pass');
  const partial = candidate.obligations.some((o) => o.status === 'partial');
  const failing = candidate.obligations.some((o) => o.status === 'fail');

  const checks: { label: string; pass: boolean }[] = [
    { label: 'lines ≤ 20',         pass: candidate.changedLines <= 20 },
    { label: 'files ≤ 2',          pass: candidate.changedFiles <= 2 },
    { label: 'blast ≤ 1 module',   pass: candidate.blastModules <= 1 },
    { label: 'no public API break', pass: !candidate.publicApiChange },
    { label: 'all proofs pass',    pass: allPass && !partial && !failing },
  ];
  return (
    <ul className="space-y-0.5">
      {checks.map((c, i) => (
        <li
          key={i}
          className="flex items-center gap-1.5 text-[10px] font-mono"
          style={{ color: c.pass ? t.ok : t.textFaint }}
        >
          <span className="inline-block w-3 text-center">{c.pass ? '✓' : '·'}</span>
          <span>{c.label}</span>
        </li>
      ))}
    </ul>
  );
}

function tierExplain(tier: CandidateFix['tier']): string {
  switch (tier) {
    case 'safe-mechanical':
      return 'eligible for one-click draft. mechanical patch class, blast ≤ 1, all proofs pass.';
    case 'guarded':
      return 'draft PR with explicit reviewer approve. proofs static-pass; dynamic bounded.';
    case 'human-required':
      return 'route to manual review. exceeds delivery-gate thresholds or touches public surface.';
  }
}

function confidenceLabel(v: number): string {
  if (v >= 0.9) return 'strong: proofs cover all paths the engine traced.';
  if (v >= 0.75) return 'sound: weakest obligation is bounded and addressable.';
  if (v >= 0.5)  return 'mixed: review the weakest link before merging.';
  return 'weak: not delivery-ready. consider seed enrichment.';
}
