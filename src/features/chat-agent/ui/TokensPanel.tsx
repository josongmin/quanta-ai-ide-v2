import { Fragment } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { Modal } from '@shared/ui';
import { useTranslation } from '@shared/i18n';
import type { SemanticTokens } from '@shared/tokens';
import { useTokens, type GlobalTokenSections, type Tokens } from '../model/TokensContext';

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
              className="text-[13px] font-black uppercase tracking-[0.18em]"
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
        </div>
      </div>
    </Modal>
  );
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
          <Fragment key={key}>
            <div
              className="text-[10px] font-mono pt-2"
              style={{ color: 'var(--fg-muted)' }}
            >
              {humanizeKey(key)}
            </div>
            <TokenField value={dark[key]} onChange={(value) => { onDarkChange(key, value); }} />
            <TokenField value={light[key]} onChange={(value) => { onLightChange(key, value); }} />
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
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-conversion -- keyof GlobalTokenSections[S] can include `symbol`; String() guards the interpolation
        <div key={`${String(section)}-${String(key)}`} className="space-y-1.5">
          <div className="text-[10px] font-mono" style={{ color: 'var(--fg-muted)' }}>
            {humanizeKey(String(key))}
          </div>
          <TokenField
            value={value as string | number}
            onChange={(next) => {
              onChange(key, (typeof value === 'number' ? Number(next) : next) as GlobalTokenSections[S][typeof key]);
            }}
          />
        </div>
      ))}
    </div>
  );
}

function TokenField({
  value,
  onChange,
}: {
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
