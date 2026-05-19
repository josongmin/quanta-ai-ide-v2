import { useRef, useState } from 'react';
import {
  KeySquare, Plus, Copy, Trash2, Check, X, ShieldAlert, Boxes,
  Globe, AlertTriangle,
} from 'lucide-react';
import { useHoverStyle } from '@shared/lib';
import { OrgShell } from '../parts/OrgShell';
import { Button } from '@shared/ui/forms';

type Scope =
  | 'org:read' | 'org:write' | 'members:read' | 'members:write'
  | 'admission:read' | 'admission:write' | 'agents:read' | 'agents:write'
  | 'webhooks:write' | 'audit:read';

const SCOPE_OPTIONS: { id: Scope; label: string; danger?: boolean }[] = [
  { id: 'org:read',         label: 'Read org settings' },
  { id: 'org:write',        label: 'Manage org settings', danger: true },
  { id: 'members:read',     label: 'Read members' },
  { id: 'members:write',    label: 'Invite/remove members', danger: true },
  { id: 'admission:read',   label: 'Read admission rules' },
  { id: 'admission:write',  label: 'Author admission rules', danger: true },
  { id: 'agents:read',      label: 'Read agents' },
  { id: 'agents:write',     label: 'Trigger agents' },
  { id: 'webhooks:write',   label: 'Manage webhooks' },
  { id: 'audit:read',       label: 'Read audit log' },
];

type Pat = {
  id: string;
  name: string;
  prefix: string;
  scopes: Scope[];
  createdBy: string;
  createdAt: string;
  expiresAt: string | null;
  lastUsed: string;
};

type OAuthApp = {
  id: string;
  name: string;
  clientId: string;
  redirectUri: string;
  scopes: Scope[];
  installs: number;
  createdAt: string;
  status: 'published' | 'draft';
};

const SEED_PATS: Pat[] = [
  { id: 'pat1', name: 'CI deploy gate',     prefix: 'sef_pat_8a31', scopes: ['admission:write', 'agents:write'],            createdBy: 'Sora Kim',     createdAt: '2026-04-19', expiresAt: '2026-10-19', lastUsed: '5m ago'   },
  { id: 'pat2', name: 'Warehouse exporter',  prefix: 'sef_pat_2f9c', scopes: ['audit:read', 'admission:read', 'agents:read'], createdBy: 'Diego Ramos', createdAt: '2026-04-22', expiresAt: null,         lastUsed: '2h ago'   },
  { id: 'pat3', name: 'Onboarding bot',     prefix: 'sef_pat_44b1', scopes: ['members:write', 'org:read'],                  createdBy: 'Lee Junho',    createdAt: '2026-05-02', expiresAt: '2026-06-02', lastUsed: '3d ago'   },
  { id: 'pat4', name: 'Legacy webhook bridge', prefix: 'sef_pat_71de', scopes: ['webhooks:write'],                          createdBy: 'Mei Wang',     createdAt: '2026-03-11', expiresAt: '2026-04-11', lastUsed: 'expired'  },
];

const SEED_APPS: OAuthApp[] = [
  { id: 'app1', name: 'ACME Mobile',     clientId: 'client_8x2k_acme_mobile',     redirectUri: 'https://app.acme.com/oauth/callback',     scopes: ['org:read', 'members:read', 'agents:read'],   installs: 1284, createdAt: '2026-02-09', status: 'published' },
  { id: 'app2', name: 'ACME Reports',    clientId: 'client_3p9q_acme_reports',    redirectUri: 'https://reports.acme.com/oauth/callback', scopes: ['audit:read', 'admission:read'],              installs:   42, createdAt: '2026-03-14', status: 'published' },
  { id: 'app3', name: 'Internal CLI',    clientId: 'client_q8wf_acme_cli',         redirectUri: 'http://localhost:7777/cb',                scopes: ['agents:write', 'admission:read'],            installs:    3, createdAt: '2026-05-04', status: 'draft' },
];

type Tab = 'pat' | 'oauth';

export default function ApiOAuthPage() {
  const [tab, setTab] = useState<Tab>('pat');
  const [pats, setPats] = useState<Pat[]>(SEED_PATS);
  const [apps, setApps] = useState<OAuthApp[]>(SEED_APPS);
  const [createPat, setCreatePat] = useState(false);
  const [revealedToken, setRevealedToken] = useState<{ name: string; value: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ kind: 'pat' | 'app'; id: string; name: string } | null>(null);

  const addPat = (name: string, scopes: Scope[], expiresInDays: number | null) => {
    const id = `pat-${Date.now()}`;
    const prefix = `sef_pat_${Math.random().toString(16).slice(2, 6)}`;
    const value = `${prefix}_${Math.random().toString(36).slice(2, 18)}${Math.random().toString(36).slice(2, 18)}`;
    setPats((all) => [...all, {
      id, name, prefix, scopes, createdBy: 'Sora Kim', createdAt: '2026-05-11',
      expiresAt: expiresInDays ? `2026-05-${String(11 + expiresInDays).padStart(2, '0')}` : null,
      lastUsed: 'never',
    }]);
    setRevealedToken({ name, value });
  };
  const removePat = (id: string) => { setPats((all) => all.filter((p) => p.id !== id)); };
  const removeApp = (id: string) => { setApps((all) => all.filter((a) => a.id !== id)); };

  return (
    <OrgShell
      orgName="ACME, Inc."
      orgSlug="acme"
      title="API & OAuth"
      subtitle="Org-scoped credentials and OAuth applications. Personal tokens live under /me/api-tokens."
      topRight={
        tab === 'pat' ? (
          <Button variant="primary" size="md" leading={<Plus className="w-3.5 h-3.5" />} onClick={() => { setCreatePat(true); }}>
            New token
          </Button>
        ) : (
          <Button variant="primary" size="md" leading={<Plus className="w-3.5 h-3.5" />}>
            Register app
          </Button>
        )
      }
    >
      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4" style={{ borderBottom: '1px solid var(--border-muted)' }}>
        {([
          { id: 'pat' as const,   label: 'Personal access tokens', icon: KeySquare, count: pats.length },
          { id: 'oauth' as const, label: 'OAuth applications',     icon: Boxes,     count: apps.length },
        ]).map(({ id, label, icon: Icon, count }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => { setTab(id); }}
              className="inline-flex items-center gap-2 h-9 px-3 text-[12px] font-medium transition-colors -mb-px"
              style={{
                color: active ? 'var(--fg-strong)' : 'var(--fg-muted)',
                borderBottom: `2px solid ${active ? 'var(--brand-vivid)' : 'transparent'}`,
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              <span
                className="text-[10px] tabular-nums px-1.5 py-0.5 rounded"
                style={{ background: 'var(--bg-surface-muted)', color: 'var(--fg-subtle)' }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {tab === 'pat' ? (
        <PatList
          pats={pats}
          onDelete={(p) => { setConfirmDelete({ kind: 'pat', id: p.id, name: p.name }); }}
        />
      ) : (
        <AppList
          apps={apps}
          onDelete={(a) => { setConfirmDelete({ kind: 'app', id: a.id, name: a.name }); }}
        />
      )}

      <p className="text-[11px] mt-4 px-1 flex items-start gap-1.5" style={{ color: 'var(--fg-subtle)' }}>
        <ShieldAlert className="w-3 h-3 mt-0.5 shrink-0" />
        Tokens authenticate as the org. Anything they do is auditable but not always reversible.
      </p>

      {createPat && (
        <CreatePatModal
          onCancel={() => { setCreatePat(false); }}
          onCreate={(name, scopes, exp) => { addPat(name, scopes, exp); setCreatePat(false); }}
        />
      )}
      {revealedToken && (
        <RevealTokenModal
          name={revealedToken.name}
          token={revealedToken.value}
          onClose={() => { setRevealedToken(null); }}
        />
      )}
      {confirmDelete && (
        <ConfirmDelete
          name={confirmDelete.name}
          kind={confirmDelete.kind}
          onCancel={() => { setConfirmDelete(null); }}
          onConfirm={() => {
            if (confirmDelete.kind === 'pat') removePat(confirmDelete.id);
            else removeApp(confirmDelete.id);
            setConfirmDelete(null);
          }}
        />
      )}
    </OrgShell>
  );
}

function PatList({ pats, onDelete }: { pats: Pat[]; onDelete: (p: Pat) => void }) {
  if (pats.length === 0) {
    return (
      <div className="text-center py-12 text-[12px]" style={{ color: 'var(--fg-subtle)' }}>
        No tokens yet. Create one to authenticate machine clients to the org API.
      </div>
    );
  }
  return (
    <div className="rounded-md overflow-hidden" style={{ border: '1px solid var(--border-muted)' }}>
      <div
        className="grid items-center px-3 h-9 text-[10px] uppercase tracking-[0.14em] font-semibold"
        style={{
          gridTemplateColumns: '1fr 200px 110px 100px 32px',
          gap: 12,
          color: 'var(--fg-subtle)',
          borderBottom: '1px solid var(--border-muted)',
        }}
      >
        <span>Token</span>
        <span>Scopes</span>
        <span>Expires</span>
        <span>Last used</span>
        <span />
      </div>
      {pats.map((p) => {
        const expired = p.expiresAt && p.expiresAt < '2026-05-11';
        return (
          <div
            key={p.id}
            role="presentation"
            className="grid items-center px-3 h-14 text-[12px] transition-colors"
            style={{
              gridTemplateColumns: '1fr 200px 110px 100px 32px',
              gap: 12,
              borderTop: '1px solid var(--border-muted)',
              opacity: expired ? 0.55 : 1,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <div className="flex flex-col min-w-0 gap-0.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-medium truncate" style={{ color: 'var(--fg-strong)' }}>{p.name}</span>
                {expired && (
                  <span className="text-[9px] uppercase tracking-[0.14em] font-semibold px-1.5 py-0.5 rounded"
                    style={{ background: 'var(--intent-danger-bg)', color: 'var(--intent-danger-fg)', border: '1px solid var(--intent-danger-fg)' }}>
                    expired
                  </span>
                )}
              </div>
              <span className="font-mono text-[10px] truncate" style={{ color: 'var(--fg-subtle)' }}>
                {p.prefix}…  · created by {p.createdBy} · {p.createdAt}
              </span>
            </div>
            <div className="flex flex-wrap gap-1 min-w-0">
              {p.scopes.slice(0, 2).map((s) => (
                <span
                  key={s}
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded truncate"
                  style={{ background: 'var(--bg-surface-muted)', color: 'var(--fg-default)', border: '1px solid var(--border-muted)' }}
                >
                  {s}
                </span>
              ))}
              {p.scopes.length > 2 && (
                <span className="text-[10px] tabular-nums" style={{ color: 'var(--fg-subtle)' }}>
                  +{p.scopes.length - 2}
                </span>
              )}
            </div>
            <span className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>
              {p.expiresAt ?? 'Never'}
            </span>
            <span className="text-[11px] tabular-nums" style={{ color: 'var(--fg-muted)' }}>
              {p.lastUsed}
            </span>
            <button
              type="button"
              onClick={() => { onDelete(p); }}
              className="w-7 h-7 rounded-md inline-flex items-center justify-center"
              style={{ color: 'var(--fg-subtle)' }}
              aria-label="Revoke token"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function AppList({ apps, onDelete }: { apps: OAuthApp[]; onDelete: (a: OAuthApp) => void }) {
  return (
    <div className="rounded-md overflow-hidden" style={{ border: '1px solid var(--border-muted)' }}>
      <div
        className="grid items-center px-3 h-9 text-[10px] uppercase tracking-[0.14em] font-semibold"
        style={{
          gridTemplateColumns: '1fr 200px 90px 80px 32px',
          gap: 12,
          color: 'var(--fg-subtle)',
          borderBottom: '1px solid var(--border-muted)',
        }}
      >
        <span>App</span>
        <span>Redirect</span>
        <span>Status</span>
        <span>Installs</span>
        <span />
      </div>
      {apps.map((a) => (
        <AppRow key={a.id}>
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center text-[11px] font-black shrink-0"
              style={{
                backgroundImage: 'linear-gradient(135deg, var(--fg-accent), var(--fg-link))',
                color: 'var(--bg-canvas)',
              }}
            >
              {a.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0 gap-0.5">
              <span className="font-medium truncate" style={{ color: 'var(--fg-strong)' }}>{a.name}</span>
              <span className="font-mono text-[10px] truncate" style={{ color: 'var(--fg-subtle)' }}>
                {a.clientId} · {a.scopes.length} scope{a.scopes.length === 1 ? '' : 's'} · since {a.createdAt}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <Globe className="w-3 h-3 shrink-0" style={{ color: 'var(--fg-subtle)' }} />
            <span className="font-mono text-[10px] truncate" style={{ color: 'var(--fg-default)' }}>
              {a.redirectUri}
            </span>
          </div>
          <span
            className="text-[10px] uppercase tracking-[0.14em] font-semibold px-1.5 py-0.5 rounded w-fit"
            style={{
              background: a.status === 'published' ? 'var(--intent-success-bg)' : 'var(--bg-surface-muted)',
              color: a.status === 'published' ? 'var(--intent-success-fg)' : 'var(--fg-muted)',
              border: `1px solid ${a.status === 'published' ? 'var(--intent-success-fg)' : 'var(--border-muted)'}`,
            }}
          >
            {a.status}
          </span>
          <span className="font-mono tabular-nums text-[12px]" style={{ color: 'var(--fg-default)' }}>
            {a.installs}
          </span>
          <button
            type="button"
            onClick={() => { onDelete(a); }}
            className="w-7 h-7 rounded-md inline-flex items-center justify-center"
            style={{ color: 'var(--fg-subtle)' }}
            aria-label="Delete app"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </AppRow>
      ))}
    </div>
  );
}

function AppRow({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useHoverStyle(ref, { background: 'var(--bg-hover)' }, { background: 'transparent' });
  return (
    <div
      ref={ref}
      className="grid items-center px-3 h-14 text-[12px] transition-colors"
      style={{
        gridTemplateColumns: '1fr 200px 90px 80px 32px',
        gap: 12,
        borderTop: '1px solid var(--border-muted)',
      }}
    >
      {children}
    </div>
  );
}

function CreatePatModal({
  onCancel, onCreate,
}: { onCancel: () => void; onCreate: (name: string, scopes: Scope[], expiresInDays: number | null) => void }) {
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<Set<Scope>>(new Set(['org:read']));
  const [exp, setExp] = useState<number | null>(90);
  const valid = name.trim().length > 0 && scopes.size > 0;

  const toggle = (s: Scope) => {
    setScopes((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  };

  return (
    <>
      <button
        type="button"
        aria-label="Close dialog"
        className="fixed inset-0 z-40 bg-transparent border-0 p-0 cursor-default"
        style={{ background: 'rgba(0,0,0,0.45)' }}
        onClick={onCancel}
      />
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[520px] max-h-[80vh] flex flex-col rounded-lg overflow-hidden"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-md)' }}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-muted)' }}>
          <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>New personal access token</span>
          <button type="button" onClick={onCancel} className="w-7 h-7 inline-flex items-center justify-center" style={{ color: 'var(--fg-muted)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 flex flex-col gap-4 overflow-y-auto">
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.14em] font-medium" style={{ color: 'var(--fg-subtle)' }}>Token name</span>
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); }}
              placeholder="e.g. CI deploy gate"
              className="h-9 rounded-md px-3 text-[12px] outline-none"
              style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)', color: 'var(--fg-strong)' }}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.14em] font-medium" style={{ color: 'var(--fg-subtle)' }}>Expires</span>
            <select
              value={exp == null ? 'never' : String(exp)}
              onChange={(e) => { setExp(e.target.value === 'never' ? null : Number(e.target.value)); }}
              className="h-9 rounded-md px-3 text-[12px] outline-none cursor-pointer"
              style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)', color: 'var(--fg-strong)' }}
            >
              <option value="30">30 days</option>
              <option value="60">60 days</option>
              <option value="90">90 days</option>
              <option value="365">1 year</option>
              <option value="never">No expiration</option>
            </select>
          </label>
          <div className="flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-[0.14em] font-medium flex items-center justify-between" style={{ color: 'var(--fg-subtle)' }}>
              <span>Scopes</span>
              <span className="lowercase tracking-normal tabular-nums">{scopes.size} selected</span>
            </span>
            <div className="rounded-md overflow-hidden flex flex-col" style={{ border: '1px solid var(--border-muted)' }}>
              {SCOPE_OPTIONS.map((s) => {
                const on = scopes.has(s.id);
                return (
                  <label
                    key={s.id}
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors"
                    style={{
                      borderTop: '1px solid var(--border-muted)',
                      background: on ? 'var(--bg-active)' : 'transparent',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => { toggle(s.id); }}
                      className="w-3.5 h-3.5 cursor-pointer"
                    />
                    <span
                      className="font-mono text-[11px] flex-1"
                      style={{ color: s.danger ? 'var(--intent-warn-fg)' : 'var(--fg-default)' }}
                    >
                      {s.id}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>{s.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-4 py-3" style={{ borderTop: '1px solid var(--border-muted)', background: 'var(--bg-surface-muted)' }}>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" size="md" disabled={!valid} onClick={() => { onCreate(name.trim(), Array.from(scopes), exp); }}>
            Generate token
          </Button>
        </div>
      </div>
    </>
  );
}

function RevealTokenModal({
  name, token, onClose,
}: { name: string; token: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    try { void navigator.clipboard.writeText(token); } catch { /* noop */ }
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
            <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>
              Token &quot;{name}&quot; created
            </span>
          </div>
          <p className="text-[12px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
            Copy and store this token now — for security, it can&apos;t be shown again.
          </p>
          <div
            className="flex items-center gap-2 p-2.5 rounded-md"
            style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}
          >
            <code className="flex-1 font-mono text-[11px] break-all" style={{ color: 'var(--fg-strong)' }}>
              {token}
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
  name, kind, onCancel, onConfirm,
}: { name: string; kind: 'pat' | 'app'; onCancel: () => void; onConfirm: () => void }) {
  return (
    <>
      <button
        type="button"
        aria-label="Close dialog"
        className="fixed inset-0 z-40 bg-transparent border-0 p-0 cursor-default"
        style={{ background: 'rgba(0,0,0,0.45)' }}
        onClick={onCancel}
      />
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[420px] rounded-lg overflow-hidden"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-md)' }}
      >
        <div className="p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" style={{ color: 'var(--intent-danger-fg)' }} />
            <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>
              {kind === 'pat' ? `Revoke "${name}"?` : `Delete "${name}"?`}
            </span>
          </div>
          <p className="text-[12px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
            {kind === 'pat'
              ? 'Any client using this token will start getting 401 immediately. This action cannot be undone.'
              : 'Existing OAuth installs will be invalidated. Users will be prompted to reauthorize on next sign-in.'}
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 px-4 py-3" style={{ borderTop: '1px solid var(--border-muted)', background: 'var(--bg-surface-muted)' }}>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" size="md" onClick={onConfirm}>{kind === 'pat' ? 'Revoke' : 'Delete'}</Button>
        </div>
      </div>
    </>
  );
}
