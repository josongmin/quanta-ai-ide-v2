import { useTranslation } from 'react-i18next';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import type { ThemeMode } from './types';

// ─────────────────────────────────────────────────────────────────────────
// Theme picker — 3 visual cards

export function ThemePicker({ value, onChange }: { value: ThemeMode; onChange: (v: ThemeMode) => void }) {
  const { t } = useTranslation('me');
  const opts: { id: ThemeMode; label: string; icon: React.ComponentType<{ className?: string }>; }[] = [
    { id: 'light',  label: t('appearance.theme.light'),  icon: Sun },
    { id: 'dark',   label: t('appearance.theme.dark'),   icon: Moon },
    { id: 'system', label: t('appearance.theme.system'), icon: Monitor },
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
