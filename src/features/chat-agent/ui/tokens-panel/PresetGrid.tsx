import { type ThemePreset } from '../../model/theme-presets';
import { makeStubTokens } from './colorUtils';

export function ThemePresetGrid({
  tone, label, presets, activeTheme, selectedPresetId, onApply, t,
}: {
  tone: 'dark' | 'light';
  label: string;
  presets: ThemePreset[];
  activeTheme: 'dark' | 'light';
  selectedPresetId: string | null;
  onApply: (preset: ThemePreset) => void;
  t: (key: string, fallback?: string) => string;
}) {
  return (
    <div
      className="rounded-xl border p-3 space-y-2"
      style={{
        background: 'var(--bg-surface-muted)',
        borderColor: 'var(--border-muted)',
      }}
    >
      <div
        className="text-[9px] font-black uppercase tracking-[0.18em]"
        style={{ color: 'var(--fg-muted)' }}
      >
        {label}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {presets.map((preset) => (
          <PresetSwatch
            key={preset.id}
            preset={preset}
            tone={tone}
            label={t(`tokens.themes.${preset.id}`, preset.id)}
            selected={activeTheme === tone && selectedPresetId === preset.id}
            onClick={() => { onApply(preset); }}
          />
        ))}
      </div>
    </div>
  );
}

function PresetSwatch({
  preset, tone, label, selected, onClick,
}: {
  preset: ThemePreset;
  tone: 'dark' | 'light';
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  // Resolve the preset's actual colours by applying it to a minimal stub
  // and reading the relevant tone slice. We only need the swatch chips so
  // the stub is just the matching tone.
  const stub = makeStubTokens();
  const applied = preset.apply(stub).semantic[tone];
  const swatches = [
    applied.bgCanvas,
    applied.bgSurface,
    applied.fgStrong,
    applied.fgLink,
    applied.intentDangerFg,
    applied.intentSuccessFg,
  ];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="text-left p-2 rounded-lg border hover-surface flex flex-col gap-2"
      style={{
        background: 'var(--bg-surface)',
        borderColor: selected ? 'var(--fg-accent)' : 'var(--border-muted)',
        boxShadow: selected ? '0 0 0 1px var(--fg-accent)' : undefined,
      }}
    >
      <div
        className="rounded-md overflow-hidden border"
        style={{
          borderColor: 'var(--border-muted)',
          background: applied.bgCanvas,
        }}
      >
        <div className="flex h-8">
          {swatches.map((c, i) => (
            <span
              key={i}
              className="flex-1"
              style={{ background: c }}
              aria-hidden
            />
          ))}
        </div>
      </div>
      <div
        className="text-[11px] font-semibold leading-tight"
        style={{ color: 'var(--fg-default)' }}
      >
        {label}
      </div>
    </button>
  );
}
