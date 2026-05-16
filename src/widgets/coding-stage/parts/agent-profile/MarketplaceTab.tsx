import { useMemo, useState } from 'react';
import { Check, Download, Search, Star } from 'lucide-react';
import type { MarketplaceProfile } from '../types';
import { MARKETPLACE_PROFILES } from '../agentProfileData';
import type { TranslateFn } from './types';
import { formatNumber } from '@shared/i18n';

export function MarketplaceTab({
  importedFromId, onImport, isDark, t,
}: {
  importedFromId?: string;
  onImport: (mp: MarketplaceProfile) => void;
  isDark: boolean;
  t: TranslateFn;
}) {
  void isDark;
  const [domain, setDomain] = useState<'all' | MarketplaceProfile['domain']>('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    return MARKETPLACE_PROFILES.filter((mp) => {
      if (domain !== 'all' && mp.domain !== domain) return false;
      if (query.length === 0) return true;
      const q = query.toLowerCase();
      return mp.name.toLowerCase().includes(q) || mp.author.toLowerCase().includes(q);
    });
  }, [domain, query]);

  const muted = 'text-[var(--fg-muted)]';
  const faint = 'text-[var(--fg-subtle)]';
  const heading = 'text-[var(--fg-strong)]';

  const domains: { id: 'all' | MarketplaceProfile['domain']; label: string }[] = [
    { id: 'all',      label: t('agentProfile.marketplace.domainAll') },
    { id: 'frontend', label: t('agentProfile.marketplace.domainFrontend') },
    { id: 'backend',  label: t('agentProfile.marketplace.domainBackend') },
    { id: 'ml',       label: t('agentProfile.marketplace.domainMl') },
    { id: 'devops',   label: t('agentProfile.marketplace.domainDevops') },
    { id: 'mobile',   label: t('agentProfile.marketplace.domainMobile') },
  ];

  return (
    <div className="px-5 py-4 space-y-3">
      <div className={`text-[11px] leading-relaxed ${muted}`}>
        {t('agentProfile.marketplace.intro')}
      </div>

      <div className="flex items-center gap-2">
        <div className={`flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-md border bg-[var(--bg-elevated)] border-[var(--border-default)]`}>
          <Search className={`w-3.5 h-3.5 ${faint}`} />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); }}
            placeholder={t('agentProfile.marketplace.searchPlaceholder')}
            className={`flex-1 bg-transparent text-[12px] outline-none ${heading}`}
          />
        </div>
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        {domains.map((d) => {
          const active = domain === d.id;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => { setDomain(d.id); }}
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono transition-colors ${
                active
                  ? ('bg-[var(--bg-active-strong)] text-[var(--fg-on-active-strong)]')
                  : ('text-[var(--fg-muted)] hover:text-[var(--fg-default)]')
              }`}
            >
              {d.label}
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        {filtered.map((mp) => {
          const installed = mp.id === importedFromId;
          return (
            <div
              key={mp.id}
              className={`rounded-lg border px-3.5 py-3 bg-[var(--bg-surface-muted)] border-[var(--border-default)]`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[12px] font-semibold ${heading} truncate`}>{mp.name}</span>
                    <span className={`shrink-0 text-[10px] font-mono ${faint}`}>{mp.author}</span>
                  </div>
                  <p className={`text-[11px] leading-relaxed mt-0.5 ${muted}`}>{mp.blurb}</p>
                  <div className="mt-1.5 flex items-center gap-2 text-[10px] font-mono">
                    <span className={`flex items-center gap-1 ${faint}`}>
                      <Star className="w-3 h-3" />
                      {mp.rating.toFixed(1)}
                    </span>
                    <span className={faint}>·</span>
                    <span className={faint}>{formatNumber(mp.installs)} installs</span>
                    <span className={faint}>·</span>
                    <span className={faint}>+{mp.preview.rules}r {mp.preview.modes}m {mp.preview.workflows}w</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { onImport(mp); }}
                  disabled={installed}
                  className={`shrink-0 px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                    installed
                      ? ('bg-[var(--intent-success-bg)] text-[var(--intent-success-fg)] border border-[var(--intent-success-fg)] cursor-default')
                      : ('bg-[var(--bg-elevated)] text-[var(--fg-strong)] hover:[background:var(--bg-active-strong)] border border-[var(--border-strong)]')
                  }`}
                >
                  {installed ? (
                    <><Check className="w-3 h-3" />{t('agentProfile.marketplace.installed')}</>
                  ) : (
                    <><Download className="w-3 h-3" />{t('agentProfile.marketplace.install')}</>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
