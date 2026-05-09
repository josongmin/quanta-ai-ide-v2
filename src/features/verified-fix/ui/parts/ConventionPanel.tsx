import { Sparkle, Check, Minus, X } from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import type { CandidateFix } from '../../model/types';
import { useVfx, statusColor } from './tokens';

export function ConventionPanel({ candidate }: { candidate: CandidateFix }) {
  const t = useVfx();
  const { t: tr } = useTranslation('verified-fix');
  const items = candidate.obligations.filter((o) => o.category === 'stylistic');

  return (
    <div
      className="rounded-lg border p-4"
      style={{ background: t.cardBacking, borderColor: t.border }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <Sparkle className="w-3 h-3" style={{ color: t.textMuted }} />
          <span
            className="text-[10px] font-black uppercase tracking-[0.18em]"
            style={{ color: t.textMuted }}
          >
            {tr('convention.title')}
          </span>
        </div>
        <span className="text-[9px] font-mono" style={{ color: t.textFaint }}>
          {tr('convention.subtitle')}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="text-[11px]" style={{ color: t.textFaint }}>
          {tr('convention.empty')}
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((o) => {
            const c = statusColor(t, o.status);
            const Icon = o.status === 'pass' ? Check : o.status === 'partial' ? Minus : X;
            return (
              <li
                key={o.id}
                className="rounded border px-3 py-2 flex items-start gap-2.5"
                style={{ background: t.inset, borderColor: t.borderSoft }}
              >
                <Icon className="w-3 h-3 mt-0.5 shrink-0" style={{ color: c.fg }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10.5px] font-bold" style={{ color: t.textHi }}>
                      {o.label}
                    </span>
                    <span
                      className="text-[8.5px] font-bold uppercase tracking-[0.14em] px-1 py-px rounded"
                      style={{ background: c.bg, color: c.fg }}
                    >
                      {tr(`proof.status.${o.status}`)}
                    </span>
                  </div>
                  <div className="text-[10.5px] mt-0.5" style={{ color: t.textMuted }}>
                    {o.detail}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div
        className="mt-3 pt-3 border-t flex flex-wrap gap-1.5"
        style={{ borderColor: t.borderHair }}
      >
        <span className="text-[8.5px] font-bold uppercase tracking-[0.14em]" style={{ color: t.textFaint }}>
          {tr('convention.benchmarkedAgainst')}
        </span>
        {(['neighboringImports', 'siblingErrorPatterns', 'namingConvention', 'lintFormatRules'] as const).map((src) => (
          <span
            key={src}
            className="text-[9px] font-mono px-1.5 py-0.5 rounded"
            style={{ background: t.badgeBg, color: t.textMuted }}
          >
            {tr(`convention.src.${src}`)}
          </span>
        ))}
      </div>
    </div>
  );
}
