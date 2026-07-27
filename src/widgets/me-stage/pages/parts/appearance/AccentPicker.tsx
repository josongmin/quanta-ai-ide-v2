import { useTranslation } from 'react-i18next';
import type { Accent } from './types';

// ─────────────────────────────────────────────────────────────────────────
// Accent picker — 5 swatches

export function AccentPicker({ value, onChange }: { value: Accent; onChange: (v: Accent) => void }) {
  const { t } = useTranslation('me');
  const opts: { id: Accent; label: string; color: string }[] = [
    { id: 'cobalt',  label: t('appearance.accent.cobalt'),  color: '#4F5BFF' },
    { id: 'violet',  label: t('appearance.accent.violet'),  color: '#8B5CF6' },
    { id: 'amber',   label: t('appearance.accent.amber'),   color: '#F59E0B' },
    { id: 'crimson', label: t('appearance.accent.crimson'), color: '#DC2626' },
    { id: 'mint',    label: t('appearance.accent.mint'),    color: '#10B981' },
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
