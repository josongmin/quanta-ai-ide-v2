import { useState } from 'react';
import {
  KeySquare, Plus, ShieldAlert, Boxes,
} from 'lucide-react';
import { OrgShell } from '../parts/OrgShell';
import { Button } from '@shared/ui/forms';
import { ConfirmDialog, RevealOnceModal } from '@shared/ui';
import { PatList } from './parts/api-oauth/PatList';
import { AppList } from './parts/api-oauth/AppList';
import { CreatePatModal } from './parts/api-oauth/CreatePatModal';
import type { Pat, OAuthApp, Scope } from './parts/api-oauth/types';

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
              className="inline-flex items-center gap-2 h-9 px-3 text-base font-medium transition-colors -mb-px"
              style={{
                color: active ? 'var(--fg-strong)' : 'var(--fg-muted)',
                borderBottom: `2px solid ${active ? 'var(--fg-accent)' : 'transparent'}`,
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              <span
                className="text-xs tabular-nums px-1.5 py-0.5 rounded"
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

      <p className="text-sm mt-4 px-1 flex items-start gap-1.5" style={{ color: 'var(--fg-subtle)' }}>
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
        <RevealOnceModal
          title={<>Token &quot;{revealedToken.name}&quot; created</>}
          value={revealedToken.value}
          onDismiss={() => { setRevealedToken(null); }}
        />
      )}
      {confirmDelete && (
        <ConfirmDialog
          open
          onCancel={() => { setConfirmDelete(null); }}
          onConfirm={() => {
            if (confirmDelete.kind === 'pat') removePat(confirmDelete.id);
            else removeApp(confirmDelete.id);
            setConfirmDelete(null);
          }}
          title={confirmDelete.kind === 'pat' ? `Revoke "${confirmDelete.name}"?` : `Delete "${confirmDelete.name}"?`}
          confirmLabel={confirmDelete.kind === 'pat' ? 'Revoke' : 'Delete'}
          description={
            confirmDelete.kind === 'pat'
              ? 'Any client using this token will start getting 401 immediately. This action cannot be undone.'
              : 'Existing OAuth installs will be invalidated. Users will be prompted to reauthorize on next sign-in.'
          }
        />
      )}
    </OrgShell>
  );
}
