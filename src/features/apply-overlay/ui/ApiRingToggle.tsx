import { Radar } from 'lucide-react';
import { useOverlay } from '../model/OverlayContext';
import { useTheme } from '@shared/theme';
import { GlassCard } from '@shared/ui';

export default function ApiRingToggle() {
  const { isDark } = useTheme();
  const ov = useOverlay();
  const active = ov.apiRing;

  return (
    <GlassCard className="p-2">
      <button
        type="button"
        onClick={() => { ov.setApiRing(!active); }}
        aria-pressed={active}
        aria-label="Public API ring"
        title="Show files widely consumed externally"
        className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-[0.18em] transition-colors ${
          active
            ? ('bg-[color:var(--bg-active-strong)] text-[color:var(--fg-on-active-strong)]')
            : (isDark ? 'text-white/70 hover:bg-white/5' : 'text-black/70 hover:bg-black/5')
        }`}
      >
        <Radar className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Public API</span>
        {active && (
          <span
            aria-hidden="true"
            className="absolute left-2 right-2 -bottom-[1px] h-[2px] rounded-full"
            style={{ background: '#5fa86c', boxShadow: '0 0 6px #5fa86c' }}
          />
        )}
      </button>
    </GlassCard>
  );
}
