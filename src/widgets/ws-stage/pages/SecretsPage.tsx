import { useMemo, useState } from 'react';
import {
  Search, Plus, MoreHorizontal, RotateCw, ShieldCheck, Trash2,
  Eye, EyeOff, X, Copy, Check, AlertTriangle,
} from 'lucide-react';
import { WsShell } from '../parts/WsShell';
import { Button } from '@shared/ui/forms';
import { ModalBackdrop } from '@shared/ui';

type SecretScope = 'ci' | 'agents' | 'fix-pipeline' | 'webhooks';

type Secret = {
  id: string;
  name: string;
  scopes: SecretScope[];
  lastRotated: string;        // ISO date
  lastAccessed: string;       // relative phrase
  expiresAt: string | null;   // ISO date or null
};

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

const ALL_SCOPES: SecretScope[] = ['ci', 'agents', 'fix-pipeline', 'webhooks'];

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
        <ConfirmDelete
          secret={confirmDelete}
          onCancel={() => { setConfirmDelete(null); }}
          onConfirm={() => { remove(confirmDelete); }}
        />
      )}
      {confirmRotateAll && (
        <ConfirmRotateAll
          count={secrets.length}
          onCancel={() => { setConfirmRotateAll(false); }}
          onConfirm={rotateAll}
        />
      )}
    </WsShell>
  );
}

function SecretRow({
  secret, onRotate, onDelete,
}: { secret: Secret; onRotate: () => void; onDelete: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div
      role="row"
      className="grid items-center px-3 h-12 text-[12px] transition-colors"
      style={{
        gridTemplateColumns: '1fr 220px 110px 100px 32px',
        gap: 12,
        borderTop: '1px solid var(--border-muted)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <span
        className="font-mono uppercase truncate font-medium"
        style={{ color: 'var(--fg-strong)' }}
      >
        {secret.name}
      </span>
      <div className="flex flex-wrap gap-1">
        {secret.scopes.map((sc) => (
          <span
            key={sc}
            className="text-[10px] font-mono px-1.5 py-0.5 rounded"
            style={{
              background: 'var(--bg-surface-muted)',
              color: 'var(--fg-default)',
              border: '1px solid var(--border-muted)',
            }}
          >
            {sc}
          </span>
        ))}
      </div>
      <span className="tabular-nums text-[11px]" style={{ color: 'var(--fg-muted)' }}>
        {secret.lastRotated}
      </span>
      <span className="tabular-nums text-[11px]" style={{ color: 'var(--fg-muted)' }}>
        {secret.lastAccessed}
      </span>
      <div className="relative flex justify-end">
        <button
          type="button"
          onClick={() => { setMenuOpen((v) => !v); }}
          className="w-7 h-7 rounded-md inline-flex items-center justify-center transition-colors"
          style={{ color: 'var(--fg-subtle)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-active)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          aria-label="Row actions"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
        {menuOpen && (
          <>
            <button type="button" aria-label="Dismiss menu" className="fixed inset-0 z-30 bg-transparent border-0 p-0 cursor-default" onClick={() => { setMenuOpen(false); }} />
            <div
              className="absolute right-0 top-full mt-1 z-40 min-w-[180px] py-1 rounded-md"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <RowMenuItem icon={RotateCw}    label="Rotate"      onClick={() => { setMenuOpen(false); onRotate(); }} />
              <RowMenuItem icon={ShieldCheck} label="View scopes" onClick={() => { setMenuOpen(false); }} />
              <RowMenuItem icon={Trash2}      label="Delete"      onClick={() => { setMenuOpen(false); onDelete(); }} danger />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function RowMenuItem({
  icon: Icon, label, onClick, danger = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 w-full px-3 h-8 text-[12px] transition-colors text-left"
      style={{ color: danger ? 'var(--intent-danger-fg)' : 'var(--fg-default)' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

function NewSecretModal({
  onCancel, onCreate,
}: { onCancel: () => void; onCreate: (name: string, scopes: SecretScope[], exp: number | null) => void }) {
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [reveal, setReveal] = useState(false);
  const [scopes, setScopes] = useState<Set<SecretScope>>(new Set(['agents']));
  const [exp, setExp] = useState<number | null>(90);

  const valid = /^[A-Z][A-Z0-9_]*$/.test(name) && value.length > 0 && scopes.size > 0;

  const toggle = (s: SecretScope) => {
    setScopes((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  };

  return (
    <>
      <ModalBackdrop onClick={onCancel} z="z-40" alpha={0.45} />
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[520px] max-h-[85vh] flex flex-col rounded-lg overflow-hidden"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-md)' }}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-muted)' }}>
          <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>New secret</span>
          <button type="button" onClick={onCancel} className="w-7 h-7 inline-flex items-center justify-center" style={{ color: 'var(--fg-muted)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4 overflow-y-auto">
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.14em] font-medium" style={{ color: 'var(--fg-subtle)' }}>
              Name (uppercase, snake_case)
            </span>
            <input
              value={name}
              onChange={(e) => { setName(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '')); }}
              placeholder="e.g. STRIPE_API_KEY"
              className="h-9 rounded-md px-3 text-[12px] outline-none font-mono"
              style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)', color: 'var(--fg-strong)' }}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.14em] font-medium flex items-center justify-between" style={{ color: 'var(--fg-subtle)' }}>
              <span>Value</span>
              <button
                type="button"
                onClick={() => { setReveal((v) => !v); }}
                className="lowercase tracking-normal inline-flex items-center gap-1"
                style={{ color: 'var(--fg-muted)' }}
              >
                {reveal ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {reveal ? 'hide' : 'show'}
              </button>
            </span>
            <textarea
              value={value}
              onChange={(e) => { setValue(e.target.value); }}
              placeholder="paste secret value"
              rows={3}
              className="w-full rounded-md p-2.5 text-[12px] outline-none resize-none font-mono"
              style={{
                background: 'var(--bg-surface-muted)',
                border: '1px solid var(--border-default)',
                color: 'var(--fg-strong)',
                WebkitTextSecurity: reveal ? 'none' : 'disc',
              } as React.CSSProperties}
            />
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-[0.14em] font-medium" style={{ color: 'var(--fg-subtle)' }}>
              Scopes
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {ALL_SCOPES.map((s) => {
                const on = scopes.has(s);
                return (
                  <label
                    key={s}
                    className="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors"
                    style={{
                      background: on ? 'color-mix(in srgb, var(--fg-accent) 14%, transparent)' : 'var(--bg-surface-muted)',
                      border: `1px solid ${on ? 'color-mix(in srgb, var(--fg-accent) 40%, transparent)' : 'var(--border-muted)'}`,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => { toggle(s); }}
                      className="w-3.5 h-3.5 cursor-pointer"
                    />
                    <span className="font-mono text-[11px]" style={{ color: 'var(--fg-default)' }}>{s}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.14em] font-medium" style={{ color: 'var(--fg-subtle)' }}>
              Expiration
            </span>
            <select
              value={exp == null ? 'never' : String(exp)}
              onChange={(e) => { setExp(e.target.value === 'never' ? null : Number(e.target.value)); }}
              className="h-9 rounded-md px-3 text-[12px] outline-none cursor-pointer"
              style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)', color: 'var(--fg-strong)' }}
            >
              <option value="never">Never</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="365">365 days</option>
            </select>
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3" style={{ borderTop: '1px solid var(--border-muted)', background: 'var(--bg-surface-muted)' }}>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button
            variant="primary"
            size="md"
            disabled={!valid}
            onClick={() => { onCreate(name, Array.from(scopes), exp); }}
          >
            Generate
          </Button>
        </div>
      </div>
    </>
  );
}

function RevealOnceModal({
  name, value, onClose,
}: { name: string; value: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    try { void navigator.clipboard.writeText(value); } catch { /* noop */ }
    setCopied(true);
    setTimeout(() => { setCopied(false); }, 1500);
  };
  return (
    <>
      <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.55)' }} />
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[520px] rounded-lg overflow-hidden"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-md)' }}
      >
        <div className="p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4" style={{ color: 'var(--intent-success-fg)' }} />
            <span className="text-[12px] font-semibold font-mono" style={{ color: 'var(--fg-strong)' }}>
              {name} stored
            </span>
          </div>
          <p className="text-[12px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
            Copy this value now — for security, it can&apos;t be shown again. You can rotate to generate a new one later.
          </p>
          <div
            className="flex items-center gap-2 p-2.5 rounded-md"
            style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}
          >
            <code className="flex-1 font-mono text-[11px] break-all" style={{ color: 'var(--fg-strong)' }}>
              {value}
            </code>
            <Button leading={copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} onClick={copy}>
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-4 py-3" style={{ borderTop: '1px solid var(--border-muted)', background: 'var(--bg-surface-muted)' }}>
          <Button variant="primary" size="md" onClick={onClose}>I&apos;ve saved it</Button>
        </div>
      </div>
    </>
  );
}

function ConfirmDelete({
  secret, onCancel, onConfirm,
}: { secret: Secret; onCancel: () => void; onConfirm: () => void }) {
  return (
    <>
      <ModalBackdrop onClick={onCancel} z="z-40" alpha={0.45} />
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[420px] rounded-lg overflow-hidden"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-md)' }}
      >
        <div className="p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" style={{ color: 'var(--intent-danger-fg)' }} />
            <span className="text-[12px] font-semibold font-mono" style={{ color: 'var(--fg-strong)' }}>
              Delete {secret.name}?
            </span>
          </div>
          <p className="text-[12px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
            Any CI run, agent, or webhook resolving this secret will start failing immediately. This cannot be undone.
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 px-4 py-3" style={{ borderTop: '1px solid var(--border-muted)', background: 'var(--bg-surface-muted)' }}>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" size="md" onClick={onConfirm}>Delete</Button>
        </div>
      </div>
    </>
  );
}

function ConfirmRotateAll({
  count, onCancel, onConfirm,
}: { count: number; onCancel: () => void; onConfirm: () => void }) {
  return (
    <>
      <ModalBackdrop onClick={onCancel} z="z-40" alpha={0.45} />
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[440px] rounded-lg overflow-hidden"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-md)' }}
      >
        <div className="p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" style={{ color: 'var(--intent-danger-fg)' }} />
            <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>
              Rotate all {count} secrets?
            </span>
          </div>
          <p className="text-[12px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
            New values will be generated for every secret in this workspace. In-flight runs holding the old values will fail until they pick up the new ones. New values will be shown once, then never again.
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 px-4 py-3" style={{ borderTop: '1px solid var(--border-muted)', background: 'var(--bg-surface-muted)' }}>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" size="md" onClick={onConfirm}>Rotate all</Button>
        </div>
      </div>
    </>
  );
}
