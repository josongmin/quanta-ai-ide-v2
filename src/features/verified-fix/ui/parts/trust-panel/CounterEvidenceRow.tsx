import { useTranslation } from '@shared/i18n';
import type { CounterEvidence } from '../../../model/types';
import { useVfx } from '../tokens';

export function CounterEvidenceRow({ item }: { item: CounterEvidence }) {
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
          className="text-2xs font-bold uppercase tracking-eyebrow px-1 py-px rounded font-mono"
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
