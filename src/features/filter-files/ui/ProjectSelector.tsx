import { useRef, useState } from 'react';
import { ChevronDown, Flame, ShieldAlert, Skull, FileWarning, FolderGit2, X } from 'lucide-react';
import { useFilterFacets, useFilterActions } from '@entities/filter-state';
import { useTranslation } from '@shared/i18n';
import { useClickOutside } from '@shared/lib';
import { GlassCard } from '@shared/ui';
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

// Top-of-sidebar "project switcher" surface. The default chip shows the
// project (workspace) name; the dropdown contains the saved-query presets.
// The active preset becomes the visible label so the user can always see
// which lens is on without opening the menu.
export default function ProjectSelector() {
  const { t } = useTranslation('filter');
  const { t: ti } = useTranslation('inspect');
  const { state } = useFilterFacets();
  const { applyPreset } = useFilterActions();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useClickOutside(ref, open, () => { setOpen(false); });

  const activePreset = PRESETS.find((p) => p.key === state.preset) ?? null;
  const projectName = ti('header.workspaceName');

  return (
    <div ref={ref} className="relative">
      <GlassCard className="p-1" style={{ boxShadow: 'none' }}>
        <button
          type="button"
          onClick={() => { setOpen((v) => !v); }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors hover:bg-[color:var(--bg-hover)]"
        >
          {activePreset ? (
            <activePreset.icon className="w-3.5 h-3.5 shrink-0 text-[color:var(--fg-accent)]" />
          ) : (
            <FolderGit2 className="w-3.5 h-3.5 shrink-0 text-[color:var(--fg-muted)]" />
          )}
          <div className="min-w-0 flex-1">
            <div className={`text-sm font-bold truncate leading-tight ${
              activePreset
                ? 'text-[color:var(--fg-accent)]'
                : 'text-[color:var(--fg-strong)]'
            }`}>
              {activePreset ? t(`preset.${activePreset.i18nKey}.label`) : projectName}
            </div>
            <div className="text-2xs font-mono truncate leading-tight mt-0.5 text-[color:var(--fg-subtle)]">
              {activePreset ? t(`preset.${activePreset.i18nKey}.hint`) : t('selector.subtitle')}
            </div>
          </div>
          {activePreset ? (
            <button
              type="button"
              aria-label={t('selector.clearPreset')}
              onClick={(e) => { e.stopPropagation(); applyPreset(null); }}
              className="shrink-0 p-1 rounded-md transition-colors text-[color:var(--fg-subtle)] hover:text-[color:var(--fg-strong)] hover:bg-[color:var(--bg-active)]"
            >
              <X className="w-3 h-3" />
            </button>
          ) : (
            <ChevronDown
              className={`shrink-0 w-3.5 h-3.5 transition-transform text-[color:var(--fg-subtle)] ${open ? 'rotate-180' : ''}`}
            />
          )}
        </button>
      </GlassCard>

      {open && (
        <div className="absolute left-0 right-0 mt-1 z-10">
          <GlassCard className="p-1.5">
            <div className="text-2xs font-black uppercase tracking-eyebrow mb-1 px-1.5 pt-0.5 text-[color:var(--fg-subtle)]">
              {t('section.savedQueries')}
            </div>
            <div className="space-y-0.5">
              {PRESETS.map((p) => {
                const active = state.preset === p.key;
                const Icon = p.icon;
                const label = t(`preset.${p.i18nKey}.label`);
                const hint = t(`preset.${p.i18nKey}.hint`);
                return (
                  <button type="button"
                    key={p.key}
                    onClick={() => { applyPreset(active ? null : p.key); setOpen(false); }}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors ${
                      active
                        ? '[background:color-mix(in_srgb,var(--fg-accent)_15%,transparent)]'
                        : 'hover:bg-[color:var(--bg-hover)]'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-[color:var(--fg-accent)]' : 'text-[color:var(--fg-muted)]'}`} />
                    <span className={`text-sm font-bold flex-1 truncate ${
                      active ? 'text-[color:var(--fg-accent)]' : 'text-[color:var(--fg-strong)]'
                    }`}>
                      {label}
                    </span>
                    <span className="text-2xs font-mono truncate text-[color:var(--fg-subtle)]">
                      {hint}
                    </span>
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
