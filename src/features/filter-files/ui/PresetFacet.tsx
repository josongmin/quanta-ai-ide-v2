import { Flame, ShieldAlert, Skull, FileWarning } from 'lucide-react';
import { useFilterFacets, useFilterActions } from '../model/FilterContext';
import { useTheme } from '@shared/theme';
import { useTranslation } from '@shared/i18n';
import type { PresetKey } from '@entities/repo';

const PRESETS: {
  key: Exclude<PresetKey, null>;
  icon: React.ComponentType<{ className?: string }>;
  i18nKey: string;
}[] = [
  { key: 'hotspot',         icon: Flame,        i18nKey: 'hotspot' },
  { key: 'vulnerable-hub',  icon: ShieldAlert,  i18nKey: 'vulnerableHub' },
  { key: 'stale',           icon: Skull,        i18nKey: 'stale' },
  { key: 'long-files',      icon: FileWarning,  i18nKey: 'longFiles' },
];

// Compact (icon-only) variant is used when the preset row is inlined into
// another card's header — saves vertical space and turns saved queries into
// a quick filter strip rather than a full menu.
export default function PresetFacet({ compact = false }: { compact?: boolean } = {}) {
  const { isDark } = useTheme();
  const { t } = useTranslation('filter');
  const { state } = useFilterFacets();
  const { applyPreset } = useFilterActions();

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {PRESETS.map((p) => {
          const active = state.preset === p.key;
          const Icon = p.icon;
          const label = t(`preset.${p.i18nKey}.label`);
          const hint = t(`preset.${p.i18nKey}.hint`);
          return (
            <button type="button"
              key={p.key}
              onClick={() => { applyPreset(active ? null : p.key); }}
              title={`${label} — ${hint}`}
              aria-label={label}
              className={`p-1.5 rounded-md transition-colors ${
                active
                  ? 'bg-[#4f9a5c]/20 text-[#4f9a5c] ring-1 ring-[#4f9a5c]/40'
                  : isDark
                    ? 'text-white/40 hover:text-white/85 hover:bg-white/5'
                    : 'text-black/40 hover:text-black/70 hover:bg-black/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {PRESETS.map((p) => {
        const active = state.preset === p.key;
        const Icon = p.icon;
        const label = t(`preset.${p.i18nKey}.label`);
        const hint = t(`preset.${p.i18nKey}.hint`);
        return (
          <button type="button"
            key={p.key}
            onClick={() => { applyPreset(active ? null : p.key); }}
            title={hint}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors ${
              active
                ? (isDark ? 'bg-[#4f9a5c]/15 text-white' : 'bg-[#4f9a5c]/15 text-black')
                : (isDark ? 'hover:bg-white/5 text-white/70' : 'hover:bg-black/5 text-black/70')
            }`}
          >
            <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-[#4f9a5c]' : isDark ? 'text-white/55' : 'text-black/40'}`} />
            <span className="text-[11px] font-bold tracking-wide flex-1 truncate">{label}</span>
            <span className={`text-[9px] font-mono truncate ${
              active
                ? (isDark ? 'text-white/55' : 'text-black/55')
                : (isDark ? 'text-white/30' : 'text-black/30')
            }`}>
              {hint}
            </span>
          </button>
        );
      })}
    </div>
  );
}
