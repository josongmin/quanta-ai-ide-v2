import type { Tab, TranslateFn } from './types';

export function TabBar({
  tab, onChange, isDark, t, counts,
}: {
  tab: Tab;
  onChange: (t: Tab) => void;
  isDark: boolean;
  t: TranslateFn;
  counts: { modes: number; rules: number; workflows: number; painpoints: number };
}) {
  void isDark;
  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'modes',       label: t('agentProfile.tabs.modes'),       count: counts.modes },
    { id: 'rules',       label: t('agentProfile.tabs.rules'),       count: counts.rules },
    { id: 'workflows',   label: t('agentProfile.tabs.workflows'),   count: counts.workflows },
    { id: 'painpoints',  label: t('agentProfile.tabs.painpoints'),  count: counts.painpoints },
    { id: 'marketplace', label: t('agentProfile.tabs.marketplace') },
  ];
  return (
    <nav className="flex items-center gap-px" role="tablist">
      {tabs.map((it) => {
        const active = tab === it.id;
        return (
          <button
            key={it.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => { onChange(it.id); }}
            className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition-colors flex items-center gap-1.5 ${
              active
                ? ('bg-[var(--bg-active-strong)] text-[var(--fg-on-active-strong)]')
                : ('text-[var(--fg-muted)] hover:text-[var(--fg-strong)] hover:[background:var(--bg-hover)]')
            }`}
          >
            {it.label}
            {it.count != null && it.count > 0 && (
              <span className={`px-1.5 py-px rounded-full text-[9px] font-mono tabular-nums ${
                active
                  ? ('bg-[var(--bg-active-strong)]')
                  : ('bg-[var(--bg-elevated)]')
              }`}>
                {it.count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
