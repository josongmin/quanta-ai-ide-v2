import { useTranslation } from 'react-i18next';
import { Type } from 'lucide-react';
import type { Appearance, FontScale } from './types';

// ─────────────────────────────────────────────────────────────────────────
// Font scale 3-stop toggle

export function FontScaleToggle({ value, onChange }: { value: FontScale; onChange: (v: FontScale) => void }) {
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

export function MonoFontPicker({
  value, onChange,
}: { value: Appearance['monoFont']; onChange: (v: Appearance['monoFont']) => void }) {
  const { t } = useTranslation('me');
  const opts: { id: Appearance['monoFont']; label: string; sample: string }[] = [
    { id: 'jetbrains', label: 'JetBrains Mono',            sample: 'function() { ... }' },
    { id: 'sf-mono',   label: 'SF Mono',                   sample: 'function() { ... }' },
    { id: 'fira',      label: 'Fira Code',                 sample: 'function() { ... }' },
    { id: 'system',    label: t('appearance.text.systemDefault'), sample: 'function() { ... }' },
  ];
  return (
    <select
      value={value}
      onChange={(e) => { onChange(e.target.value as Appearance['monoFont']); }}
      className="h-8 rounded-md px-2.5 text-base outline-none cursor-pointer"
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

export function SyntaxPicker({
  value, onChange,
}: { value: Appearance['syntaxTheme']; onChange: (v: Appearance['syntaxTheme']) => void }) {
  const { t } = useTranslation('me');
  const opts: { id: Appearance['syntaxTheme']; label: string }[] = [
    { id: 'dim',       label: t('appearance.text.dim')      },
    { id: 'midnight',  label: t('appearance.text.midnight') },
    { id: 'paper',     label: t('appearance.text.paper')    },
    { id: 'solarized', label: 'Solarized'  },
  ];
  return (
    <select
      value={value}
      onChange={(e) => { onChange(e.target.value as Appearance['syntaxTheme']); }}
      className="h-8 rounded-md px-2.5 text-base outline-none cursor-pointer"
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
