import { useMemo, useState } from 'react';
import { Search, Plus, X, AlertTriangle } from 'lucide-react';
import { WsShell } from '../parts/WsShell';
import { Button } from '@shared/ui/forms';
import { ConfirmDialog } from '@shared/ui';
import {
  SecretRow, NewSecretModal, RevealOnceModal,
  type Secret, type SecretScope,
} from './secrets-parts';

const SEED: Secret[] = [
  { id: 's1', name: 'STRIPE_API_KEY',     scopes: ['ci', 'agents', 'fix-pipeline'], lastRotated: '2026-04-22', lastAccessed: '4m ago',  expiresAt: '2026-07-22' },
  { id: 's2', name: 'GITHUB_APP_PRIVKEY', scopes: ['ci', 'agents'],                  lastRotated: '2026-03-11', lastAccessed: '1h ago',  expiresAt: null         },
  { id: 's3', name: 'SLACK_WEBHOOK_URL',  scopes: ['webhooks'],                      lastRotated: '2026-02-08', lastAccessed: '12m ago', expiresAt: null         },
  { id: 's4', name: 'PG_PASSWORD',        scopes: ['ci'],                            lastRotated: '2026-04-30', lastAccessed: '3h ago',  expiresAt: '2026-10-30' },
  { id: 's5', name: 'OPENAI_API_KEY',     scopes: ['agents', 'fix-pipeline'],        lastRotated: '2026-05-01', lastAccessed: '8m ago',  expiresAt: '2026-08-01' },
  { id: 's6', name: 'AWS_S3_ACCESS_KEY',  scopes: ['ci', 'agents'],                  lastRotated: '2026-01-19', lastAccessed: '2d ago',  expiresAt: null         },
  { id: 's7', name: 'PAGERDUTY_TOKEN',    scopes: ['webhooks', 'fix-pipeline'],      lastRotated: '2026-03-26', lastAccessed: '6h ago',  expiresAt: '2027-03-26' },
  { id: 's8', name: 'SENTRY_DSN',         scopes: ['agents'],                        lastRotated: '2025-12-04', lastAccessed: '1w ago',  expiresAt: null         },
];

export default function SecretsPage() {
  const [secrets, setSecrets] = useState<Secret[]>(SEED);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [revealed, setRevealed] = useState<{ name: string; value: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Secret | null>(null);
  const [confirmRotateAll, setConfirmRotateAll] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return secrets;
    return secrets.filter((s) =>
      s.name.toLowerCase().includes(q) || s.scopes.some((sc) => sc.includes(q)),
    );
  }, [secrets, query]);

  const addSecret = (name: string, scopes: SecretScope[], expiresInDays: number | null) => {
    const id = `sec-${Date.now()}`;
    const value = `sk_live_${Math.random().toString(36).slice(2, 14)}${Math.random().toString(36).slice(2, 14)}`;
    const today = new Date('2026-05-11');
    const exp = expiresInDays
      ? new Date(today.getTime() + expiresInDays * 86400000).toISOString().slice(0, 10)
      : null;
    setSecrets((all) => [
      ...all,
      { id, name, scopes, lastRotated: '2026-05-11', lastAccessed: 'never', expiresAt: exp },
    ]);
    setRevealed({ name, value });
  };

  const rotate = (s: Secret) => {
    setSecrets((all) => all.map((x) => (x.id === s.id ? { ...x, lastRotated: '2026-05-11' } : x)));
    let seed = 0;
    for (let i = 0; i < s.id.length; i += 1) seed = (seed * 31 + s.id.charCodeAt(i)) | 0;
    seed = (seed ^ s.name.length * 9301) >>> 0;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const make = () => Array.from({ length: 12 }, () => chars[Math.floor(rand() * chars.length)]).join('');
    const value = `sk_live_${make()}${make()}`;
    setRevealed({ name: s.name, value });
  };

  const remove = (s: Secret) => {
    setSecrets((all) => all.filter((x) => x.id !== s.id));
    setConfirmDelete(null);
  };

  const rotateAll = () => {
    setSecrets((all) => all.map((s) => ({ ...s, lastRotated: '2026-05-11' })));
    setConfirmRotateAll(false);
  };

  return (
    <WsShell
      orgName="ACME, Inc."
      orgSlug="acme"
      wsName="monorepo"
      wsSlug="monorepo"
      title="Secrets"
      subtitle="Encrypted values used by CI runs, agents, and webhooks. Values are write-once: once stored, they can be rotated but not re-displayed."
      topRight={
        <Button variant="primary" size="md" leading={<Plus className="w-3.5 h-3.5" />} onClick={() => { setCreating(true); }}>
          New secret
        </Button>
      }
    >
      {/* Search */}
      <div
        className="flex items-center gap-2 h-9 px-3 rounded-md mb-4"
        style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)' }}
      >
        <Search className="w-3.5 h-3.5" style={{ color: 'var(--fg-subtle)' }} />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); }}
          placeholder="Search by name or scope…"
          className="flex-1 bg-transparent outline-none text-[12px]"
          style={{ color: 'var(--fg-strong)' }}
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); }}
            className="w-5 h-5 inline-flex items-center justify-center rounded"
            style={{ color: 'var(--fg-subtle)' }}
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md overflow-hidden" style={{ border: '1px solid var(--border-muted)' }}>
        <div
          className="grid items-center px-3 h-9 text-[10px] uppercase tracking-[0.14em] font-semibold"
          style={{
            gridTemplateColumns: '1fr 220px 110px 100px 32px',
            gap: 12,
            background: 'var(--bg-surface-muted)',
            color: 'var(--fg-subtle)',
            borderBottom: '1px solid var(--border-muted)',
          }}
        >
          <span>Name</span>
          <span>Scope</span>
          <span>Last rotated</span>
          <span>Last accessed</span>
          <span />
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-[12px]" style={{ color: 'var(--fg-subtle)' }}>
            No secrets match &quot;{query}&quot;.
          </div>
        ) : (
          filtered.map((s) => (
            <SecretRow
              key={s.id}
              secret={s}
              onRotate={() => { rotate(s); }}
              onDelete={() => { setConfirmDelete(s); }}
            />
          ))
        )}
      </div>

      {/* Danger row */}
      <div
        className="flex items-start gap-3 mt-8 p-4 rounded-md"
        style={{
          background: 'var(--intent-danger-bg)',
          border: '1px solid color-mix(in srgb, var(--intent-danger-fg) 45%, transparent)',
        }}
      >
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--intent-danger-fg)' }} />
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <span className="text-[12px] font-semibold" style={{ color: 'var(--intent-danger-fg)' }}>
            Rotate all secrets
          </span>
          <span className="text-[11px] leading-snug" style={{ color: 'var(--fg-muted)' }}>
            Generates new values for every secret in this workspace. Any CI run / agent run still using the old value will fail until it picks up the new one.
          </span>
        </div>
        <Button variant="danger" size="md" onClick={() => { setConfirmRotateAll(true); }}>
          Rotate all
        </Button>
      </div>

      {creating && (
        <NewSecretModal
          onCancel={() => { setCreating(false); }}
          onCreate={(name, scopes, exp) => { addSecret(name, scopes, exp); setCreating(false); }}
        />
      )}
      {revealed && (
        <RevealOnceModal
          name={revealed.name}
          value={revealed.value}
          onClose={() => { setRevealed(null); }}
        />
      )}
      {confirmDelete && (
        <ConfirmDialog
          open
          onCancel={() => { setConfirmDelete(null); }}
          onConfirm={() => { remove(confirmDelete); }}
          title={`Delete ${confirmDelete.name}?`}
          monoTitle
          confirmLabel="Delete"
          description="Any CI run, agent, or webhook resolving this secret will start failing immediately. This cannot be undone."
        />
      )}
      {confirmRotateAll && (
        <ConfirmDialog
          open
          onCancel={() => { setConfirmRotateAll(false); }}
          onConfirm={rotateAll}
          title={`Rotate all ${secrets.length} secrets?`}
          confirmLabel="Rotate all"
          width={440}
          description="New values will be generated for every secret in this workspace. In-flight runs holding the old values will fail until they pick up the new ones. New values will be shown once, then never again."
        />
      )}
    </WsShell>
  );
}
