import { MessageSquareWarning, BarChart3 } from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import { DISMISSED_FEEDBACK } from '../../model/phaseData';
import { useVfx } from './tokens';

// Phase 3 — dismissed-candidate feedback loop. Tags + notes from the
// dismiss modal feed the next candidate generation. This panel makes
// the loop visible: which reasons recur, what reviewers wrote, and how
// the generator should adapt.

export function DismissFeedback() {
  const t = useVfx();
  const { t: tr } = useTranslation('verified-fix');
  const counts = DISMISSED_FEEDBACK.reduce<Record<string, number>>((acc, r) => {
    acc[r.reasonTag] = (acc[r.reasonTag] ?? 0) + 1;
    return acc;
  }, {});
  const total = DISMISSED_FEEDBACK.length;
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  return (
    <div
      className="rounded-lg border p-4"
      style={{ background: t.cardBacking, borderColor: t.border }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <MessageSquareWarning className="w-3 h-3" style={{ color: t.textMuted }} />
          <span
            className="text-[10px] font-black uppercase tracking-[0.18em]"
            style={{ color: t.textMuted }}
          >
            {tr('dismissFeedback.title')}
          </span>
        </div>
        <span className="text-[9px] font-mono" style={{ color: t.textFaint }}>
          {tr('dismissFeedback.subtitle')}
        </span>
      </div>

      {/* tag distribution */}
      <div className="mb-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <BarChart3 className="w-2.5 h-2.5" style={{ color: t.textFaint }} />
          <span className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: t.textFaint }}>
            {tr('dismissFeedback.distribution')}
          </span>
        </div>
        <div className="space-y-1">
          {sorted.map(([tag, n]) => {
            const pct = total === 0 ? 0 : (n / total) * 100;
            return (
              <div key={tag} className="flex items-center gap-2">
                <span
                  className="text-[10px] font-mono shrink-0"
                  style={{ color: t.textBody, minWidth: 150 }}
                >
                  {tr(`dismissModal.reason.${tag}`)}
                </span>
                <div
                  className="flex-1 h-1.5 rounded overflow-hidden"
                  style={{ background: t.borderHair }}
                >
                  <div
                    className="h-full"
                    style={{ width: `${pct}%`, background: t.accent }}
                  />
                </div>
                <span
                  className="text-[10px] font-mono shrink-0 text-right"
                  style={{ color: t.textMuted, minWidth: 30 }}
                >
                  {n}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* recent records */}
      <div
        className="pt-3 border-t"
        style={{ borderColor: t.borderHair }}
      >
        <div className="text-[9px] font-bold uppercase tracking-[0.16em] mb-1.5" style={{ color: t.textFaint }}>
          {tr('dismissFeedback.recent')}
        </div>
        <ul className="space-y-1.5">
          {DISMISSED_FEEDBACK.slice(0, 4).map((r) => (
            <li key={r.candidateId} className="text-sm">
              <div className="flex items-center gap-2">
                <span
                  className="text-2xs font-mono px-1 py-px rounded uppercase tracking-[0.06em]"
                  style={{ background: t.badgeBg, color: t.textMuted }}
                >
                  {tr(`dismissModal.reason.${r.reasonTag}`)}
                </span>
                <span style={{ color: t.textHi }}>{r.candidateTitle}</span>
                <span className="ml-auto text-[9px] font-mono" style={{ color: t.textFaint }}>
                  {ago(r.at, tr)}
                </span>
              </div>
              {r.note && (
                <div className="ml-1 mt-0.5 text-[10px]" style={{ color: t.textMuted }}>
                  → {r.note}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ago(at: number, tr: (key: string, opts?: Record<string, unknown>) => string): string {
  const ms = Date.now() - at;
  const d = ms / (1000 * 60 * 60 * 24);
  if (d < 1) return tr('dismissFeedback.hAgo', { count: Number((d * 24).toFixed(0)) });
  return tr('dismissFeedback.dAgo', { count: Number(d.toFixed(0)) });
}
