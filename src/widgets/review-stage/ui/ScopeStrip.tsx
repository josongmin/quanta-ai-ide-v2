// ─────────────────────────────────────────────────────────────────────────
// QUEUE — left rail
//
// Scope tabs use a segmented-control pattern: a single pill track with a
// sliding indicator. Why: cuts perceived motion cost between Inbox/Mine/Team
// (one element animates, not three), and the indicator's left/width is the
// only visual cue to "where am I" — clearer than per-button outlines.
// ─────────────────────────────────────────────────────────────────────────

import { Inbox, User, Users, type LucideIcon } from 'lucide-react';
import { useTranslation } from '@shared/i18n';

export type ScopeKey = 'mine-to-review' | 'my-prs' | 'team';

export default function ScopeStrip({
  scope, onScope, counts,
}: {
  scope: ScopeKey;
  onScope: (s: ScopeKey) => void;
  counts: Record<ScopeKey, number>;
}) {
  const { t } = useTranslation('review');
  const items: { key: ScopeKey; label: string; icon: LucideIcon; hint: string }[] = [
    { key: 'mine-to-review', label: 'Inbox', icon: Inbox, hint: 'PRs awaiting your review' },
    { key: 'my-prs',         label: 'Mine',  icon: User,  hint: 'Pull requests you opened' },
    { key: 'team',           label: 'Team',  icon: Users, hint: 'All open PRs in this repo' },
  ];
  return (
    <div className="shrink-0 px-3 pt-3 border-b border-white/[0.06]">
      <div
        role="tablist"
        aria-label={t('search.scopeAria')}
        className="relative flex items-stretch gap-5"
      >
        {items.map((it) => {
          const active = scope === it.key;
          const Icon = it.icon;
          const n = counts[it.key];
          return (
            <button
              key={it.key}
              role="tab"
              aria-selected={active}
              aria-label={`${it.label} — ${it.hint}`}
              type="button"
              onClick={() => { onScope(it.key); }}
              className={`relative inline-flex items-center gap-1.5 pb-2 text-[12px] font-medium tracking-tight transition-colors outline-none focus-visible:text-white ${
                active ? 'text-white' : 'text-white/45 hover:text-white/70'
              }`}
            >
              <Icon className="w-3.5 h-3.5" strokeWidth={2} />
              <span>{it.label}</span>
              {n > 0 && (
                <span
                  className={`text-[10px] font-mono tabular-nums leading-none ${
                    active ? 'text-white/70' : 'text-white/35'
                  }`}
                >
                  {n}
                </span>
              )}
              {active && (
                <span
                  aria-hidden
                  className="absolute left-0 right-0 -bottom-px h-px bg-white/80"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
