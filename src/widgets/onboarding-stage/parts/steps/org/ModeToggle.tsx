import { useTranslation } from 'react-i18next';
import { Building2, KeyRound } from 'lucide-react';

export function ModeToggle({
  mode, onChange,
}: { mode: 'create' | 'join'; onChange: (m: 'create' | 'join') => void }) {
  const { t } = useTranslation('onboarding');
  const opts: { id: 'create' | 'join'; title: string; sub: string; icon: React.ReactNode }[] = [
    { id: 'create', title: t('org.mode.createTitle'), sub: t('org.mode.createSub'), icon: <Building2 className="w-4 h-4" /> },
    { id: 'join',   title: t('org.mode.joinTitle'),   sub: t('org.mode.joinSub'),   icon: <KeyRound  className="w-4 h-4" /> },
  ];
  return (
    <div className="grid grid-cols-2 gap-px rounded-md overflow-hidden"
      style={{ background: 'var(--border-muted)' }}
    >
      {opts.map((o) => {
        const active = mode === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => { onChange(o.id); }}
            className="flex flex-col items-start gap-1 p-4 transition-colors text-left"
            style={{ background: 'var(--bg-canvas)', boxShadow: active ? 'inset 0 0 0 1px var(--fg-accent)' : 'none' }}
            onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg-canvas)'; }}
          >
            <div className="flex items-center gap-2">
              <span style={{ color: active ? 'var(--fg-strong)' : 'var(--fg-muted)' }}>
                {o.icon}
              </span>
              <span
                className="text-base font-semibold"
                style={{ color: active ? 'var(--fg-strong)' : 'var(--fg-default)' }}
              >
                {o.title}
              </span>
              {active && (
                <span
                  className="ml-auto w-1.5 h-1.5 rounded-full onb-tick"
                  style={{ background: 'var(--fg-accent)' }}
                  aria-hidden
                />
              )}
            </div>
            <span className="text-sm" style={{ color: 'var(--fg-subtle)' }}>
              {o.sub}
            </span>
          </button>
        );
      })}
    </div>
  );
}
