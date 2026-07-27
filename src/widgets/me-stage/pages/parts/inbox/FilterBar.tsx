import { useTranslation } from 'react-i18next';
import {
  Inbox, AtSign, GitPullRequest, Bell, Archive, Star,
} from 'lucide-react';
import type { Filter } from './types';

export function FilterBar({
  filter, onChange, counts,
}: {
  filter: Filter;
  onChange: (v: Filter) => void;
  counts: Record<Filter, number>;
}) {
  const { t } = useTranslation('me');
  const tabs: { id: Filter; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'unread',   label: t('inbox.filters.unread'),   icon: Bell },
    { id: 'mentions', label: t('inbox.filters.mentions'), icon: AtSign },
    { id: 'reviews',  label: t('inbox.filters.reviews'),  icon: GitPullRequest },
    { id: 'starred',  label: t('inbox.filters.starred'),  icon: Star },
    { id: 'all',      label: t('inbox.filters.all'),      icon: Inbox },
    { id: 'archived', label: t('inbox.filters.archived'), icon: Archive },
  ];
  return (
    <div className="flex flex-col gap-0.5 p-2"
      style={{ borderBottom: '1px solid var(--border-muted)' }}
    >
      {tabs.map(({ id, label, icon: Icon }) => {
        const active = filter === id;
        const count = counts[id];
        return (
          <button
            key={id}
            type="button"
            onClick={() => { onChange(id); }}
            className="flex items-center gap-2 px-2 h-7 rounded-md text-base font-medium transition-colors"
            style={{
              background: active ? 'var(--bg-active)' : 'transparent',
              color: active ? 'var(--fg-strong)' : 'var(--fg-muted)',
            }}
            onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="flex-1 text-left">{label}</span>
            {count > 0 && (
              <span
                className="text-xs tabular-nums px-1.5 py-0.5 rounded font-mono"
                style={{
                  background: id === 'unread' && count > 0 ? 'color-mix(in srgb, var(--fg-accent) 14%, transparent)' : 'var(--bg-surface-muted)',
                  color: id === 'unread' && count > 0 ? 'var(--fg-accent)' : 'var(--fg-muted)',
                }}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
