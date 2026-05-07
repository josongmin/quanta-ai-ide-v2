import { X, RotateCcw } from 'lucide-react';
import { Drawer } from '@shared/ui';
import { useTranslation } from '@shared/i18n';
import { useTokens, type Tokens } from '../model/TokensContext';

export default function TokensPanel({ onClose }: { onClose: () => void }) {
  const { tokens, set, reset } = useTokens();
  const { t } = useTranslation('chat');
  const tCommon = useTranslation('common').t;

  return (
    <Drawer open onClose={onClose} width={360} ariaLabel={t('tokens.title')}>
      <div className="h-full flex flex-col">
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

        <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-hide">
          <Group title={t('tokens.groups.color')}>
            <ColorRow label={t('tokens.labels.accent')}   value={tokens.accent}    onChange={(v) => { set('accent', v); }} />
            <ColorRow label={t('tokens.labels.bgDark')}   value={tokens.bgDark}    onChange={(v) => { set('bgDark', v); }} />
            <ColorRow label={t('tokens.labels.bgLight')}  value={tokens.bgLight}   onChange={(v) => { set('bgLight', v); }} />
          </Group>

          <Group title={t('tokens.groups.glass')}>
            <RangeRow label={t('tokens.labels.alphaDark')}   value={tokens.glassAlphaDark}        min={0}  max={0.3}  step={0.005} onChange={(v) => { set('glassAlphaDark', v); }} fmt={f3} />
            <RangeRow label={t('tokens.labels.alphaLight')}  value={tokens.glassAlphaLight}       min={0}  max={1}    step={0.01}  onChange={(v) => { set('glassAlphaLight', v); }} fmt={f3} />
            <RangeRow label={t('tokens.labels.borderDark')}  value={tokens.glassBorderAlphaDark}  min={0}  max={0.5}  step={0.01}  onChange={(v) => { set('glassBorderAlphaDark', v); }} fmt={f3} />
            <RangeRow label={t('tokens.labels.borderLight')} value={tokens.glassBorderAlphaLight} min={0}  max={1}    step={0.01}  onChange={(v) => { set('glassBorderAlphaLight', v); }} fmt={f3} />
            <RangeRow label={t('tokens.labels.blur')}        value={tokens.glassBlur}             min={0}  max={48}   step={1}     onChange={(v) => { set('glassBlur', v); }} fmt={(v) => `${v}px`} />
          </Group>

          <Group title={t('tokens.groups.shape')}>
            <RangeRow label={t('tokens.labels.radiusLg')} value={tokens.radius}   min={0} max={48} step={1} onChange={(v) => { set('radius', v); }} fmt={(v) => `${v}px`} />
            <RangeRow label={t('tokens.labels.radiusSm')} value={tokens.radiusSm} min={0} max={24} step={1} onChange={(v) => { set('radiusSm', v); }} fmt={(v) => `${v}px`} />
          </Group>

          <Group title={t('tokens.groups.type')}>
            <RangeRow label={t('tokens.labels.fontScale')} value={tokens.fontScale} min={0.85} max={1.2} step={0.01} onChange={(v) => { set('fontScale', v); }} fmt={(v) => v.toFixed(2)} />
            <RangeRow label={t('tokens.labels.cardPad')}   value={tokens.cardPad}   min={4} max={32} step={1} onChange={(v) => { set('cardPad', v); }} fmt={(v) => `${v}px`} />
            <RangeRow label={t('tokens.labels.gapY')}      value={tokens.gapY}      min={0} max={32} step={1} onChange={(v) => { set('gapY', v); }} fmt={(v) => `${v}px`} />
          </Group>

          <Group title={t('tokens.groups.presets')}>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p) => (
                <button type="button"
                  key={p.id}
                  onClick={() => { Object.entries(p.values).forEach(([k, v]) => { set(k as keyof Tokens, v as never); }); }}
                  className="text-left p-2 rounded-lg border text-[11px] font-bold hover-surface"
                  style={{
                    background: 'var(--bg-surface-muted)',
                    borderColor: 'var(--border-muted)',
                    color: 'var(--fg-default)',
                  }}
                >
                  {t(`tokens.presets.${p.id}`)}
                </button>
              ))}
            </div>
          </Group>
        </div>
      </div>
    </Drawer>
  );
}

function f3(v: number) { return v.toFixed(3); }

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div
        className="text-[9px] font-black uppercase tracking-[0.18em]"
        style={{ color: 'var(--fg-subtle)' }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div
      className="flex items-center gap-3 p-2 rounded-lg border"
      style={{
        background: 'var(--bg-surface-muted)',
        borderColor: 'var(--border-muted)',
      }}
    >
      <input
        type="color"
        value={value}
        onChange={(e) => { onChange(e.target.value); }}
        className="w-7 h-7 rounded-md cursor-pointer bg-transparent shrink-0"
      />
      <span
        className="text-[11px] font-bold flex-1"
        style={{ color: 'var(--fg-default)' }}
      >
        {label}
      </span>
      <code
        className="text-[10px] font-mono"
        style={{ color: 'var(--fg-subtle)' }}
      >
        {value}
      </code>
    </div>
  );
}

function RangeRow({
  label, value, min, max, step, onChange, fmt,
}: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void;
  fmt: (v: number) => string;
}) {
  return (
    <div
      className="p-2 rounded-lg border"
      style={{
        background: 'var(--bg-surface-muted)',
        borderColor: 'var(--border-muted)',
      }}
    >
      <div className="flex justify-between items-center mb-1">
        <span className="text-[11px] font-bold" style={{ color: 'var(--fg-default)' }}>{label}</span>
        <span className="text-[10px] font-mono tabular-nums" style={{ color: 'var(--fg-muted)' }}>{fmt(value)}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => { onChange(+e.target.value); }}
        className="w-full accent-[#4f9a5c]"
      />
    </div>
  );
}

const PRESETS: { id: string; values: Partial<Tokens> }[] = [
  {
    id: 'default',
    values: { radius: 24, radiusSm: 12, glassBlur: 22, glassAlphaDark: 0.04, fontScale: 1, cardPad: 16, accent: '#4f9a5c' },
  },
  {
    id: 'sharper',
    values: { radius: 8, radiusSm: 4, glassBlur: 8, glassAlphaDark: 0.06 },
  },
  {
    id: 'softer',
    values: { radius: 32, radiusSm: 18, glassBlur: 30, glassAlphaDark: 0.06 },
  },
  {
    id: 'compact',
    values: { fontScale: 0.9, cardPad: 10, gapY: 8 },
  },
  {
    id: 'cozy',
    values: { fontScale: 1.05, cardPad: 20, gapY: 18 },
  },
  {
    id: 'cyberpunk',
    values: { accent: '#ff7afc', glassAlphaDark: 0.06, glassBlur: 30, radius: 6 },
  },
];
