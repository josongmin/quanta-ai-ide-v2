import type { CSSProperties, ReactNode } from 'react';
import { AlertTriangle, Trash2, Sparkles, Send, ShieldCheck, FlaskConical, Loader2 } from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import type { CandidateFix, FixCase } from '../../model/types';
import { useVerifiedFixStore } from '../../model/store';
import { useVfx, tierColor } from './tokens';
import {
  ConfidenceDial,
  CounterEvidenceRow,
  DeliveryGate,
  TierRuleChecklist,
  tierExplainKey,
  tierKey,
} from './trust-panel';

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
        <div className="text-xs font-black uppercase tracking-eyebrow mb-2" style={{ color: t.textMuted }}>
          {tr('trust.signal')}
        </div>
        <div className="text-sm" style={{ color: t.textFaint }}>
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

  const actionBtnBase =
    'w-full rounded-md py-2 text-sm font-bold uppercase tracking-eyebrow flex items-center justify-center gap-1.5';
  const actionButtons: {
    key: string;
    when: boolean;
    className: string;
    style: CSSProperties;
    icon: ReactNode;
    label: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }[] = [
    {
      key: 'validate',
      when: canValidate || validating,
      className: `${actionBtnBase} border transition-colors disabled:opacity-70`,
      style: {
        background: validating ? t.infoSoft : t.accentSoft,
        borderColor: validating ? t.info + '60' : t.accent + '60',
        color: validating ? t.info : t.accent,
      },
      onClick: () => { if (canValidate) startValidation(fixCase.id); },
      disabled: !canValidate,
      icon: validating
        ? <Loader2 className="w-3 h-3 animate-spin" />
        : <FlaskConical className="w-3 h-3" />,
      label: validating
        ? tr('trust.action.running', { stage: tr(`loop.stage.${stage}`) })
        : tr('trust.action.runValidation'),
    },
    {
      key: 'auto-submit',
      when: draft?.gateDecision === 'auto-submit',
      className: `${actionBtnBase} transition-opacity hover:opacity-90`,
      style: { background: t.ok, color: 'var(--fg-on-accent)' },
      icon: <Sparkles className="w-3 h-3" />,
      label: tr('trust.action.oneClick'),
    },
    {
      key: 'needs-review',
      when: draft?.gateDecision === 'needs-review',
      className: `${actionBtnBase} border transition-colors`,
      style: { borderColor: t.info + '60', color: t.info, background: t.infoSoft },
      icon: <Send className="w-3 h-3" />,
      label: tr('trust.action.openDraft'),
    },
    {
      key: 'blocked',
      when: draft?.gateDecision === 'blocked',
      className: `${actionBtnBase} border`,
      style: { borderColor: t.warn + '60', color: t.warn, background: t.warnSoft },
      icon: <ShieldCheck className="w-3 h-3" />,
      label: tr('trust.action.routeHuman'),
    },
  ];

  return (
    <aside
      className="shrink-0 w-[320px] h-full overflow-auto border-l"
      style={{ background: t.sidebar, backdropFilter: t.sidebarBlur, borderColor: t.border }}
    >
      <div className="p-4 space-y-3.5">
        <div>
          <div
            className="text-xs font-black uppercase tracking-eyebrow mb-2"
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
                <span className="text-2xs font-bold uppercase tracking-eyebrow" style={{ color: t.textFaint }}>
                  {tr('trust.deliveryTier')}
                </span>
                <span
                  className="text-2xs font-bold uppercase tracking-eyebrow px-1.5 py-0.5 rounded"
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
              className="text-2xs font-bold uppercase tracking-eyebrow mb-1.5"
              style={{ color: t.textFaint }}
            >
              {tr('trust.weakest')}
            </div>
            <div
              className="rounded-lg border p-3"
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
              className="text-2xs font-bold uppercase tracking-eyebrow mb-1.5"
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
              className="text-2xs font-bold uppercase tracking-eyebrow mb-1.5"
              style={{ color: t.textFaint }}
            >
              {tr('trust.gate')}
            </div>
            <DeliveryGate gateDecision={draft.gateDecision} gateReason={draft.gateReason} />
          </div>
        )}

        {/* actions — data-driven so each affordance is one table row instead
            of four near-identical conditional <button> blocks. `when` gates
            visibility; `className`/`style` carry the per-variant treatment so
            the rendered markup is byte-identical to the prior hand-rolled set.
            The dismiss button is always-on and rendered after the .map(). */}
        <div className="space-y-1.5 pt-1">
          {/* Validation trigger — present until a draft package exists.
              Without it, swapping candidates would leave the gate panel
              empty and unrecoverable. While running, the button degrades
              into a status pill so the user knows the loop is alive. */}
          {actionButtons
            .filter((b) => b.when)
            .map((b) => (
              <button
                key={b.key}
                type="button"
                onClick={b.onClick}
                disabled={b.disabled}
                className={b.className}
                style={b.style}
              >
                {b.icon}
                {b.label}
              </button>
            ))}
          <button
            type="button"
            onClick={() => { onDismiss(candidate.id); }}
            className="w-full rounded-md py-2 text-sm font-bold uppercase tracking-eyebrow flex items-center justify-center gap-1.5 border transition-colors hover:opacity-90"
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
