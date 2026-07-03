import { useTranslation } from '@shared/i18n';
import { useVfx } from '../tokens';

export function DeliveryGate({ gateDecision, gateReason }: { gateDecision: string; gateReason: string }) {
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
          className="text-2xs font-bold uppercase tracking-eyebrow px-1.5 py-0.5 rounded"
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
