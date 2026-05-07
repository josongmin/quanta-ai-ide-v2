import { useEffect, useRef, useState } from 'react';
import { Flame } from 'lucide-react';
import { useOverlay } from '../model/OverlayContext';
import { useTheme } from '@shared/theme';
import { useTranslation } from '@shared/i18n';
import { HEAT_METRICS, findMetric, type HeatMetricKey } from '@entities/metric';
import { GlassCard } from '@shared/ui';

export default function HeatOverlayPicker() {
  const { isDark } = useTheme();
  const ov = useOverlay();
  const { t } = useTranslation('overlay');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = findMetric(ov.metric);
  const isOn = ov.metric !== 'none';

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', handler);
    return () => { window.removeEventListener('mousedown', handler); };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <GlassCard className="p-1">
        <button type="button"
          onClick={() => { setOpen((v) => !v); }}
          className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
            isOn
              ? (isDark ? 'bg-white/10 text-white' : 'bg-black/10 text-black')
              : (isDark ? 'text-white/55 hover:bg-white/5' : 'text-black/55 hover:bg-black/5')
          }`}
          title={t('buttonTitle', { label: current.label })}
          aria-label={t('title')}
        >
          <Flame className={`w-4 h-4 ${isOn ? 'text-[#d98a85]' : ''}`} />
        </button>
      </GlassCard>

      {open && (
        <div className="absolute left-0 top-full mt-2 z-30">
          <GlassCard className="p-2 w-[280px]">
            <div className={`text-[9px] font-black uppercase tracking-[0.18em] mb-1.5 px-1.5 ${
              isDark ? 'text-white/40' : 'text-black/40'
            }`}>
              {t('metric')}
            </div>
            <div className="space-y-0.5">
              {HEAT_METRICS.map((m) => (
                <Row key={m.key}
                     active={ov.metric === m.key}
                     onClick={() => { ov.setMetric(m.key); }}
                     label={m.label} hint={m.hint} hue={m.hue}
                     isDark={isDark}
                />
              ))}
            </div>
            {isOn && (
              <div className={`mt-2 pt-2 border-t space-y-2 ${isDark ? 'border-white/10' : 'border-black/10'}`}>
                <Slider label={t('controls.intensity')} value={ov.intensity} onChange={ov.setIntensity} isDark={isDark} />
                <Slider label={t('controls.radius')}    value={ov.radius}    onChange={ov.setRadius}    isDark={isDark} />
                <Slider label={t('controls.threshold')} value={ov.threshold} onChange={ov.setThreshold} isDark={isDark} />
              </div>
            )}
          </GlassCard>
        </div>
      )}
    </div>
  );
}

function Row({
  active, onClick, label, hint, hue, isDark,
}: {
  active: boolean; onClick: () => void;
  label: string; hint: string; hue: string; isDark: boolean;
}) {
  return (
    <button type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
        active
          ? (isDark ? 'bg-white/15 text-white' : 'bg-black/10 text-black')
          : (isDark ? 'hover:bg-white/5 text-white/70' : 'hover:bg-black/5 text-black/70')
      }`}
    >
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ background: hue, boxShadow: active ? `0 0 8px ${hue}` : 'none' }}
      />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-bold leading-tight">{label}</div>
        <div className={`text-[9px] leading-tight ${isDark ? 'text-white/40' : 'text-black/40'} truncate`}>
          {hint}
        </div>
      </div>
    </button>
  );
}

function Slider({
  label, value, onChange, isDark,
}: {
  label: string; value: number; onChange: (v: number) => void; isDark: boolean;
}) {
  return (
    <div className="px-1.5">
      <div className={`flex justify-between text-[9px] font-bold uppercase tracking-[0.18em] mb-1 ${
        isDark ? 'text-white/55' : 'text-black/55'
      }`}>
        <span>{label}</span>
        <span className="font-mono tabular-nums">{value.toFixed(2)}</span>
      </div>
      <input
        type="range" min={0} max={1} step={0.01}
        value={value}
        onChange={(e) => { onChange(+e.target.value); }}
        className="w-full accent-[#d98a85]"
      />
    </div>
  );
}

// Eslint helper — keep imports active
export type { HeatMetricKey };
