import { useState, type CSSProperties } from 'react';
import {
  CheckCircle2, Circle, RefreshCcw, Copy, Check, Plus, Trash2,
  KeyRound, UserPlus, UserMinus, UserCog, ShieldAlert,
} from 'lucide-react';
import { OrgShell } from '../parts/OrgShell';
import { Section, Row, Toggle, Button, SaveBar } from '@shared/ui/forms';
import { shallowEqual } from '@shared/lib';
import { RevealOnceModal } from '@shared/ui';

type Status = 'connected' | 'not-configured';

type GroupMap = { id: string; idpGroup: string; team: string };

type SyncEntry = {
  id: string;
  ts: string;
  action: 'created' | 'updated' | 'deactivated';
  target: string;
  count: number;
  ok: boolean;
};

const TEAMS = ['Engineering', 'Security', 'Product', 'Design', 'Data', 'GTM', 'Ops', 'Support'];

const INITIAL_GROUPS: GroupMap[] = [
  { id: 'g1', idpGroup: 'okta-eng-all',       team: 'Engineering' },
  { id: 'g2', idpGroup: 'okta-secops',        team: 'Security' },
  { id: 'g3', idpGroup: 'okta-pm',            team: 'Product' },
  { id: 'g4', idpGroup: 'okta-data-platform', team: 'Data' },
];

const SEED_LOG: SyncEntry[] = [
  { id: 'l1', ts: '2026-05-11 10:14:02', action: 'created',     target: 'haruto.suzuki@acme.com',           count: 1,  ok: true  },
  { id: 'l2', ts: '2026-05-11 10:14:02', action: 'updated',     target: 'okta-eng-all → Engineering',       count: 14, ok: true  },
  { id: 'l3', ts: '2026-05-11 10:14:01', action: 'deactivated', target: 'jorge.calderon@acme.com',          count: 1,  ok: true  },
  { id: 'l4', ts: '2026-05-11 04:13:58', action: 'updated',     target: 'profile sync (mei.wang)',          count: 1,  ok: true  },
  { id: 'l5', ts: '2026-05-10 22:13:51', action: 'created',     target: 'okta-secops → Security',           count: 3,  ok: true  },
  { id: 'l6', ts: '2026-05-10 16:13:44', action: 'updated',     target: 'profile sync (3 users)',           count: 3,  ok: false },
];

const SCIM_BASE_URL = 'https://app.se-field.com/scim/v2/acme';

export default function ScimPage() {
  const [status] = useState<Status>('connected');
  const [lastSync, setLastSync] = useState('2026-05-11 10:14 UTC');
  const [autoCreate, setAutoCreate] = useState(true);
  const [autoDeactivate, setAutoDeactivate] = useState(true);
  const [syncGroups, setSyncGroups] = useState(true);
  const [groups, setGroups] = useState<GroupMap[]>(INITIAL_GROUPS);
  const [tokenModal, setTokenModal] = useState<string | null>(null);
  const [savedToken, setSavedToken] = useState(true);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved'>('idle');

  const dirty = !shallowEqual(
    { autoCreate, autoDeactivate, syncGroups, groups },
    { autoCreate: true, autoDeactivate: true, syncGroups: true, groups: INITIAL_GROUPS },
  );

  const generate = () => {
    const tok = `scim_${Math.random().toString(36).slice(2, 10)}_${Math.random().toString(36).slice(2, 22)}`;
    setTokenModal(tok);
    setSavedToken(false);
  };

  const addGroup = () => {
    setGroups((g) => [...g, { id: `g-${Date.now()}`, idpGroup: '', team: 'Engineering' }]);
  };
  const removeGroup = (id: string) => { setGroups((g) => g.filter((x) => x.id !== id)); };
  const setGroup = (id: string, patch: Partial<GroupMap>) => {
    setGroups((g) => g.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  };

  const save = () => {
    setSavingState('saving');
    setTimeout(() => {
      setSavingState('saved');
      setTimeout(() => { setSavingState('idle'); }, 1200);
    }, 600);
  };

  return (
    <OrgShell
      orgName="ACME, Inc."
      orgSlug="acme"
      title="SCIM provisioning"
      subtitle="Push users and groups from your identity provider with SCIM 2.0."
    >
      <StatusBand
        status={status}
        lastSync={lastSync}
        onSync={() => { setLastSync(new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC'); }}
      />

      <Section title="Endpoint" hint="Paste these into your IdP's SCIM provisioning configuration.">
        <CopyRow label="SCIM Base URL" value={SCIM_BASE_URL} />
        <Row label="Bearer token" sub="Generate a token to authenticate SCIM requests. Tokens are shown once.">
          <Button leading={<KeyRound className="w-3 h-3" />} onClick={generate}>Generate new token</Button>
        </Row>
      </Section>

      <Section title="Sync rules" hint="What the SCIM connector is allowed to do.">
        <Row label="Auto-create users" sub="Create accounts when the IdP sends a SCIM POST.">
          <Toggle checked={autoCreate} onChange={setAutoCreate} />
        </Row>
        <Row label="Auto-deactivate on remove" sub="When a user is unassigned in the IdP, deactivate their session and revoke tokens.">
          <Toggle checked={autoDeactivate} onChange={setAutoDeactivate} />
        </Row>
        <Row label="Sync groups → teams" sub="Mirror IdP group membership onto ACME teams using the mapping below.">
          <Toggle checked={syncGroups} onChange={setSyncGroups} />
        </Row>
      </Section>

      <Section
        title="Group → team mapping"
        hint="Map IdP group names to ACME teams. Unmapped groups are ignored."
        right={<Button leading={<Plus className="w-3 h-3" />} onClick={addGroup}>Add mapping</Button>}
      >
        <div className="rounded-md overflow-hidden" style={{ border: '1px solid var(--border-muted)', opacity: syncGroups ? 1 : 0.5 }}>
          <div
            className="grid items-center px-3 h-9 text-[10px] uppercase tracking-[0.14em] font-semibold"
            style={{
              gridTemplateColumns: '1fr 200px 32px',
              gap: 12,
              background: 'var(--bg-surface-muted)',
              color: 'var(--fg-subtle)',
              borderBottom: '1px solid var(--border-muted)',
            }}
          >
            <span>IdP group name</span>
            <span>ACME team</span>
            <span />
          </div>
          {groups.map((g) => (
            <div
              key={g.id}
              className="grid items-center px-3 h-12 text-[12px]"
              style={{
                gridTemplateColumns: '1fr 200px 32px',
                gap: 12,
                borderTop: '1px solid var(--border-muted)',
              }}
            >
              <input
                value={g.idpGroup}
                onChange={(e) => { setGroup(g.id, { idpGroup: e.target.value }); }}
                placeholder="okta-group-name"
                className="h-8 px-2.5 rounded-md text-[11px] font-mono outline-none"
                style={{
                  background: 'var(--bg-surface-muted)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--fg-default)',
                }}
              />
              <select
                value={g.team}
                onChange={(e) => { setGroup(g.id, { team: e.target.value }); }}
                className="h-8 rounded-md px-2.5 text-[12px] outline-none cursor-pointer"
                style={{
                  background: 'var(--bg-surface-muted)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--fg-strong)',
                }}
              >
                {TEAMS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <button
                type="button"
                onClick={() => { removeGroup(g.id); }}
                className="w-7 h-7 rounded-md inline-flex items-center justify-center"
                style={{ color: 'var(--fg-subtle)' }}
                aria-label="Remove mapping"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Recent sync activity" hint="Last 6 SCIM events. Older events are in the audit log.">
        <div className="rounded-md overflow-hidden" style={{ border: '1px solid var(--border-muted)' }}>
          <div
            className="grid items-center px-3 h-9 text-[10px] uppercase tracking-[0.14em] font-semibold"
            style={{
              gridTemplateColumns: '160px 110px 1fr 60px 24px',
              gap: 12,
              background: 'var(--bg-surface-muted)',
              color: 'var(--fg-subtle)',
              borderBottom: '1px solid var(--border-muted)',
            }}
          >
            <span>Timestamp</span>
            <span>Action</span>
            <span>Target</span>
            <span className="text-right">Count</span>
            <span />
          </div>
          {SEED_LOG.map((e) => {
            const ActionIcon = e.action === 'created' ? UserPlus : e.action === 'deactivated' ? UserMinus : UserCog;
            return (
              <div
                key={e.id}
                className="grid items-center px-3 h-11 text-[12px]"
                style={{
                  gridTemplateColumns: '160px 110px 1fr 60px 24px',
                  gap: 12,
                  borderTop: '1px solid var(--border-muted)',
                }}
              >
                <span className="font-mono text-[11px]" style={{ color: 'var(--fg-muted)' }}>{e.ts}</span>
                <span className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--fg-default)' }}>
                  <ActionIcon className="w-3 h-3" style={{ color: 'var(--fg-subtle)' }} />
                  {e.action}
                </span>
                <span className="truncate font-mono text-[11px]" style={{ color: 'var(--fg-strong)' }}>{e.target}</span>
                <span className="font-mono tabular-nums text-right" style={{ color: 'var(--fg-default)' }}>{e.count}</span>
                {e.ok ? (
                  <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--intent-success-fg)' }} />
                ) : (
                  <ShieldAlert className="w-3.5 h-3.5" style={{ color: 'var(--intent-danger-fg)' }} />
                )}
              </div>
            );
          })}
        </div>
      </Section>

      <SaveBar
        visible={dirty || savingState !== 'idle'}
        dirty={dirty}
        savingState={savingState}
        onSave={save}
        onDiscard={() => {
          setAutoCreate(true); setAutoDeactivate(true); setSyncGroups(true); setGroups(INITIAL_GROUPS);
        }}
      />

      {tokenModal !== null && (
        <RevealOnceModal
          title="SCIM token created"
          value={tokenModal}
          saved={savedToken}
          showClose
          onSaved={() => { setSavedToken(true); }}
          onDismiss={() => { setTokenModal(null); }}
        />
      )}
    </OrgShell>
  );
}

function StatusBand({
  status, lastSync, onSync,
}: { status: Status; lastSync: string; onSync: () => void }) {
  const meta: { Icon: React.ComponentType<{ className?: string; style?: CSSProperties }>; label: string; sub: string; fg: string } =
    status === 'connected'
      ? { Icon: CheckCircle2, label: 'Connected', sub: 'SCIM connector is receiving events from Okta.', fg: 'var(--intent-success-fg)' }
      : { Icon: Circle,        label: 'Not configured', sub: 'Generate a token and paste it into your IdP.', fg: 'var(--fg-muted)' };
  const { Icon } = meta;

  return (
    <div
      className="flex items-center gap-4 px-5 py-4 rounded-lg mb-4"
      style={{
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-default)',
      }}
    >
      <div
        className="w-10 h-10 rounded-md flex items-center justify-center shrink-0"
        style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-muted)' }}
      >
        <Icon className="w-5 h-5" style={{ color: meta.fg }} />
      </div>
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <span className="text-[14px] font-semibold" style={{ color: 'var(--fg-strong)' }}>{meta.label}</span>
        <span className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>{meta.sub}</span>
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <span className="text-[10px] uppercase tracking-[0.14em] font-medium" style={{ color: 'var(--fg-subtle)' }}>
          Last sync
        </span>
        <span className="font-mono text-[11px]" style={{ color: 'var(--fg-default)' }}>{lastSync}</span>
      </div>
      <Button leading={<RefreshCcw className="w-3 h-3" />} onClick={onSync}>Sync now</Button>
    </div>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    try { void navigator.clipboard.writeText(value); } catch { /* noop */ }
    setCopied(true);
    setTimeout(() => { setCopied(false); }, 1200);
  };
  return (
    <div className="flex items-center justify-between gap-3 py-3" style={{ borderTop: '1px solid var(--border-muted)' }}>
      <div className="flex flex-col min-w-0 flex-1 gap-1">
        <span className="text-[10px] uppercase tracking-[0.14em] font-medium" style={{ color: 'var(--fg-subtle)' }}>
          {label}
        </span>
        <code className="font-mono text-[11px] truncate" style={{ color: 'var(--fg-strong)' }}>{value}</code>
      </div>
      <Button leading={copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} onClick={copy}>
        {copied ? 'Copied' : 'Copy'}
      </Button>
    </div>
  );
}
