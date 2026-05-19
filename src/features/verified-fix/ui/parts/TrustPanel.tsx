import { AlertTriangle, Trash2, Sparkles, Send, ShieldCheck, FlaskConical, Loader2 } from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import type { CandidateFix, CounterEvidence, DeliveryTier, FixCase } from '../../model/types';
import { useVerifiedFixStore } from '../../model/store';
import { useVfx, tierColor } from './tokens';

export function TrustPanel({
  candidate, fixCase, onDismiss,
}: {
  candidate: CandidateFix | undefined;
  fixCase: FixCase;
  onDismiss: (candidateId: string) => void;
}) {
  const t = useVfx();
  const { t: tr } = useTranslation('verified-fix');
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
          {tr('trust.signal')}
        </div>
        <div className="text-[11px]" style={{ color: t.textFaint }}>
          {tr('trust.selectCandidate')}
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
            {tr('trust.signal')}
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
                  {tr('trust.deliveryTier')}
                </span>
                <span
                  className="text-[9px] font-bold uppercase tracking-[0.14em] px-1.5 py-0.5 rounded"
                  style={{ background: tc.bg, color: tc.fg }}
                >
                  {tr(tierKey(candidate.tier))}
                </span>
              </div>
              <div className="text-sm mb-2" style={{ color: t.textMuted }}>
                {tr(tierExplainKey(candidate.tier))}
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
              {tr('trust.weakest')}
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
                  className="text-sm font-bold"
                  style={{ color: weakest.status === 'fail' ? t.bad : t.warn }}
                >
                  {weakest.label}
                </span>
              </div>
              <div className="text-sm leading-snug" style={{ color: t.textBody }}>
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
              {tr('trust.counter', { count: counter.length })}
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
              {tr('trust.gate')}
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
              {validating
                ? tr('trust.action.running', { stage: tr(`loop.stage.${stage}`) })
                : tr('trust.action.runValidation')}
            </button>
          )}
          {draft?.gateDecision === 'auto-submit' && (
            <button
              type="button"
              className="w-full rounded-md py-2 text-[11px] font-bold uppercase tracking-[0.14em] flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90"
              style={{ background: t.ok, color: 'var(--fg-on-accent)' }}
            >
              <Sparkles className="w-3 h-3" />
              {tr('trust.action.oneClick')}
            </button>
          )}
          {draft?.gateDecision === 'needs-review' && (
            <button
              type="button"
              className="w-full rounded-md py-2 text-[11px] font-bold uppercase tracking-[0.14em] flex items-center justify-center gap-1.5 border transition-colors"
              style={{ borderColor: t.info + '60', color: t.info, background: t.infoSoft }}
            >
              <Send className="w-3 h-3" />
              {tr('trust.action.openDraft')}
            </button>
          )}
          {draft?.gateDecision === 'blocked' && (
            <button
              type="button"
              className="w-full rounded-md py-2 text-[11px] font-bold uppercase tracking-[0.14em] flex items-center justify-center gap-1.5 border"
              style={{ borderColor: t.warn + '60', color: t.warn, background: t.warnSoft }}
            >
              <ShieldCheck className="w-3 h-3" />
              {tr('trust.action.routeHuman')}
            </button>
          )}
          <button
            type="button"
            onClick={() => { onDismiss(candidate.id); }}
            className="w-full rounded-md py-2 text-[11px] font-bold uppercase tracking-[0.14em] flex items-center justify-center gap-1.5 border transition-colors hover:opacity-90"
            style={{ borderColor: t.border, color: t.textMuted, background: 'transparent' }}
          >
            <Trash2 className="w-3 h-3" />
            {tr('trust.action.dismiss')}
          </button>
        </div>
      </div>
    </aside>
  );
}

function CounterEvidenceRow({ item }: { item: CounterEvidence }) {
  const t = useVfx();
  const { t: tr } = useTranslation('verified-fix');
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
          className="text-2xs font-bold uppercase tracking-[0.14em] px-1 py-px rounded font-mono"
          style={{ background: sevBg, color: sevColor }}
        >
          {tr(`trust.counterSeverity.${item.severity}`)}
        </span>
        <span className="text-sm font-semibold" style={{ color: t.textHi }}>
          {item.label}
        </span>
      </div>
      <div className="text-sm leading-snug" style={{ color: t.textMuted }}>
        {item.detail}
      </div>
    </div>
  );
}

function ConfidenceDial({ value }: { value: number }) {
  const t = useVfx();
  const { t: tr } = useTranslation('verified-fix');
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
            {tr('trust.conf')}
          </span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: t.textFaint }}>
          {tr('trust.patchConfidence')}
        </div>
        <div className="text-sm mt-0.5 leading-snug" style={{ color: t.textBody }}>
          {tr(confidenceKey(value))}
        </div>
      </div>
    </div>
  );
}

function DeliveryGate({ gateDecision, gateReason }: { gateDecision: string; gateReason: string }) {
  const t = useVfx();
  const { t: tr } = useTranslation('verified-fix');
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
          {tr(`gateDecision.${gateDecision}`)}
        </span>
      </div>
      <div className="text-sm leading-snug" style={{ color: t.textMuted }}>
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
  const { t: tr } = useTranslation('verified-fix');
  const allPass = candidate.obligations.every((o) => o.status === 'pass');
  const partial = candidate.obligations.some((o) => o.status === 'partial');
  const failing = candidate.obligations.some((o) => o.status === 'fail');

  const checks: { label: string; pass: boolean }[] = [
    { label: tr('trust.tierRule.lines'),       pass: candidate.changedLines <= 20 },
    { label: tr('trust.tierRule.files'),       pass: candidate.changedFiles <= 2 },
    { label: tr('trust.tierRule.blast'),       pass: candidate.blastModules <= 1 },
    { label: tr('trust.tierRule.noPublicApi'), pass: !candidate.publicApiChange },
    { label: tr('trust.tierRule.allProofs'),   pass: allPass && !partial && !failing },
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

function tierKey(tier: DeliveryTier): string {
  switch (tier) {
    case 'safe-mechanical': return 'tier.safeMechanical';
    case 'guarded':         return 'tier.guarded';
    case 'human-required':  return 'tier.humanRequired';
  }
}

function tierExplainKey(tier: DeliveryTier): string {
  switch (tier) {
    case 'safe-mechanical': return 'tier.explainSafe';
    case 'guarded':         return 'tier.explainGuarded';
    case 'human-required':  return 'tier.explainHuman';
  }
}

function confidenceKey(v: number): string {
  if (v >= 0.9)  return 'trust.confidence.strong';
  if (v >= 0.75) return 'trust.confidence.sound';
  if (v >= 0.5)  return 'trust.confidence.mixed';
  return 'trust.confidence.weak';
}
