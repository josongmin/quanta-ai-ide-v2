import { useCallback, useState } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { Modal } from '@shared/ui';
import { useTranslation } from '@shared/i18n';
import { useTheme } from '@shared/theme';
import { type SemanticTokens } from '@shared/tokens';
import { useTokens } from '../model/TokensContext';
import type { GlobalTokenSections, Tokens } from '@shared/tokens';
import { DARK_PRESETS, LIGHT_PRESETS, type ThemePreset } from '../model/theme-presets';
import { ThemePresetGrid } from './tokens-panel/PresetGrid';
import { SectionTitle, ThemeTokenMatrix } from './tokens-panel/TokenMatrix';
import { GlobalTokenGroup } from './tokens-panel/TokenField';

export default function TokensPanel({ onClose }: { onClose: () => void }) {
  const {
    tokens, setSemantic, setGlobal, replace, reset,
  } = useTokens();
  const { theme, setTheme } = useTheme();
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const applyThemePreset = useCallback((preset: ThemePreset) => {
    // Palette presets edit semantic.dark / semantic.light in storage, but
    // only the *active* theme slice is painted onto CSS variables. Switch
    // the app theme to match the row the user clicked so the choice is
    // visible immediately.
    setTheme(preset.tone);
    replace((current) => preset.apply(current));
    setSelectedPresetId(preset.id);
  }, [replace, setTheme]);
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
              activeTheme={theme}
              selectedPresetId={selectedPresetId}
              onApply={applyThemePreset}
              t={t as (key: string, fallback?: string) => string}
            />
            <ThemePresetGrid
              tone="light"
              label={t('tokens.tone.light', 'Light')}
              presets={LIGHT_PRESETS}
              activeTheme={theme}
              selectedPresetId={selectedPresetId}
              onApply={applyThemePreset}
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
