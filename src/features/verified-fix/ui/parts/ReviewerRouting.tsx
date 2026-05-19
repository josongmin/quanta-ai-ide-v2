import { Crown, Shield, Compass, Phone } from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import type { ReviewerCandidate } from '../../model/types';
import { REVIEWERS } from '../../model/phaseData';
import { useVfx } from './tokens';

const ROLE_ICON: Record<ReviewerCandidate['role'], typeof Crown> = {
  codeowner: Crown,
  security:  Shield,
  domain:    Compass,
  oncall:    Phone,
};

export function ReviewerRouting({ caseId }: { caseId: string }) {
  const t = useVfx();
  const { t: tr } = useTranslation('verified-fix');
  const reviewers = REVIEWERS[caseId] ?? [];

  return (
    <div
      className="rounded-lg border p-4"
      style={{ background: t.cardBacking, borderColor: t.border }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <span
          className="text-[10px] font-black uppercase tracking-[0.18em]"
          style={{ color: t.textMuted }}
        >
          {tr('reviewer.title')}
        </span>
        <span className="text-[9px] font-mono" style={{ color: t.textFaint }}>
          {tr('reviewer.subtitle')}
        </span>
      </div>

      {reviewers.length === 0 ? (
        <div className="text-[11px]" style={{ color: t.textFaint }}>
          {tr('reviewer.empty')}
        </div>
      ) : (
        <div className="space-y-1.5">
          {reviewers.map((r, i) => (
            <ReviewerRow key={r.handle} reviewer={r} primary={i === 0} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewerRow({ reviewer, primary }: { reviewer: ReviewerCandidate; primary: boolean }) {
  const t = useVfx();
  const { t: tr } = useTranslation('verified-fix');
  const Icon = ROLE_ICON[reviewer.role];
  const matchPct = Math.round(reviewer.matchScore * 100);
  const loadColor = reviewer.loadPct >= 70 ? t.warn : reviewer.loadPct >= 40 ? t.info : t.ok;

  return (
    <div
      className="rounded border px-3 py-2 flex items-center gap-2.5"
      style={{
        background: primary ? t.accentSoft : t.inset,
        borderColor: primary ? t.accent + '40' : t.borderSoft,
      }}
    >
      <Icon className="w-3 h-3 shrink-0" style={{ color: primary ? t.accent : t.textMuted }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span
            className="text-base font-mono font-semibold"
            style={{ color: t.textHi }}
          >
            {reviewer.handle}
          </span>
          <span
            className="text-2xs font-bold uppercase tracking-[0.14em] px-1 py-px rounded"
            style={{ background: t.badgeBg, color: t.textMuted }}
          >
            {tr(`reviewer.role.${reviewer.role}`)}
          </span>
          {primary && (
            <span
              className="text-2xs font-bold uppercase tracking-[0.14em] px-1 py-px rounded ml-auto"
              style={{ background: t.accent, color: 'var(--fg-on-accent)' }}
            >
              {tr('reviewer.suggest')}
            </span>
          )}
        </div>
        <div className="text-sm mt-0.5" style={{ color: t.textMuted }}>
          {reviewer.rationale}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: t.textFaint }}>
          {tr('reviewer.match')}
        </div>
        <div className="text-[12px] font-mono" style={{ color: t.textHi }}>
          {matchPct}%
        </div>
        <div className="mt-1 flex items-center justify-end gap-1">
          <span
            className="inline-block w-12 h-[3px] rounded overflow-hidden"
            style={{ background: t.borderHair }}
          >
            <span
              className="block h-full"
              style={{ width: `${reviewer.loadPct}%`, background: loadColor }}
            />
          </span>
          <span className="text-2xs font-mono" style={{ color: t.textFaint }}>
            {tr('reviewer.load', { pct: reviewer.loadPct })}
          </span>
        </div>
      </div>
    </div>
  );
}
