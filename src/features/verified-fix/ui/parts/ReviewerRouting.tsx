import { Crown, Shield, Compass, Phone } from 'lucide-react';
import type { ReviewerCandidate } from '../../model/types';
import { REVIEWERS } from '../../model/phaseData';
import { useVfx } from './tokens';

const ROLE_ICON: Record<ReviewerCandidate['role'], typeof Crown> = {
  codeowner: Crown,
  security:  Shield,
  domain:    Compass,
  oncall:    Phone,
};

const ROLE_LABEL: Record<ReviewerCandidate['role'], string> = {
  codeowner: 'codeowner',
  security:  'security',
  domain:    'domain expert',
  oncall:    'oncall',
};

// Phase 2 — reviewer routing. Pulls from CODEOWNERS + signals from
// ownership graph, security membership, oncall rotation. UI surfaces
// match score (relevance) and current load (so we don't pile on the
// same overloaded reviewer for every fix).

export function ReviewerRouting({ caseId }: { caseId: string }) {
  const t = useVfx();
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
          reviewer routing
        </span>
        <span className="text-[9px] font-mono" style={{ color: t.textFaint }}>
          ranked by match × (1 − load)
        </span>
      </div>

      {reviewers.length === 0 ? (
        <div className="text-[11px]" style={{ color: t.textFaint }}>
          no reviewer suggestion — ownership graph could not match.
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
            className="text-[11.5px] font-mono font-semibold"
            style={{ color: t.textHi }}
          >
            {reviewer.handle}
          </span>
          <span
            className="text-[8.5px] font-bold uppercase tracking-[0.14em] px-1 py-px rounded"
            style={{ background: t.badgeBg, color: t.textMuted }}
          >
            {ROLE_LABEL[reviewer.role]}
          </span>
          {primary && (
            <span
              className="text-[8.5px] font-bold uppercase tracking-[0.14em] px-1 py-px rounded ml-auto"
              style={{ background: t.accent, color: t.isDark ? '#0d1117' : '#fff' }}
            >
              suggest
            </span>
          )}
        </div>
        <div className="text-[10.5px] mt-0.5" style={{ color: t.textMuted }}>
          {reviewer.rationale}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: t.textFaint }}>
          match
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
          <span className="text-[8.5px] font-mono" style={{ color: t.textFaint }}>
            {reviewer.loadPct}% load
          </span>
        </div>
      </div>
    </div>
  );
}
