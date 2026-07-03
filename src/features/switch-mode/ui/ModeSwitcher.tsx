import { useRef, useState, useCallback } from 'react';
import { Grid3x3, Sparkles } from 'lucide-react';
import { useViewMode } from '../model/ViewModeContext';
import { useTranslation } from '@shared/i18n';
import { useClickOutside } from '@shared/lib';
import { GlassCard } from '@shared/ui';
import type { ViewModeId } from '@entities/viz-mode';

// Unknown / Cycles used to be standalone modes but they shared the Dot Field
// grid layout exactly — they're really *highlights* over the same scene, not
// separate visual metaphors. They live as heat-overlay metrics now (`unknown`,
// `cycles`); see `entities/metric/lib/heat.ts` and the matching branches in
// DotFieldMode. Universe stays a mode because its zoomable starfield uses a
// different camera and folder-depth layout that the Dot Field can't host.
const MODES: {
  id: ViewModeId;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'dot-field', icon: Grid3x3 },
  { id: 'universe',  icon: Sparkles },
];

export default function ModeSwitcher() {
  const { mode, setMode } = useViewMode();
  const { t } = useTranslation('mode');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = MODES.find((m) => m.id === mode) ?? MODES[0];
  const Icon = current.icon;
  const currentLabel = t(`${current.id}.label`);

  useClickOutside(ref, open, useCallback(() => { setOpen(false); }, []));

  return (
    <div ref={ref} className="relative">
      <GlassCard className="p-1">
        <button type="button"
          onClick={() => { setOpen((v) => !v); }}
          className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors text-[var(--fg-default)] hover:bg-[var(--bg-active)]"
          title={t('switcher.buttonTitle', { label: currentLabel })}
          aria-label={t('switcher.tooltip')}
        >
          <Icon className="w-4 h-4" />
        </button>
      </GlassCard>

      {open && (
        <div className="absolute left-0 mt-2 w-[260px]">
          <GlassCard className="p-2">
            <div className="text-2xs font-black uppercase tracking-eyebrow mb-1.5 px-1.5 text-[var(--fg-subtle)]">
              {t('switcher.heading')}
            </div>
            <div className="space-y-0.5">
              {MODES.map(({ id, icon: I }) => {
                const active = mode === id;
                const label = t(`${id}.label`);
                const hint = t(`${id}.hint`);
                return (
                  <button type="button"
                    key={id}
                    onClick={() => { setMode(id); setOpen(false); }}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
                      active
                        ? 'bg-[var(--bg-selected)] text-[var(--fg-strong)]'
                        : 'hover:bg-[var(--bg-active)] text-[var(--fg-default)]'
                    }`}
                  >
                    <I className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-[var(--intent-success-vivid)]' : ''}`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold leading-tight">{label}</div>
                      <div className="text-2xs leading-tight truncate text-[var(--fg-subtle)]">
                        {hint}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
