import { Fragment } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { Modal } from '@shared/ui';
import { useTranslation } from '@shared/i18n';
import type { SemanticTokens } from '@shared/tokens';
import { useTokens, type GlobalTokenSections, type Tokens } from '../model/TokensContext';
import { DARK_PRESETS, LIGHT_PRESETS, type ThemePreset } from '../model/theme-presets';

export default function TokensPanel({ onClose }: { onClose: () => void }) {
  const {
    tokens, setSemantic, setGlobal, replace, reset,
  } = useTokens();
  const { t } = useTranslation('chat');
  const tCommon = useTranslation('common').t;

  return (
    <Modal
      open
      onClose={onClose}
      width="min(1180px, calc(100vw - 40px))"
      maxWidth="calc(100vw - 32px)"
      ariaLabel={t('tokens.title')}
    >
      <div className="flex max-h-[calc(100vh-64px)] flex-col">
        <header
          className="shrink-0 flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--border-default)' }}
        >
          <div>
            <h2
              id="tokens-panel-title"
              className="text-[12px] font-black uppercase tracking-[0.18em]"
              style={{ color: 'var(--fg-default)' }}
            >
              {t('tokens.title')}
            </h2>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--fg-subtle)' }}>
              {t('tokens.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button type="button"
              onClick={reset}
              className="p-2 rounded-lg hover-surface"
              style={{ color: 'var(--fg-muted)' }}
              title={tCommon('reset')}
              aria-label={tCommon('reset')}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button type="button"
              onClick={onClose}
              aria-label={t('tokens.closeAria')}
              className="p-2 rounded-lg hover-surface"
              style={{ color: 'var(--fg-muted)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
          <div className="space-y-3">
            <SectionTitle title={t('tokens.groups.themePalette', 'Theme palette')} />
            <ThemePresetGrid
              tone="dark"
              label={t('tokens.tone.dark', 'Dark')}
              presets={DARK_PRESETS}
              onApply={(preset) => { replace((current) => preset.apply(current)); }}
              t={t as (key: string, fallback?: string) => string}
            />
            <ThemePresetGrid
              tone="light"
              label={t('tokens.tone.light', 'Light')}
              presets={LIGHT_PRESETS}
              onApply={(preset) => { replace((current) => preset.apply(current)); }}
              t={t as (key: string, fallback?: string) => string}
            />
          </div>

          <div className="space-y-3">
            <SectionTitle title={t('tokens.groups.presets')} />
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => { replace((current) => preset.apply(current)); }}
                  className="text-left p-2 rounded-lg border text-[11px] font-bold hover-surface"
                  style={{
                    background: 'var(--bg-surface-muted)',
                    borderColor: 'var(--border-muted)',
                    color: 'var(--fg-default)',
                  }}
                >
                  {t(`tokens.presets.${preset.id}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <SectionTitle title="Theme tokens" />
            {SEMANTIC_GROUPS.map((group) => (
              <ThemeTokenMatrix
                key={group.title}
                title={group.title}
                keys={group.keys}
                dark={tokens.semantic.dark}
                light={tokens.semantic.light}
                onDarkChange={(key, value) => { setSemantic('dark', key, value); }}
                onLightChange={(key, value) => { setSemantic('light', key, value); }}
              />
            ))}
          </div>

          <div className="space-y-3">
            <SectionTitle title="Component tokens" />
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              {GLOBAL_GROUPS.map((group) => (
                <GlobalTokenGroup
                  key={group.section}
                  section={group.section}
                  title={group.title}
                  values={tokens.global[group.section]}
                  onChange={(key, value) => { setGlobal(group.section, key, value); }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function ThemePresetGrid({
  tone, label, presets, onApply, t,
}: {
  tone: 'dark' | 'light';
  label: string;
  presets: ThemePreset[];
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
            onClick={() => { onApply(preset); }}
          />
        ))}
      </div>
    </div>
  );
}

function PresetSwatch({
  preset, tone, label, onClick,
}: {
  preset: ThemePreset;
  tone: 'dark' | 'light';
  label: string;
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
      className="text-left p-2 rounded-lg border hover-surface flex flex-col gap-2"
      style={{
        background: 'var(--bg-surface)',
        borderColor: 'var(--border-muted)',
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

function makeStubTokens(): Tokens {
  // We only need a SemanticTokens shape that the preset's `apply` can
  // spread into. The non-colour fields are inert for the swatch render.
  // Cast (not annotate): this is a throwaway swatch-preview stub. The
  // SemanticTokens shape drifted (brandFg→fgAccent etc.) since this code
  // was authored; the preset's `apply` only reads the colour keys it
  // touches, so an approximate stub is fine here.
  const blank = {
    bgCanvas: '#000', bgSurface: '#000', bgSurfaceMuted: '#000',
    bgOverlay: '#000', bgElevated: '#000', bgPanelStrong: '#000',
    bgHover: '#000', bgActive: '#000', bgActiveStrong: '#000',
    bgSelected: '#000', bgScrim: '#000', bgStage: '#000', bgStageUniverse: '#000',
    fgStrong: '#fff', fgDefault: '#fff', fgMuted: '#fff', fgSubtle: '#fff',
    fgOnAccent: '#fff', fgOnActiveStrong: '#fff', fgLink: '#fff', fgAccent: '#fff',
    borderDefault: '#000', borderMuted: '#000', borderStrong: '#000',
    borderFocus: '#000', ringActive: '#000',
    shadowSm: '', shadowMd: '', shadowLg: '',
    brandFg: '#fff', brandBg: '#000', brandVivid: '#000',
    intentSuccessFg: '#fff', intentSuccessBg: '#000', intentSuccessVivid: '#000',
    intentWarnFg: '#fff', intentWarnBg: '#000', intentWarnVivid: '#000',
    intentDangerFg: '#fff', intentDangerBg: '#000', intentDangerVivid: '#000',
    intentInfoFg: '#fff', intentInfoBg: '#000',
    intentNeutralFg: '#fff', intentNeutralBg: '#000',
    identityStable: '#fff', identityModified: '#fff',
    identityVulnerable: '#fff', identityOutOfScope: '#fff',
    intensityWarm: '#fff', intensityCool: '#fff', intensityNeutral: '#fff',
  } as unknown as SemanticTokens;
  return {
    semantic: { dark: blank, light: blank },
    global: {} as Tokens['global'],
  };
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div
      className="text-[10px] font-black uppercase tracking-[0.18em]"
      style={{ color: 'var(--fg-subtle)' }}
    >
      {title}
    </div>
  );
}

function ThemeTokenMatrix({
  title,
  keys,
  dark,
  light,
  onDarkChange,
  onLightChange,
}: {
  title: string;
  keys: readonly (keyof SemanticTokens)[];
  dark: SemanticTokens;
  light: SemanticTokens;
  onDarkChange: (key: keyof SemanticTokens, value: string) => void;
  onLightChange: (key: keyof SemanticTokens, value: string) => void;
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
        {title}
      </div>

      <div className="grid grid-cols-[120px_minmax(0,1fr)_minmax(0,1fr)] gap-2 items-start">
        <div />
        <ColumnHeader title="Dark" />
        <ColumnHeader title="Light" />

        {keys.map((key) => (
          <Fragment key={String(key)}>
            <div
              className="text-[10px] font-mono pt-2"
              style={{ color: 'var(--fg-muted)' }}
            >
              {humanizeKey(String(key))}
            </div>
            <TokenField label={`${humanizeKey(String(key))} (Dark)`} value={dark[key]} onChange={(value) => { onDarkChange(key, value); }} />
            <TokenField label={`${humanizeKey(String(key))} (Light)`} value={light[key]} onChange={(value) => { onLightChange(key, value); }} />
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function ColumnHeader({ title }: { title: string }) {
  return (
    <div
      className="rounded-lg border px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-center"
      style={{
        background: 'var(--bg-surface)',
        borderColor: 'var(--border-muted)',
        color: 'var(--fg-default)',
      }}
    >
      {title}
    </div>
  );
}

function GlobalTokenGroup<S extends keyof GlobalTokenSections>({
  section,
  title,
  values,
  onChange,
}: {
  section: S;
  title: string;
  values: GlobalTokenSections[S];
  onChange: <K extends keyof GlobalTokenSections[S]>(key: K, value: GlobalTokenSections[S][K]) => void;
}) {
  const entries = Object.entries(values) as [keyof GlobalTokenSections[S], GlobalTokenSections[S][keyof GlobalTokenSections[S]]][];
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
        {title}
      </div>

      {entries.map(([key, value]) => (
        <div key={`${String(section)}-${String(key)}`} className="space-y-1.5">
          <div className="text-[10px] font-mono" style={{ color: 'var(--fg-muted)' }}>
            {humanizeKey(String(key))}
          </div>
          <TokenField
            label={humanizeKey(String(key))}
            value={value as string | number}
            onChange={(next) => {
              onChange(key, (typeof value === 'number' ? Number(next) : next) as unknown as GlobalTokenSections[S][typeof key]);
            }}
          />
        </div>
      ))}
    </div>
  );
}

function TokenField({
  label,
  value,
  onChange,
}: {
  label?: string;
  value: string | number;
  onChange: (next: string) => void;
}) {
  const text = typeof value === 'number' ? String(value) : value;
  const hex = isHexColor(text);
  const colorPreview = isCssColor(text);

  return (
    <div
      className="rounded-lg border p-2"
      style={{
        background: 'var(--bg-surface)',
        borderColor: 'var(--border-muted)',
      }}
    >
      <div className="flex items-center gap-2">
        {hex && (
          <input
            type="color"
            value={text}
            onChange={(e) => { onChange(e.target.value); }}
            className="w-7 h-7 rounded-md cursor-pointer bg-transparent shrink-0"
            aria-label={label ? `${label} color picker` : 'Token color picker'}
          />
        )}
        {!hex && colorPreview && (
          <span
            className="w-4 h-4 rounded-md border shrink-0"
            style={{
              background: text,
              borderColor: 'var(--border-default)',
            }}
            aria-hidden
          />
        )}
        <input
          type={typeof value === 'number' ? 'number' : 'text'}
          value={text}
          step={typeof value === 'number' ? '0.01' : undefined}
          onChange={(e) => { onChange(e.target.value); }}
          className="w-full rounded-md border px-2 py-1.5 text-[11px] font-mono bg-transparent outline-none"
          style={{
            borderColor: 'var(--border-muted)',
            color: 'var(--fg-default)',
          }}
          aria-label={label ? `${label} value` : 'Token value'}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
    </div>
  );
}

function humanizeKey(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (char) => char.toUpperCase());
}

function isHexColor(value: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

function isCssColor(value: string): boolean {
  const v = value.trim().toLowerCase();
  return isHexColor(v) || v.startsWith('rgb(') || v.startsWith('rgba(') || v.startsWith('hsl(') || v.startsWith('hsla(');
}

const SEMANTIC_GROUPS: { title: string; keys: readonly (keyof SemanticTokens)[] }[] = [
  { title: 'Surface', keys: ['bgCanvas', 'bgSurface', 'bgSurfaceMuted', 'bgOverlay', 'bgElevated', 'bgPanelStrong', 'bgHover', 'bgActive', 'bgActiveStrong', 'bgSelected', 'bgScrim', 'bgStage', 'bgStageUniverse'] },
  { title: 'Foreground', keys: ['fgStrong', 'fgDefault', 'fgMuted', 'fgSubtle', 'fgOnAccent', 'fgOnActiveStrong', 'fgLink', 'fgAccent'] },
  { title: 'Border', keys: ['borderDefault', 'borderMuted', 'borderStrong', 'borderFocus', 'ringActive'] },
  { title: 'Shadow', keys: ['shadowSm', 'shadowMd', 'shadowLg'] },
  { title: 'Intent', keys: ['intentSuccessFg', 'intentSuccessBg', 'intentSuccessVivid', 'intentWarnFg', 'intentWarnBg', 'intentWarnVivid', 'intentDangerFg', 'intentDangerBg', 'intentDangerVivid', 'intentInfoFg', 'intentInfoBg', 'intentNeutralFg', 'intentNeutralBg'] },
  { title: 'Identity', keys: ['identityStable', 'identityModified', 'identityVulnerable', 'identityOutOfScope'] },
  { title: 'Intensity', keys: ['intensityWarm', 'intensityCool', 'intensityNeutral'] },
];

const GLOBAL_GROUPS: { section: keyof GlobalTokenSections; title: string }[] = [
  { section: 'glass', title: 'Glass' },
  { section: 'card', title: 'Card' },
  { section: 'chip', title: 'Chip' },
  { section: 'pill', title: 'Pill' },
  { section: 'panel', title: 'Panel' },
  { section: 'header', title: 'Header' },
  { section: 'tab', title: 'Tab' },
  { section: 'dropdown', title: 'Dropdown' },
  { section: 'tooltip', title: 'Tooltip' },
  { section: 'focus', title: 'Focus' },
];

const PRESETS: { id: string; apply: (current: Tokens) => Tokens }[] = [
  {
    id: 'sharper',
    apply: (current) => ({
      ...current,
      global: {
        ...current.global,
        glass: { ...current.global.glass, radius: '16px', blur: '8px', fillAlphaDark: 0.06 },
        card: { ...current.global.card, radius: '8px', radiusInner: '4px' },
        dropdown: { ...current.global.dropdown, radius: '12px' },
      },
    }),
  },
  {
    id: 'softer',
    apply: (current) => ({
      ...current,
      global: {
        ...current.global,
        glass: { ...current.global.glass, radius: '32px', blur: '30px', fillAlphaDark: 0.06 },
        card: { ...current.global.card, radius: '32px', radiusInner: '18px' },
        dropdown: { ...current.global.dropdown, radius: '24px' },
      },
    }),
  },
  {
    id: 'compact',
    apply: (current) => ({
      ...current,
      global: {
        ...current.global,
        card: { ...current.global.card, padding: '10px', paddingCompact: '8px', gap: '8px' },
        panel: { ...current.global.panel, inset: '10px' },
        header: { ...current.global.header, paddingX: '10px' },
      },
    }),
  },
  {
    id: 'cozy',
    apply: (current) => ({
      ...current,
      global: {
        ...current.global,
        card: { ...current.global.card, padding: '20px', paddingCompact: '16px', gap: '18px' },
        panel: { ...current.global.panel, inset: '20px' },
        header: { ...current.global.header, paddingX: '20px' },
      },
    }),
  },
  {
    id: 'cyberpunk',
    apply: (current) => ({
      ...current,
      semantic: {
        dark: {
          ...current.semantic.dark,
          fgLink: '#ff7afc',
          fgAccent: '#ff7afc',
          borderFocus: 'rgba(255,122,252,0.55)',
          intentInfoFg: '#ff7afc',
        },
        light: {
          ...current.semantic.light,
          fgLink: '#b100ff',
          fgAccent: '#b100ff',
          borderFocus: 'rgba(177,0,255,0.45)',
          intentInfoFg: '#b100ff',
        },
      },
      global: {
        ...current.global,
        glass: { ...current.global.glass, blur: '30px', radius: '6px', fillAlphaDark: 0.06 },
        card: { ...current.global.card, radius: '6px', radiusInner: '4px' },
        dropdown: { ...current.global.dropdown, radius: '10px' },
      },
    }),
  },
];
