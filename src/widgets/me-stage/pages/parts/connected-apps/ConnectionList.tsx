import { useTranslation } from 'react-i18next';
import {
  Check, X, ExternalLink, ChevronDown, ChevronUp,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@shared/ui/forms';
import type { Connection } from './types';

// ─────────────────────────────────────────────────────────────────────────
// Connection list with expand-to-show-scopes

export function ConnectionList({
  items, expanded, onToggle, onMakePrimary, onRemove,
}: {
  items: Connection[];
  expanded: string | null;
  onToggle: (id: string) => void;
  onMakePrimary: ((id: string) => void) | null;
  onRemove: (c: Connection) => void;
}) {
  const { t } = useTranslation('me');
  if (items.length === 0) {
    return (
      <div
        className="text-center py-6 text-sm rounded-md"
        style={{
          background: 'var(--bg-surface-muted)',
          border: '1px dashed var(--border-default)',
          color: 'var(--fg-subtle)',
        }}
      >
        {t('connectedApps.list.empty')}
      </div>
    );
  }
  return (
    <div className="flex flex-col rounded-md overflow-hidden"
      style={{ border: '1px solid var(--border-muted)' }}
    >
      {items.map((c, i) => (
        <ConnectionRow
          key={c.id}
          conn={c}
          top={i === 0}
          expanded={expanded === c.id}
          onToggle={() => { onToggle(c.id); }}
          onMakePrimary={onMakePrimary ? () => { onMakePrimary(c.id); } : null}
          onRemove={() => { onRemove(c); }}
        />
      ))}
    </div>
  );
}

function ConnectionRow({
  conn, top, expanded, onToggle, onMakePrimary, onRemove,
}: {
  conn: Connection;
  top: boolean;
  expanded: boolean;
  onToggle: () => void;
  onMakePrimary: (() => void) | null;
  onRemove: () => void;
}) {
  const { t } = useTranslation('me');
  const Icon = conn.icon;
  return (
    <div
      style={{
        background: 'var(--bg-canvas)',
        borderTop: top ? 'none' : '1px solid var(--border-muted)',
      }}
    >
      <div className="flex items-center gap-3 px-3 py-3">
        <span
          className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
          style={{
            background: conn.primary ? 'color-mix(in srgb, var(--fg-accent) 14%, transparent)' : 'var(--bg-surface-muted)',
            border: `1px solid ${conn.primary ? 'var(--fg-accent)' : 'var(--border-muted)'}`,
          }}
        >
          <Icon className="w-4 h-4" />
        </span>
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold" style={{ color: 'var(--fg-strong)' }}>
              {conn.provider}
            </span>
            {conn.primary && (
              <span
                className="text-2xs uppercase tracking-eyebrow font-semibold px-1.5 py-0.5 rounded"
                style={{ color: 'var(--fg-accent)', background: 'color-mix(in srgb, var(--fg-accent) 14%, transparent)', border: '1px solid var(--fg-accent)' }}
              >
                {t('connectedApps.list.primary')}
              </span>
            )}
          </div>
          <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>
            {t('connectedApps.list.connectedMeta', { account: conn.account, connectedAt: conn.connectedAt, lastUsed: conn.lastUsed })}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {onMakePrimary && !conn.primary && <Button onClick={onMakePrimary}>{t('connectedApps.list.makePrimary')}</Button>}
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-sm font-medium transition-colors"
            style={{
              background: expanded ? 'var(--bg-active)' : 'var(--bg-surface-muted)',
              color: 'var(--fg-default)',
              border: '1px solid var(--border-default)',
            }}
          >
            {t('connectedApps.list.scopes', { count: conn.scopes.length })}
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          <Button variant="ghost" onClick={onRemove}>
            <X className="w-3 h-3" />
            {t('connectedApps.list.disconnect')}
          </Button>
        </div>
      </div>

      {conn.warning && (
        <div
          className="flex items-start gap-2 mx-3 mb-2 px-2.5 py-1.5 rounded text-xs"
          style={{
            background: 'var(--intent-warn-bg)',
            border: '1px solid var(--intent-warn-fg)',
            color: 'var(--fg-strong)',
          }}
        >
          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" style={{ color: 'var(--intent-warn-fg)' }} />
          {conn.warning}
        </div>
      )}

      {expanded && (
        <div
          className="px-3 pb-3 onb-stagger"
          style={{ borderTop: '1px dashed var(--border-muted)' }}
        >
          <div
            className="text-2xs uppercase tracking-eyebrow font-semibold pt-2.5 pb-1.5"
            style={{ color: 'var(--fg-subtle)' }}
          >
            {t('connectedApps.list.authorizedScopes')}
          </div>
          <ul className="grid grid-cols-1 gap-1">
            {conn.scopes.map((s) => (
              <li key={s.id} className="flex items-center gap-2 text-sm">
                <Check className="w-3 h-3" style={{ color: s.required ? 'var(--intent-success-fg)' : 'var(--fg-subtle)' }} />
                <span style={{ color: 'var(--fg-default)' }}>{s.label}</span>
                <code className="font-mono text-xs" style={{ color: 'var(--fg-subtle)' }}>{s.id}</code>
                {s.required && (
                  <span
                    className="text-2xs uppercase tracking-eyebrow font-semibold ml-auto"
                    style={{ color: 'var(--fg-subtle)' }}
                  >
                    {t('connectedApps.list.required')}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-3 mt-3 text-sm">
            {/* Demo build: no real OAuth-app URL is stored per connection and
                there is no re-authorization flow, so these are honestly
                disabled rather than rendered as clickable no-ops. */}
            <button
              type="button"
              disabled
              aria-disabled
              title={t('common.demoReasonShort')}
              className="inline-flex items-center gap-1 bg-transparent border-0 p-0 cursor-not-allowed"
              style={{ color: 'var(--fg-subtle)', font: 'inherit', opacity: 0.6 }}
            >
              {t('connectedApps.list.viewOn', { provider: conn.provider })}
              <ExternalLink className="w-2.5 h-2.5" />
            </button>
            <button
              type="button"
              disabled
              aria-disabled
              title={t('common.demoReasonShort')}
              className="inline-flex items-center gap-1 bg-transparent border-0 p-0 cursor-not-allowed"
              style={{ color: 'var(--fg-subtle)', font: 'inherit', opacity: 0.6 }}
            >
              {t('connectedApps.list.reauthorize')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
