import { Key, Trash2 } from 'lucide-react';
import { Button } from '@shared/ui/forms';
import { ALL_SCOPES, type ScopeId, type Token } from './types';

export function TokenList({ tokens, onRemove }: { tokens: Token[]; onRemove: (t: Token) => void }) {
  if (tokens.length === 0) {
    return (
      <div
        className="flex flex-col items-center gap-2 py-10 rounded-md"
        style={{
          background: 'var(--bg-surface-muted)',
          border: '1px dashed var(--border-default)',
        }}
      >
        <Key className="w-5 h-5" style={{ color: 'var(--fg-subtle)' }} />
        <span className="text-base" style={{ color: 'var(--fg-muted)' }}>
          No tokens yet. Create one to use the API.
        </span>
      </div>
    );
  }
  return (
    <div className="flex flex-col rounded-md overflow-hidden"
      style={{ border: '1px solid var(--border-muted)' }}
    >
      {tokens.map((t, i) => (
        <TokenRow key={t.id} token={t} top={i === 0} onRemove={() => { onRemove(t); }} />
      ))}
    </div>
  );
}

function TokenRow({ token, top, onRemove }: { token: Token; top: boolean; onRemove: () => void }) {
  const stale = token.lastUsedAt === 'Never';
  const expired = token.expiresAt && new Date(token.expiresAt) < new Date('2026-05-10');
  return (
    <div
      className="flex items-start gap-3 px-3 py-3"
      style={{
        background: 'var(--bg-canvas)',
        borderTop: top ? 'none' : '1px solid var(--border-muted)',
      }}
    >
      <span
        className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
        style={{
          background: stale || expired ? 'var(--intent-warn-bg)' : 'var(--bg-surface-muted)',
          border: `1px solid ${stale || expired ? 'var(--intent-warn-fg)' : 'var(--border-muted)'}`,
        }}
      >
        <Key className="w-4 h-4" style={{ color: stale || expired ? 'var(--intent-warn-fg)' : 'var(--fg-muted)' }} />
      </span>

      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold" style={{ color: 'var(--fg-strong)' }}>
            {token.name}
          </span>
          <code className="font-mono text-xs" style={{ color: 'var(--fg-subtle)' }}>
            {token.prefix}…{Array.from({ length: 24 }, () => '•').join('')}
          </code>
          {(stale || expired) && (
            <span
              className="text-2xs uppercase tracking-eyebrow font-semibold px-1.5 py-0.5 rounded"
              style={{
                background: 'var(--intent-warn-bg)',
                color: 'var(--intent-warn-fg)',
                border: '1px solid var(--intent-warn-fg)',
              }}
            >
              {expired ? 'Expired' : 'Unused'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5 text-xs mt-0.5" style={{ color: 'var(--fg-subtle)' }}>
          <span>Created {token.createdAt}</span>
          {token.expiresAt && <span>· Expires {token.expiresAt}</span>}
          {!token.expiresAt && <span style={{ color: 'var(--intent-warn-fg)' }}>· Never expires</span>}
          <span>· Last used {token.lastUsedAt}</span>
        </div>

        <ScopeChips scopes={token.scopes} />
      </div>

      <Button variant="ghost" onClick={onRemove}>
        <Trash2 className="w-3 h-3" />
        Revoke
      </Button>
    </div>
  );
}

function ScopeChips({ scopes }: { scopes: ScopeId[] }) {
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {scopes.map((s) => {
        const meta = ALL_SCOPES.find((x) => x.id === s);
        const dangerous = meta?.danger;
        return (
          <span
            key={s}
            className="inline-flex items-center text-2xs font-mono px-1.5 py-0.5 rounded"
            style={{
              background: dangerous ? 'var(--intent-warn-bg)' : 'var(--bg-surface-muted)',
              color: dangerous ? 'var(--intent-warn-fg)' : 'var(--fg-muted)',
              border: `1px solid ${dangerous ? 'var(--intent-warn-fg)' : 'var(--border-muted)'}`,
            }}
          >
            {s}
          </span>
        );
      })}
    </div>
  );
}
