import { Sun, Moon, Monitor, Sparkles, Type, Eye, Check } from 'lucide-react';
import { useTheme } from '@shared/theme';
import { MeShell } from '../parts/MeShell';
import { Section, Row, Toggle, Divider, SaveBar } from '@shared/ui/forms';
import { useDirtyState } from '../lib/useDirtyState';

type ThemeMode = 'light' | 'dark' | 'system';
type Density = 'compact' | 'comfortable' | 'roomy';
type FontScale = 'sm' | 'md' | 'lg';
type Accent = 'cobalt' | 'amber' | 'violet' | 'crimson' | 'mint';

type Appearance = {
  themeMode: ThemeMode;
  accent: Accent;
  density: Density;
  fontScale: FontScale;
  reducedMotion: boolean;
  highContrast: boolean;
  monoFont: 'jetbrains' | 'sf-mono' | 'fira' | 'system';
  syntaxTheme: 'dim' | 'midnight' | 'paper' | 'solarized';
};

const INITIAL: Appearance = {
  themeMode: 'system',
  accent: 'cobalt',
  density: 'comfortable',
  fontScale: 'md',
  reducedMotion: false,
  highContrast: false,
  monoFont: 'jetbrains',
  syntaxTheme: 'dim',
};

export default function AppearancePage() {
  const { isDark, toggle } = useTheme();
  const { draft, setDraft, dirty, savingState, save, discard } = useDirtyState(INITIAL);

  return (
    <MeShell
      title="Appearance"
      subtitle="Theme, density, motion, and accent. Most changes apply instantly so you can preview before saving."
    >
      <Section title="Theme" hint="Light, dark, or follow your operating system.">
        <ThemePicker
          value={draft.themeMode}
          onChange={(v) => {
            setDraft({ ...draft, themeMode: v });
            if (v === 'light' && isDark)  toggle();
            if (v === 'dark'  && !isDark) toggle();
          }}
        />
      </Section>

      <Section title="Accent color" hint="Used on primary CTAs, current-state markers, and the dot field hero color.">
        <AccentPicker
          value={draft.accent}
          onChange={(v) => { setDraft({ ...draft, accent: v }); }}
        />
      </Section>

      <Section title="Density" hint="How much space to give each row in dense lists like reviews and the file panel.">
        <DensityPicker
          value={draft.density}
          onChange={(v) => { setDraft({ ...draft, density: v }); }}
        />
      </Section>

      <Section title="Text" hint="Font scale and monospace family for code. Affects diffs and inline code blocks.">
        <Row label="Font scale" sub="Small (12px) · Medium (13px, default) · Large (15px) base.">
          <FontScaleToggle value={draft.fontScale} onChange={(v) => { setDraft({ ...draft, fontScale: v }); }} />
        </Row>
        <Row label="Monospace font" sub="Used in code, file paths, IDs.">
          <MonoFontPicker value={draft.monoFont} onChange={(v) => { setDraft({ ...draft, monoFont: v }); }} />
        </Row>
        <Row label="Syntax theme" sub="Color scheme inside diff hunks and code blocks.">
          <SyntaxPicker value={draft.syntaxTheme} onChange={(v) => { setDraft({ ...draft, syntaxTheme: v }); }} />
        </Row>
      </Section>

      <Section title="Accessibility" hint="Reduce visual noise where it gets in the way.">
        <Row label="Reduce motion" sub="Disables non-essential animations (panels, particles, transitions).">
          <Toggle checked={draft.reducedMotion} onChange={(v) => { setDraft({ ...draft, reducedMotion: v }); }} label="Reduce motion" />
        </Row>
        <Row label="High contrast" sub="Increases border contrast and removes muted text variants.">
          <Toggle checked={draft.highContrast} onChange={(v) => { setDraft({ ...draft, highContrast: v }); }} label="High contrast" />
        </Row>
      </Section>

      <Section title="Preview" hint="What a typical row looks like with your current selections.">
        <LivePreview settings={draft} />
      </Section>

      <Divider />

      <SaveBar visible={true} dirty={dirty} savingState={savingState} onSave={save} onDiscard={discard} />
    </MeShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Theme picker — 3 visual cards

function ThemePicker({ value, onChange }: { value: ThemeMode; onChange: (v: ThemeMode) => void }) {
  const opts: { id: ThemeMode; label: string; icon: React.ComponentType<{ className?: string }>; }[] = [
    { id: 'light',  label: 'Light',  icon: Sun },
    { id: 'dark',   label: 'Dark',   icon: Moon },
    { id: 'system', label: 'System', icon: Monitor },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {opts.map((o) => {
        const active = value === o.id;
        const Icon = o.icon;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => { onChange(o.id); }}
            className="flex flex-col gap-2 p-3 rounded-md transition-colors"
            style={{
              background: active ? 'var(--bg-active)' : 'var(--bg-surface-muted)',
              border: `1px solid ${active ? 'var(--fg-accent)' : 'var(--border-muted)'}`,
            }}
          >
            <ThemeMockup mode={o.id} />
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[12px] font-semibold"
                style={{ color: active ? 'var(--fg-strong)' : 'var(--fg-default)' }}
              >
                <Icon className="w-3.5 h-3.5" />
                {o.label}
              </span>
              {active && <Check className="w-3.5 h-3.5" style={{ color: 'var(--fg-accent)' }} />}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function ThemeMockup({ mode }: { mode: ThemeMode }) {
  const bg = mode === 'light' ? '#ffffff' : mode === 'dark' ? '#0a0d12' : 'linear-gradient(90deg, #ffffff 50%, #0a0d12 50%)';
  const fg = mode === 'light' ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.9)';
  const muted = mode === 'light' ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.55)';
  return (
    <div
      className="aspect-video w-full rounded overflow-hidden"
      style={{ background: bg, border: '1px solid var(--border-muted)' }}
    >
      <div className="w-full h-full p-2 flex flex-col gap-1">
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#ff5f57' }} />
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#febc2e' }} />
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#28c840' }} />
        </div>
        <div className="h-1.5 rounded" style={{ background: mode === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)', width: '60%' }} />
        <div className="h-1 rounded" style={{ background: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', width: '85%' }} />
        <div className="h-1 rounded" style={{ background: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', width: '70%' }} />
        <div className="flex-1 flex items-end gap-1">
          <span className="w-2 h-2 rounded-full" style={{ background: '#4F5BFF' }} />
          <span className="text-[6px]" style={{ color: muted }}>se · field</span>
          <span className="flex-1" />
          <span className="text-[6px]" style={{ color: fg }}>view</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Accent picker — 5 swatches

function AccentPicker({ value, onChange }: { value: Accent; onChange: (v: Accent) => void }) {
  const opts: { id: Accent; label: string; color: string }[] = [
    { id: 'cobalt',  label: 'Cobalt indigo', color: '#4F5BFF' },
    { id: 'violet',  label: 'Violet',         color: '#8B5CF6' },
    { id: 'amber',   label: 'Amber',          color: '#F59E0B' },
    { id: 'crimson', label: 'Crimson',        color: '#DC2626' },
    { id: 'mint',    label: 'Mint',           color: '#10B981' },
  ];
  return (
    <div className="grid grid-cols-5 gap-2">
      {opts.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => { onChange(o.id); }}
            className="flex flex-col items-center gap-2 p-3 rounded-md transition-colors"
            style={{
              background: active ? 'var(--bg-active)' : 'var(--bg-surface-muted)',
              border: `1px solid ${active ? o.color : 'var(--border-muted)'}`,
            }}
          >
            <span
              className="w-7 h-7 rounded-full transition-shadow"
              style={{
                background: o.color,
                boxShadow: active ? `0 0 0 4px ${o.color}33` : 'none',
              }}
            />
            <span
              className="text-[11px] font-medium"
              style={{ color: active ? 'var(--fg-strong)' : 'var(--fg-muted)' }}
            >
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Density picker — visual rows

function DensityPicker({ value, onChange }: { value: Density; onChange: (v: Density) => void }) {
  const opts: { id: Density; label: string; rows: number; gap: string }[] = [
    { id: 'compact',     label: 'Compact',     rows: 6, gap: '4px' },
    { id: 'comfortable', label: 'Comfortable', rows: 4, gap: '8px' },
    { id: 'roomy',       label: 'Roomy',       rows: 3, gap: '12px' },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {opts.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => { onChange(o.id); }}
            className="flex flex-col gap-2 p-3 rounded-md transition-colors"
            style={{
              background: active ? 'var(--bg-active)' : 'var(--bg-surface-muted)',
              border: `1px solid ${active ? 'var(--fg-accent)' : 'var(--border-muted)'}`,
            }}
          >
            <div
              className="aspect-video w-full rounded p-2 flex flex-col"
              style={{
                background: 'var(--bg-canvas)',
                border: '1px solid var(--border-muted)',
                gap: o.gap,
              }}
            >
              {Array.from({ length: o.rows }).map((_, i) => (
                <div
                  key={i}
                  className="h-1 rounded"
                  style={{ background: 'var(--border-default)' }}
                />
              ))}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold"
                style={{ color: active ? 'var(--fg-strong)' : 'var(--fg-default)' }}
              >
                {o.label}
              </span>
              {active && <Check className="w-3.5 h-3.5" style={{ color: 'var(--fg-accent)' }} />}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Font scale 3-stop toggle

function FontScaleToggle({ value, onChange }: { value: FontScale; onChange: (v: FontScale) => void }) {
  const opts: { id: FontScale; label: string; size: string }[] = [
    { id: 'sm', label: 'Aa', size: '11px' },
    { id: 'md', label: 'Aa', size: '13px' },
    { id: 'lg', label: 'Aa', size: '15px' },
  ];
  return (
    <div className="inline-flex items-center p-0.5 rounded-md"
      style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-muted)' }}
    >
      {opts.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => { onChange(o.id); }}
            className="h-7 px-3 rounded transition-colors flex items-center gap-1"
            style={{
              background: active ? 'var(--bg-canvas)' : 'transparent',
              color: active ? 'var(--fg-strong)' : 'var(--fg-muted)',
              boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              fontSize: o.size,
              fontWeight: 600,
            }}
          >
            <Type className="w-3 h-3" />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function MonoFontPicker({
  value, onChange,
}: { value: Appearance['monoFont']; onChange: (v: Appearance['monoFont']) => void }) {
  const opts: { id: Appearance['monoFont']; label: string; sample: string }[] = [
    { id: 'jetbrains', label: 'JetBrains Mono',  sample: 'function() { ... }' },
    { id: 'sf-mono',   label: 'SF Mono',         sample: 'function() { ... }' },
    { id: 'fira',      label: 'Fira Code',       sample: 'function() { ... }' },
    { id: 'system',    label: 'System default',  sample: 'function() { ... }' },
  ];
  return (
    <select
      value={value}
      onChange={(e) => { onChange(e.target.value as Appearance['monoFont']); }}
      className="h-8 rounded-md px-2.5 text-[12px] outline-none cursor-pointer"
      style={{
        background: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-default)',
        color: 'var(--fg-strong)',
        minWidth: 200,
      }}
    >
      {opts.map((o) => <option key={o.id} value={o.id}>{o.label} · {o.sample}</option>)}
    </select>
  );
}

function SyntaxPicker({
  value, onChange,
}: { value: Appearance['syntaxTheme']; onChange: (v: Appearance['syntaxTheme']) => void }) {
  const opts: { id: Appearance['syntaxTheme']; label: string }[] = [
    { id: 'dim',       label: 'Dim'        },
    { id: 'midnight',  label: 'Midnight'   },
    { id: 'paper',     label: 'Paper'      },
    { id: 'solarized', label: 'Solarized'  },
  ];
  return (
    <select
      value={value}
      onChange={(e) => { onChange(e.target.value as Appearance['syntaxTheme']); }}
      className="h-8 rounded-md px-2.5 text-[12px] outline-none cursor-pointer"
      style={{
        background: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-default)',
        color: 'var(--fg-strong)',
      }}
    >
      {opts.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
    </select>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Live preview — fake review row + tiny code diff

function LivePreview({ settings }: { settings: Appearance }) {
  const fontScale = settings.fontScale === 'sm' ? 0.85 : settings.fontScale === 'lg' ? 1.18 : 1;
  const rowGap = settings.density === 'compact' ? 6 : settings.density === 'roomy' ? 14 : 10;
  return (
    <div
      className="rounded-md p-4 flex flex-col"
      style={{
        background: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-muted)',
        gap: rowGap,
        fontSize: `${13 * fontScale}px`,
      }}
    >
      <div className="flex items-center gap-2 onb-stagger">
        <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--fg-accent)' }} />
        <span className="font-semibold" style={{ color: 'var(--fg-strong)' }}>
          PR #4821 · Add admission rule for SSO-only prod
        </span>
        <span
          className="text-[10px] uppercase tracking-[0.14em] font-semibold px-1.5 py-0.5 rounded ml-auto"
          style={{ background: 'color-mix(in srgb, var(--fg-accent) 14%, transparent)', color: 'var(--fg-accent)' }}
        >
          Approved
        </span>
      </div>
      <span style={{ color: 'var(--fg-muted)' }}>
        Reviewed 4 files. 3 reviewers approved. Ready to merge once admission re-runs.
      </span>
      <pre
        className="rounded p-2 font-mono"
        style={{
          background: 'var(--bg-canvas)',
          border: '1px solid var(--border-muted)',
          fontSize: `${11 * fontScale}px`,
          color: 'var(--fg-default)',
          margin: 0,
        }}
      >
        <code>
          <span style={{ color: 'var(--intent-success-fg)' }}>+ allow:   sso</span>{'\n'}
          <span style={{ color: 'var(--intent-danger-fg)' }}>- enforce: false</span>{'\n'}
          <span>  match:</span>{'\n'}
          <span>    branch: main</span>
        </code>
      </pre>
      <div className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
        <Eye className="w-3 h-3" /> Preview rendered with your current selections
      </div>
    </div>
  );
}
