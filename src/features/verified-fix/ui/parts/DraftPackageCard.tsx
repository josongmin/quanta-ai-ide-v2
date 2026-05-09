import { GitPullRequest, Users, HelpCircle, Sparkles, Send, ShieldCheck, Copy } from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import type { FixCase } from '../../model/types';
import { useVfx } from './tokens';

// PR package preview — the "ship-ready summary" surface. Plan UX rule #5:
// reviewer must read this in 30s, not skim a copy-paste log.

export function DraftPackageCard({ fixCase }: { fixCase: FixCase }) {
  const t = useVfx();
  const { t: tr } = useTranslation('verified-fix');
  const draft = fixCase.draft;

  if (!draft) {
    return (
      <div
        className="rounded-lg border px-4 py-5"
        style={{ background: t.cardBacking, borderColor: t.border }}
      >
        <div className="flex items-center gap-2 mb-1.5">
          <GitPullRequest className="w-3.5 h-3.5" style={{ color: t.textFaint }} />
          <span
            className="text-[10px] font-black uppercase tracking-[0.18em]"
            style={{ color: t.textMuted }}
          >
            {tr('draft.title')}
          </span>
        </div>
        <div className="text-[11px]" style={{ color: t.textFaint }}>
          {fixCase.loop.aborted ? tr('draft.abortedBody') : tr('draft.pendingBody')}
        </div>
      </div>
    );
  }

  const gateColor =
    draft.gateDecision === 'auto-submit'  ? t.ok
    : draft.gateDecision === 'needs-review' ? t.info
    : t.warn;
  const gateBg =
    draft.gateDecision === 'auto-submit'  ? t.okSoft
    : draft.gateDecision === 'needs-review' ? t.infoSoft
    : t.warnSoft;
  const ActionIcon =
    draft.gateDecision === 'auto-submit'  ? Sparkles
    : draft.gateDecision === 'needs-review' ? Send
    : ShieldCheck;
  const actionLabel =
    draft.gateDecision === 'auto-submit'  ? tr('trust.action.oneClick')
    : draft.gateDecision === 'needs-review' ? tr('trust.action.openDraft')
    : tr('trust.action.routeHuman');

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{ background: t.cardBacking, borderColor: t.border }}
    >
      {/* header */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 border-b"
        style={{ background: t.inset, borderColor: t.borderSoft }}
      >
        <GitPullRequest className="w-3.5 h-3.5" style={{ color: t.textMuted }} />
        <span
          className="text-[10px] font-black uppercase tracking-[0.18em]"
          style={{ color: t.textMuted }}
        >
          {tr('draft.title')}
        </span>
        <span
          className="text-[9px] font-mono px-1.5 py-0.5 rounded ml-1"
          style={{ background: gateBg, color: gateColor }}
        >
          {tr(`gateDecision.${draft.gateDecision}`)}
        </span>
        <button
          type="button"
          className="ml-auto inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded transition-colors"
          style={{ background: 'transparent', color: t.textMuted, border: `1px solid ${t.borderSoft}` }}
          title={tr('draft.copyTitle')}
        >
          <Copy className="w-2.5 h-2.5" /> {tr('draft.copy')}
        </button>
      </div>

      <div className="px-4 py-3.5 space-y-3.5">
        {/* title */}
        <div>
          <Label>{tr('draft.field.title')}</Label>
          <div
            className="text-[12.5px] font-mono mt-0.5 leading-snug"
            style={{ color: t.textHi }}
          >
            {draft.title}
          </div>
        </div>

        {/* summary */}
        <div>
          <Label>{tr('draft.field.summary')}</Label>
          <div
            className="text-[11.5px] leading-relaxed mt-0.5"
            style={{ color: t.textBody }}
          >
            {draft.summary}
          </div>
        </div>

        {/* why this fix */}
        <div>
          <Label>{tr('draft.field.why')}</Label>
          <div
            className="text-[11px] leading-relaxed mt-0.5"
            style={{ color: t.textBody }}
          >
            {draft.whyThisFix}
          </div>
        </div>

        {/* validation */}
        <div>
          <Label>{tr('draft.field.validation')}</Label>
          <div
            className="text-[11px] leading-relaxed mt-0.5 font-mono"
            style={{ color: t.textBody }}
          >
            {draft.validationSummary}
          </div>
        </div>

        {/* unknowns + reviewer side-by-side */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>
              <HelpCircle className="w-2.5 h-2.5 inline -mt-px" /> {tr('draft.field.unknowns')}
            </Label>
            {draft.remainingUnknowns.length === 0 ? (
              <div className="text-[10.5px] mt-1" style={{ color: t.textFaint }}>
                {tr('draft.noUnknowns')}
              </div>
            ) : (
              <ul className="mt-1 space-y-0.5">
                {draft.remainingUnknowns.map((u, i) => (
                  <li key={i} className="text-[10.5px]" style={{ color: t.textMuted }}>
                    · {u}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <Label>
              <Users className="w-2.5 h-2.5 inline -mt-px" /> {tr('draft.field.reviewer')}
            </Label>
            <div className="text-[10.5px] mt-1 leading-snug" style={{ color: t.textBody }}>
              {draft.reviewerSuggestion}
            </div>
          </div>
        </div>

        {/* gate reason as the last beat — explains why the action button reads what it reads */}
        <div
          className="rounded p-2.5 border"
          style={{ background: gateBg, borderColor: gateColor + '40' }}
        >
          <div
            className="text-[9px] font-bold uppercase tracking-[0.14em] mb-0.5"
            style={{ color: gateColor }}
          >
            {tr('draft.gateLine', { decision: tr(`gateDecision.${draft.gateDecision}`) })}
          </div>
          <div className="text-[10.5px] leading-snug" style={{ color: t.textBody }}>
            {draft.gateReason}
          </div>
        </div>

        {/* primary action */}
        <button
          type="button"
          className="w-full rounded-md py-2 text-[11px] font-bold uppercase tracking-[0.14em] flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90"
          style={
            draft.gateDecision === 'auto-submit'
              ? { background: t.ok, color: t.isDark ? '#0d1117' : '#fff' }
              : { background: gateBg, color: gateColor, border: `1px solid ${gateColor}50` }
          }
        >
          <ActionIcon className="w-3.5 h-3.5" />
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  const t = useVfx();
  return (
    <div
      className="text-[9px] font-bold uppercase tracking-[0.16em] flex items-center gap-1"
      style={{ color: t.textFaint }}
    >
      {children}
    </div>
  );
}
