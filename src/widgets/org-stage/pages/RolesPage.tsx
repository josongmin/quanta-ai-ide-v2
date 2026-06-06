import { useState } from 'react';
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

type PermissionGroup = { id: string; title: string; perms: { id: PermissionId; label: string; hint?: string }[] };

const PERM_GROUPS: PermissionGroup[] = [
  { id: 'org', title: 'Organization', perms: [
    { id: 'org.read',   label: 'View org settings' },
    { id: 'org.manage', label: 'Manage org settings', hint: 'name, logo, defaults' },
  ]},
  { id: 'members', title: 'Members', perms: [
    { id: 'members.invite', label: 'Invite members' },
    { id: 'members.remove', label: 'Remove members' },
    { id: 'members.role',   label: 'Change member roles' },
  ]},
  { id: 'workspaces', title: 'Workspaces', perms: [
    { id: 'workspaces.create',   label: 'Create workspaces' },
    { id: 'workspaces.delete',   label: 'Delete workspaces' },
    { id: 'workspaces.settings', label: 'Edit workspace settings' },
  ]},
  { id: 'admission', title: 'Admission', perms: [
    { id: 'admission.read',   label: 'Read admission rules' },
    { id: 'admission.write',  label: 'Author admission rules' },
    { id: 'admission.bypass', label: 'Bypass admission gates', hint: 'high risk' },
  ]},
  { id: 'agents', title: 'Agents', perms: [
    { id: 'agents.run',       label: 'Trigger agent runs' },
    { id: 'agents.configure', label: 'Configure agents' },
    { id: 'agents.kill',      label: 'Kill running agents' },
  ]},
  { id: 'billing', title: 'Billing', perms: [
    { id: 'billing.read',   label: 'View billing & usage' },
    { id: 'billing.manage', label: 'Change plan & payment' },
  ]},
  { id: 'observability', title: 'Audit & secrets', perms: [
    { id: 'audit.read',    label: 'Read audit log' },
    { id: 'audit.export',  label: 'Export audit log' },
    { id: 'secrets.read',  label: 'Read secret names' },
    { id: 'secrets.write', label: 'Manage secrets' },
  ]},
];

type Role = {
  id: string;
  name: string;
  description: string;
  builtIn: boolean;
  memberCount: number;
  permissions: Set<PermissionId>;
};

const ALL_PERMS = new Set<PermissionId>(PERM_GROUPS.flatMap((g) => g.perms.map((p) => p.id)));

const SEED_ROLES: Role[] = [
  {
    id: 'r-owner', name: 'Owner', description: 'Full access. Can transfer ownership and delete the org.',
    builtIn: true, memberCount: 1, permissions: new Set(ALL_PERMS),
  },
  {
    id: 'r-admin', name: 'Admin', description: 'Manage members, workspaces, and policies. No billing.',
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
    builtIn: true, memberCount: 6,
    permissions: new Set<PermissionId>(['org.read', 'workspaces.settings', 'admission.read', 'agents.run', 'audit.read']),
  },
  {
    id: 'r-billing', name: 'Billing', description: 'Read-only access except for billing surfaces.',
    builtIn: true, memberCount: 1,
    permissions: new Set<PermissionId>(['org.read', 'billing.read', 'billing.manage', 'audit.read']),
  },
  {
    id: 'r-guest', name: 'Guest', description: 'Limited read on shared workspaces.',
    builtIn: true, memberCount: 1,
    permissions: new Set<PermissionId>(['org.read']),
  },
  {
    id: 'r-secops', name: 'SecOps', description: 'Custom — security review and audit access.',
    builtIn: false, memberCount: 0,
    permissions: new Set<PermissionId>([
      'org.read', 'admission.read', 'admission.write', 'audit.read', 'audit.export', 'secrets.read',
    ]),
  },
];

export default function RolesPage() {
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
    setRoles((all) => [...all, { ...r, id, name: `${r.name} copy`, builtIn: false, memberCount: 0, permissions: new Set(r.permissions) }]);
    setSelectedId(id);
  };
  const remove = (id: string) => {
    setRoles((all) => all.filter((r) => r.id !== id));
    setSelectedId('r-owner');
  };
  const addNew = () => {
    const id = `r-${Date.now()}`;
    setRoles((all) => [...all, {
      id, name: 'New role', description: '', builtIn: false, memberCount: 0, permissions: new Set<PermissionId>(['org.read']),
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
      title="Roles"
      subtitle="Built-in roles are locked. Duplicate one to define a custom role tuned to your team."
      topRight={
        <Button variant="primary" size="md" leading={<Plus className="w-3.5 h-3.5" />} onClick={addNew}>
          New role
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
                    <span className="text-[12px] font-semibold truncate" style={{ color: 'var(--fg-strong)' }}>
                      {r.name}
                    </span>
                    {r.builtIn && <Lock className="w-2.5 h-2.5" style={{ color: 'var(--fg-subtle)' }} />}
                  </div>
                  <span className="text-[10px] tabular-nums" style={{ color: 'var(--fg-muted)' }}>
                    {r.permissions.size} perms · {r.memberCount} {r.memberCount === 1 ? 'person' : 'people'}
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
                  value={selected.name}
                  onChange={(e) => { rename(e.target.value); }}
                  readOnly={selected.builtIn}
                  className="text-[16px] font-semibold tracking-tight bg-transparent outline-none flex-1 min-w-0"
                  style={{ color: 'var(--fg-strong)', cursor: selected.builtIn ? 'default' : 'text' }}
                />
                {selected.builtIn && (
                  <span
                    className="text-[9px] uppercase tracking-[0.14em] font-semibold px-1.5 py-0.5 rounded"
                    style={{ background: 'var(--bg-surface-muted)', color: 'var(--fg-muted)', border: '1px solid var(--border-muted)' }}
                  >
                    Built-in
                  </span>
                )}
              </div>
              <input
                value={selected.description}
                onChange={(e) => { redescribe(e.target.value); }}
                readOnly={selected.builtIn}
                placeholder="Describe what this role is for…"
                className="text-[12px] bg-transparent outline-none"
                style={{ color: 'var(--fg-muted)', cursor: selected.builtIn ? 'default' : 'text' }}
              />
              <div className="flex items-center gap-3 text-[11px]" style={{ color: 'var(--fg-subtle)' }}>
                <span className="inline-flex items-center gap-1">
                  <Users className="w-3 h-3" /> {selected.memberCount} assigned
                </span>
                <span className="inline-flex items-center gap-1">
                  <Check className="w-3 h-3" /> {selected.permissions.size} of {ALL_PERMS.size} permissions
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button leading={<Copy className="w-3 h-3" />} onClick={() => { duplicate(selected); }}>
                Duplicate
              </Button>
              {!selected.builtIn && (
                <Button variant="ghost" leading={<Trash2 className="w-3 h-3" />} onClick={() => { remove(selected.id); }}>
                  Delete
                </Button>
              )}
            </div>
          </div>

          {/* Built-in lock notice */}
          {selected.builtIn && (
            <div
              className="flex items-start gap-2 px-5 py-3 text-[11px]"
              style={{ background: 'var(--bg-surface-muted)', color: 'var(--fg-muted)', borderBottom: '1px solid var(--border-muted)' }}
            >
              <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>This is a built-in role and cannot be edited. Duplicate it to make a customized version.</span>
            </div>
          )}

          {/* Permission matrix */}
          <div className="flex flex-col">
            {PERM_GROUPS.map((g) => (
              <div key={g.id} className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-muted)' }}>
                <span
                  className="text-[10px] uppercase tracking-[0.14em] font-semibold mb-3 block"
                  style={{ color: 'var(--fg-subtle)' }}
                >
                  {g.title}
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
                          <span className="text-[12px] font-medium" style={{ color: 'var(--fg-strong)' }}>
                            {p.label}
                          </span>
                          <span className="text-[10px] font-mono" style={{ color: danger ? 'var(--intent-danger-fg)' : 'var(--fg-subtle)' }}>
                            {p.id}
                            {p.hint && <span className="ml-2" style={{ color: 'var(--fg-subtle)' }}>· {p.hint}</span>}
                          </span>
                        </div>
                        <Toggle
                          checked={on}
                          onChange={() => { togglePerm(p.id); }}
                          disabled={selected.builtIn}
                          label={p.label}
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

      <p className="text-[11px] mt-3 px-1 flex items-start gap-1.5" style={{ color: 'var(--fg-subtle)' }}>
        <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
        Custom roles take effect immediately for assigned members. Audit log records every permission change.
      </p>
    </OrgShell>
  );
}

