import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Shield, Plus, Lock, Copy, Trash2, AlertTriangle, Check, Users } from 'lucide-react';
import { OrgShell } from '../parts/OrgShell';
import { Button, Toggle } from '@shared/ui/forms';

type PermissionId =
  | 'org.read' | 'org.manage'
  | 'members.invite' | 'members.remove' | 'members.role'
  | 'workspaces.create' | 'workspaces.delete' | 'workspaces.settings'
  | 'admission.read' | 'admission.write' | 'admission.bypass'
  | 'agents.run' | 'agents.configure' | 'agents.kill'
  | 'billing.read' | 'billing.manage'
  | 'audit.read' | 'audit.export'
  | 'secrets.read' | 'secrets.write';

type PermissionGroup = { id: string; titleKey: string; perms: { id: PermissionId; labelKey: string; hintKey?: string }[] };

const PERM_GROUPS: PermissionGroup[] = [
  { id: 'org', titleKey: 'roles.group.org', perms: [
    { id: 'org.read',   labelKey: 'roles.perm.orgRead' },
    { id: 'org.manage', labelKey: 'roles.perm.orgManage', hintKey: 'roles.perm.orgManageHint' },
  ]},
  { id: 'members', titleKey: 'roles.group.members', perms: [
    { id: 'members.invite', labelKey: 'roles.perm.membersInvite' },
    { id: 'members.remove', labelKey: 'roles.perm.membersRemove' },
    { id: 'members.role',   labelKey: 'roles.perm.membersRole' },
  ]},
  { id: 'workspaces', titleKey: 'roles.group.workspaces', perms: [
    { id: 'workspaces.create',   labelKey: 'roles.perm.workspacesCreate' },
    { id: 'workspaces.delete',   labelKey: 'roles.perm.workspacesDelete' },
    { id: 'workspaces.settings', labelKey: 'roles.perm.workspacesSettings' },
  ]},
  { id: 'admission', titleKey: 'roles.group.admission', perms: [
    { id: 'admission.read',   labelKey: 'roles.perm.admissionRead' },
    { id: 'admission.write',  labelKey: 'roles.perm.admissionWrite' },
    { id: 'admission.bypass', labelKey: 'roles.perm.admissionBypass', hintKey: 'roles.perm.admissionBypassHint' },
  ]},
  { id: 'agents', titleKey: 'roles.group.agents', perms: [
    { id: 'agents.run',       labelKey: 'roles.perm.agentsRun' },
    { id: 'agents.configure', labelKey: 'roles.perm.agentsConfigure' },
    { id: 'agents.kill',      labelKey: 'roles.perm.agentsKill' },
  ]},
  { id: 'billing', titleKey: 'roles.group.billing', perms: [
    { id: 'billing.read',   labelKey: 'roles.perm.billingRead' },
    { id: 'billing.manage', labelKey: 'roles.perm.billingManage' },
  ]},
  { id: 'observability', titleKey: 'roles.group.observability', perms: [
    { id: 'audit.read',    labelKey: 'roles.perm.auditRead' },
    { id: 'audit.export',  labelKey: 'roles.perm.auditExport' },
    { id: 'secrets.read',  labelKey: 'roles.perm.secretsRead' },
    { id: 'secrets.write', labelKey: 'roles.perm.secretsWrite' },
  ]},
];

type Role = {
  id: string;
  name: string;
  description: string;
  // Built-in roles carry i18n keys; custom roles use the literal name/description.
  nameKey?: string;
  descKey?: string;
  builtIn: boolean;
  memberCount: number;
  permissions: Set<PermissionId>;
};

const ALL_PERMS = new Set<PermissionId>(PERM_GROUPS.flatMap((g) => g.perms.map((p) => p.id)));

const SEED_ROLES: Role[] = [
  {
    id: 'r-owner', name: 'Owner', description: 'Full access. Can transfer ownership and delete the org.',
    nameKey: 'common.role.owner', descKey: 'roles.seed.owner',
    builtIn: true, memberCount: 1, permissions: new Set(ALL_PERMS),
  },
  {
    id: 'r-admin', name: 'Admin', description: 'Manage members, workspaces, and policies. No billing.',
    nameKey: 'common.role.admin', descKey: 'roles.seed.admin',
    builtIn: true, memberCount: 2,
    permissions: new Set<PermissionId>([
      'org.read', 'org.manage', 'members.invite', 'members.remove', 'members.role',
      'workspaces.create', 'workspaces.delete', 'workspaces.settings',
      'admission.read', 'admission.write',
      'agents.run', 'agents.configure', 'agents.kill',
      'audit.read', 'audit.export', 'secrets.read', 'secrets.write',
    ]),
  },
  {
    id: 'r-member', name: 'Member', description: 'Default role. Use the product, ship code, run agents.',
    nameKey: 'common.role.member', descKey: 'roles.seed.member',
    builtIn: true, memberCount: 6,
    permissions: new Set<PermissionId>(['org.read', 'workspaces.settings', 'admission.read', 'agents.run', 'audit.read']),
  },
  {
    id: 'r-billing', name: 'Billing', description: 'Read-only access except for billing surfaces.',
    nameKey: 'common.role.billing', descKey: 'roles.seed.billing',
    builtIn: true, memberCount: 1,
    permissions: new Set<PermissionId>(['org.read', 'billing.read', 'billing.manage', 'audit.read']),
  },
  {
    id: 'r-guest', name: 'Guest', description: 'Limited read on shared workspaces.',
    nameKey: 'common.role.guest', descKey: 'roles.seed.guest',
    builtIn: true, memberCount: 1,
    permissions: new Set<PermissionId>(['org.read']),
  },
  {
    id: 'r-secops', name: 'SecOps', description: 'Custom — security review and audit access.',
    descKey: 'roles.seed.secops',
    builtIn: false, memberCount: 0,
    permissions: new Set<PermissionId>([
      'org.read', 'admission.read', 'admission.write', 'audit.read', 'audit.export', 'secrets.read',
    ]),
  },
];

// Resolve a role's display name / description: built-ins use their i18n key,
// custom roles use whatever the user typed.
function roleName(t: TFunction<'org'>, r: Role): string {
  return r.nameKey ? t(r.nameKey) : r.name;
}
function roleDesc(t: TFunction<'org'>, r: Role): string {
  return r.descKey ? t(r.descKey) : r.description;
}

export default function RolesPage() {
  const { t } = useTranslation('org');
  const [roles, setRoles] = useState<Role[]>(SEED_ROLES);
  const [selectedId, setSelectedId] = useState<string>('r-secops');

  // selectedId always points at an existing role (deletes reset to 'r-owner');
  // fall back to the first role so `selected` is always a Role, never undefined.
  const selected = roles.find((r) => r.id === selectedId) ?? roles[0];

  const togglePerm = (perm: PermissionId) => {
    if (selected.builtIn) return;
    setRoles((all) => all.map((r) => {
      if (r.id !== selected.id) return r;
      const next = new Set(r.permissions);
      if (next.has(perm)) next.delete(perm); else next.add(perm);
      return { ...r, permissions: next };
    }));
  };

  const duplicate = (r: Role) => {
    const id = `r-${Date.now()}`;
    setRoles((all) => [...all, {
      ...r, id, name: t('roles.copySuffix', { name: roleName(t, r) }),
      description: roleDesc(t, r), nameKey: undefined, descKey: undefined,
      builtIn: false, memberCount: 0, permissions: new Set(r.permissions),
    }]);
    setSelectedId(id);
  };
  const remove = (id: string) => {
    setRoles((all) => all.filter((r) => r.id !== id));
    setSelectedId('r-owner');
  };
  const addNew = () => {
    const id = `r-${Date.now()}`;
    setRoles((all) => [...all, {
      id, name: t('roles.newRoleName'), description: '', builtIn: false, memberCount: 0, permissions: new Set<PermissionId>(['org.read']),
    }]);
    setSelectedId(id);
  };
  const rename = (name: string) => {
    if (selected.builtIn) return;
    setRoles((all) => all.map((r) => (r.id === selected.id ? { ...r, name } : r)));
  };
  const redescribe = (description: string) => {
    if (selected.builtIn) return;
    setRoles((all) => all.map((r) => (r.id === selected.id ? { ...r, description } : r)));
  };

  return (
    <OrgShell
      orgName="ACME, Inc."
      orgSlug="acme"
      title={t('roles.title')}
      subtitle={t('roles.subtitle')}
      topRight={
        <Button variant="primary" size="md" leading={<Plus className="w-3.5 h-3.5" />} onClick={addNew}>
          {t('roles.newRole')}
        </Button>
      }
    >
      <div
        className="grid rounded-md overflow-hidden"
        style={{
          gridTemplateColumns: '260px 1fr',
          border: '1px solid var(--border-muted)',
          minHeight: 600,
        }}
      >
        {/* Role list */}
        <div className="flex flex-col" style={{ borderRight: '1px solid var(--border-muted)' }}>
          {roles.map((r, i) => {
            const active = selectedId === r.id;
            const idleBg = active ? 'color-mix(in srgb, var(--fg-accent) 14%, transparent)' : 'transparent';
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => { setSelectedId(r.id); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors"
                style={{
                  background: idleBg,
                  // Skip the divider on the first row — the grid container
                  // already paints a top border, so a row borderTop here
                  // stacked into a 2px line. Borders only between siblings.
                  borderTop: i === 0 ? 'none' : '1px solid var(--border-muted)',
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = idleBg; }}
              >
                <Shield className="w-3.5 h-3.5 shrink-0" style={{ color: r.builtIn ? 'var(--fg-subtle)' : 'var(--fg-accent)' }} />
                <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-base font-semibold truncate" style={{ color: 'var(--fg-strong)' }}>
                      {roleName(t, r)}
                    </span>
                    {r.builtIn && <Lock className="w-2.5 h-2.5" style={{ color: 'var(--fg-subtle)' }} />}
                  </div>
                  <span className="text-xs tabular-nums" style={{ color: 'var(--fg-muted)' }}>
                    {t('roles.permsSummary', { perms: r.permissions.size, count: r.memberCount, unit: t(r.memberCount === 1 ? 'common.person_one' : 'common.person_other') })}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Editor */}
        <div className="flex flex-col overflow-y-auto">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 px-5 py-4" style={{ borderBottom: '1px solid var(--border-muted)' }}>
            <div className="flex flex-col gap-2 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <input
                  value={roleName(t, selected)}
                  onChange={(e) => { rename(e.target.value); }}
                  readOnly={selected.builtIn}
                  className="text-xl font-semibold tracking-tight bg-transparent outline-none flex-1 min-w-0"
                  style={{ color: 'var(--fg-strong)', cursor: selected.builtIn ? 'default' : 'text' }}
                />
                {selected.builtIn && (
                  <span
                    className="text-2xs uppercase tracking-eyebrow font-semibold px-1.5 py-0.5 rounded"
                    style={{ background: 'var(--bg-surface-muted)', color: 'var(--fg-muted)', border: '1px solid var(--border-muted)' }}
                  >
                    {t('roles.builtIn')}
                  </span>
                )}
              </div>
              <input
                value={roleDesc(t, selected)}
                onChange={(e) => { redescribe(e.target.value); }}
                readOnly={selected.builtIn}
                placeholder={t('roles.describePlaceholder')}
                className="text-base bg-transparent outline-none"
                style={{ color: 'var(--fg-muted)', cursor: selected.builtIn ? 'default' : 'text' }}
              />
              <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--fg-subtle)' }}>
                <span className="inline-flex items-center gap-1">
                  <Users className="w-3 h-3" /> {t('roles.assigned', { count: selected.memberCount })}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Check className="w-3 h-3" /> {t('roles.permissionsOf', { count: selected.permissions.size, total: ALL_PERMS.size })}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button leading={<Copy className="w-3 h-3" />} onClick={() => { duplicate(selected); }}>
                {t('roles.duplicate')}
              </Button>
              {!selected.builtIn && (
                <Button variant="ghost" leading={<Trash2 className="w-3 h-3" />} onClick={() => { remove(selected.id); }}>
                  {t('roles.delete')}
                </Button>
              )}
            </div>
          </div>

          {/* Built-in lock notice */}
          {selected.builtIn && (
            <div
              className="flex items-start gap-2 px-5 py-3 text-sm"
              style={{ background: 'var(--bg-surface-muted)', color: 'var(--fg-muted)', borderBottom: '1px solid var(--border-muted)' }}
            >
              <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{t('roles.lockNotice')}</span>
            </div>
          )}

          {/* Permission matrix */}
          <div className="flex flex-col">
            {PERM_GROUPS.map((g) => (
              <div key={g.id} className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-muted)' }}>
                <span
                  className="text-xs uppercase tracking-eyebrow font-semibold mb-3 block"
                  style={{ color: 'var(--fg-subtle)' }}
                >
                  {t(g.titleKey)}
                </span>
                <div className="flex flex-col">
                  {g.perms.map((p) => {
                    const on = selected.permissions.has(p.id);
                    const danger = p.id === 'admission.bypass';
                    return (
                      <div
                        key={p.id}
                        className="flex items-center gap-3 py-2.5"
                        style={{ borderTop: '1px solid var(--border-muted)' }}
                      >
                        <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                          <span className="text-base font-medium" style={{ color: 'var(--fg-strong)' }}>
                            {t(p.labelKey)}
                          </span>
                          <span className="text-xs font-mono" style={{ color: danger ? 'var(--intent-danger-fg)' : 'var(--fg-subtle)' }}>
                            {p.id}
                            {p.hintKey && <span className="ml-2" style={{ color: 'var(--fg-subtle)' }}>· {t(p.hintKey)}</span>}
                          </span>
                        </div>
                        <Toggle
                          checked={on}
                          onChange={() => { togglePerm(p.id); }}
                          disabled={selected.builtIn}
                          label={t(p.labelKey)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="text-sm mt-3 px-1 flex items-start gap-1.5" style={{ color: 'var(--fg-subtle)' }}>
        <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
        {t('roles.footer')}
      </p>
    </OrgShell>
  );
}

