import { useOverlay } from '../model/OverlayContext';
import { useTheme } from '@shared/theme';
import { useTranslation } from '@shared/i18n';
import { GlassCard } from '@shared/ui';
import type { TimeWindow } from '@entities/repo';

const WINDOWS: readonly TimeWindow[] = ['7d', '30d', '90d'] as const;

// TODO(i18n): wire `overlay.timeWindow.*` keys when translations land.
export default function TimeWindowPicker() {
  const { isDark } = useTheme();
  const { t } = useTranslation('overlay');
  const ov = useOverlay();
  const enabled = ov.metric === 'time-hotspot';

  const labelText = t('timeWindow.label') ?? 'Window';
  const hintText = t('timeWindow.disabledHint') ?? "Pick 'Hotspot (time)' first";

  return (
    <GlassCard className="p-2">
      <div
        className={`text-[9px] font-black uppercase tracking-[0.18em] mb-1.5 px-1 ${
          isDark ? 'text-white/40' : 'text-black/40'
        }`}
      >
        {labelText}
      </div>
      <div
        className={`flex items-center gap-1 ${enabled ? '' : 'opacity-40 pointer-events-none'}`}
        aria-disabled={!enabled}
      >
        {WINDOWS.map((w) => {
          const active = ov.timeWindow === w;
          const days = w.replace('d', '');
          return (
            <button
              key={w}
              type="button"
              onClick={() => { ov.setTimeWindow(w); }}
              aria-pressed={active}
              aria-label={`${days}-day window`}
              disabled={!enabled}
              className={`relative px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-[0.18em] transition-colors ${
                active
                  ? (isDark ? 'bg-white/15 text-white' : 'bg-black/10 text-black')
                  : (isDark ? 'text-white/70 hover:bg-white/5' : 'text-black/70 hover:bg-black/5')
              }`}
            >
              {w}
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute left-2 right-2 -bottom-[1px] h-[2px] rounded-full"
                  style={{ background: '#5fa86c', boxShadow: '0 0 6px #5fa86c' }}
                />
              )}
            </button>
          );
        })}
      </div>
      {!enabled && (
        <div
          className={`mt-1.5 px-1 text-[9px] leading-tight ${
            isDark ? 'text-white/40' : 'text-black/40'
          }`}
        >
          {hintText}
        </div>
      )}
    </GlassCard>
  );
}
