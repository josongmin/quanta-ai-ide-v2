import { ShieldAlert, TestTube, User, Wrench, type LucideIcon } from 'lucide-react';
import { useOverlay } from '../model/OverlayContext';
import { useTheme } from '@shared/theme';
import { GlassCard } from '@shared/ui';
import type { RiskLensKey } from '@entities/repo';

type LensDef = {
  key: RiskLensKey;
  Icon: LucideIcon;
  label: string;
  hint: string;
};

const LENSES: readonly LensDef[] = [
  {
    key: 'security',
    Icon: ShieldAlert,
    label: 'Security',
    hint: 'SAST × secrets × vulnerable status',
  },
  {
    key: 'testGaps',
    Icon: TestTube,
    label: 'Test gaps',
    hint: 'Big files × low coverage × no test',
  },
  {
    key: 'busFactor',
    Icon: User,
    label: 'Bus factor',
    hint: 'Single-author × high incoming refs',
  },
  {
    key: 'techDebt',
    Icon: Wrench,
    label: 'Tech debt',
    hint: 'Complexity × low edit-safety × churn',
  },
] as const;

export default function RiskLensSwitcher() {
  const { isDark } = useTheme();
  const ov = useOverlay();
  const active = ov.riskLens;
  const activeDef = LENSES.find((l) => l.key === active) ?? null;

  const handleClick = (key: RiskLensKey) => {
    ov.setRiskLens(active === key ? null : key);
  };

  return (
    <GlassCard className="p-2">
      <div
        className={`text-[9px] font-black uppercase tracking-[0.18em] mb-1.5 px-1 ${
          isDark ? 'text-white/40' : 'text-black/40'
        }`}
      >
        Risk lens
      </div>
      <div className="flex items-center gap-1" role="group" aria-label="Risk lens">
        {LENSES.map(({ key, Icon, label }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => { handleClick(key); }}
              aria-pressed={isActive}
              aria-label={label}
              className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-[0.18em] transition-colors ${
                isActive
                  ? (isDark ? 'bg-white/15 text-white' : 'bg-black/10 text-black')
                  : (isDark ? 'text-white/70 hover:bg-white/5' : 'text-black/70 hover:bg-black/5')
              }`}
            >
              <Icon className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{label}</span>
              {isActive && (
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
      {activeDef && (
        <div
          className={`mt-1.5 px-1 text-[9px] leading-tight ${
            isDark ? 'text-white/40' : 'text-black/40'
          }`}
        >
          {activeDef.hint}
        </div>
      )}
    </GlassCard>
  );
}
