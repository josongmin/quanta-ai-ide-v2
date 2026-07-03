import { useTranslation } from '@shared/i18n';
import { useVfx } from '../tokens';

function confidenceKey(v: number): string {
  if (v >= 0.9)  return 'trust.confidence.strong';
  if (v >= 0.75) return 'trust.confidence.sound';
  if (v >= 0.5)  return 'trust.confidence.mixed';
  return 'trust.confidence.weak';
}

export function ConfidenceDial({ value }: { value: number }) {
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
          <span className="text-xl font-black font-mono" style={{ color }}>{pct}</span>
          <span className="text-2xs font-bold uppercase tracking-[0.12em]" style={{ color: t.textFaint }}>
            {tr('trust.conf')}
          </span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold uppercase tracking-eyebrow" style={{ color: t.textFaint }}>
          {tr('trust.patchConfidence')}
        </div>
        <div className="text-sm mt-0.5 leading-snug" style={{ color: t.textBody }}>
          {tr(confidenceKey(value))}
        </div>
      </div>
    </div>
  );
}
