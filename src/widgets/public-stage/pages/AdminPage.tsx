import { useMemo, useState } from 'react';
import { AdminShell } from '../parts/AdminShell';
import { SectionDivider, SectionHeader, Stat } from '../parts/admin/AdminChrome';
import { OrgsTable } from '../parts/admin/OrgsTable';
import { UserSearchInput, UsersTable } from '../parts/admin/UsersTable';
import { JobsTable } from '../parts/admin/JobsTable';
import { FlagsList } from '../parts/admin/FlagsList';
import { DataToolsGrid, DangerBand } from '../parts/admin/DataTools';
import { FLAGS_SEED, USERS } from '../parts/admin/data';
import type { Flag } from '../parts/admin/types';

export default function AdminPage() {
  const [flags, setFlags] = useState<Flag[]>(FLAGS_SEED);
  const [userQ, setUserQ] = useState('');

  const filteredUsers = useMemo(() => {
    if (!userQ.trim()) return USERS;
    const needle = userQ.toLowerCase();
    return USERS.filter((u) =>
      u.name.toLowerCase().includes(needle)
      || u.email.toLowerCase().includes(needle)
      || u.org.toLowerCase().includes(needle));
  }, [userQ]);

  const toggleFlag = (id: string, patch: Partial<Flag>) => {
    setFlags((all) => all.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  return (
    <AdminShell active="overview">
      {/* Header */}
      <header className="flex flex-col gap-1 mb-6">
        <h1 className="text-3xl font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
          Super-admin
        </h1>
        <p className="text-base" style={{ color: 'var(--fg-muted)' }}>
          Internal operator dashboard
        </p>
      </header>

      {/* Stats band */}
      <div
        className="grid mb-8 rounded-md overflow-hidden"
        style={{
          gridTemplateColumns: 'repeat(4, 1fr)',
          background: 'var(--bg-canvas)',
          border: '1px solid var(--border-default)',
        }}
      >
        <Stat label="Active orgs" value="1,284" />
        <Stat label="Active users" value="42,392" />
        <Stat label="Failed jobs · last hour" value="3" tone="warn" />
        <Stat label="Monthly revenue" value="$1.4M" last />
      </div>

      <SectionDivider />

      {/* Recent organizations */}
      <SectionHeader
        eyebrow="Organizations"
        title="Recent organizations"
        hint="The 10 most recently active tenants. Use Impersonate to enter their workspace as a read-only operator."
      />
      <OrgsTable />

      <SectionDivider />

      {/* Users search */}
      <SectionHeader
        eyebrow="Users"
        title="User search"
        hint="Find any user across all orgs. Impersonation always opens a logged session."
      />
      <div className="mb-3">
        <UserSearchInput q={userQ} onChange={setUserQ} />
      </div>
      <UsersTable users={filteredUsers} />

      <SectionDivider />

      {/* Background jobs */}
      <SectionHeader
        eyebrow="Jobs"
        title="Background jobs"
        hint="Live worker activity across the cluster. Killed jobs do not auto-retry."
      />
      <JobsTable />

      <SectionDivider />

      {/* Feature flags */}
      <SectionHeader
        eyebrow="Flags"
        title="Feature flags"
        hint="Toggle global rollout, force-on for ACME (the design-partner tenant), or edit cohorts."
      />
      <FlagsList flags={flags} onChange={toggleFlag} />

      <SectionDivider />

      {/* Data tools */}
      <SectionHeader
        eyebrow="Data"
        title="Data tools"
        hint="Privileged operations. Each opens an interstitial with a typed-confirmation step."
      />
      <DataToolsGrid />

      <SectionDivider />

      {/* Danger band */}
      <DangerBand />
    </AdminShell>
  );
}
