import { useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { useHoverStyle } from '@shared/lib';
import { formatNumber } from '@shared/i18n';
import { ORGS } from './data';
import type { Org, Plan } from './types';
import { RowMenu, RowMenuItem } from './RowMenu';

export function OrgsTable() {
  return (
    <div
      className="rounded-md overflow-hidden"
      style={{ border: '1px solid var(--border-muted)' }}
    >
      <div
        className="grid items-center px-3 h-9 text-[10px] uppercase tracking-[0.14em] font-semibold"
        style={{
          gridTemplateColumns: '1.6fr 90px 80px 110px 110px 32px',
          gap: 12,
          background: 'var(--bg-surface-muted)',
          color: 'var(--fg-subtle)',
          borderBottom: '1px solid var(--border-muted)',
        }}
      >
        <span>Organization</span>
        <span>Plan</span>
        <span className="text-right">Members</span>
        <span className="text-right">Monthly</span>
        <span>Signed up</span>
        <span />
      </div>
      {ORGS.map((o) => <OrgRow key={o.id} org={o} />)}
    </div>
  );
}

function OrgRow({ org }: { org: Org }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useHoverStyle(ref, { background: 'var(--bg-hover)' }, { background: 'transparent' });
  return (
    <div
      ref={ref}
      className="grid items-center px-3 h-12 text-[12px] transition-colors"
      style={{
        gridTemplateColumns: '1.6fr 90px 80px 110px 110px 32px',
        gap: 12,
        borderTop: '1px solid var(--border-muted)',
      }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0"
          style={{
            background: 'var(--bg-surface-muted)',
            border: '1px solid var(--border-muted)',
            color: 'var(--fg-default)',
          }}
        >
          {org.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex flex-col min-w-0 gap-0.5">
          <span className="font-medium truncate" style={{ color: 'var(--fg-strong)' }}>
            {org.name}
          </span>
          <span className="text-[11px] font-mono truncate" style={{ color: 'var(--fg-muted)' }}>
            {org.slug}
          </span>
        </div>
      </div>

      <PlanBadge plan={org.plan} />

      <span className="tabular-nums text-right" style={{ color: 'var(--fg-default)' }}>
        {formatNumber(org.members)}
      </span>

      <span className="tabular-nums text-right" style={{ color: 'var(--fg-default)' }}>
        ${formatNumber(org.spend)}
      </span>

      <span className="tabular-nums text-[11px]" style={{ color: 'var(--fg-muted)' }}>
        {org.signedUp}
      </span>

      <div className="relative flex justify-end">
        <button
          type="button"
          onClick={() => { setMenuOpen((v) => !v); }}
          className="w-7 h-7 rounded-md inline-flex items-center justify-center transition-colors"
          style={{ color: 'var(--fg-muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-active)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          aria-label="Org actions"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
        {menuOpen && (
          <RowMenu onClose={() => { setMenuOpen(false); }}>
            <RowMenuItem label="Impersonate" onClick={() => { setMenuOpen(false); }} />
            <RowMenuItem label="Suspend" onClick={() => { setMenuOpen(false); }} />
            <RowMenuItem label="Delete" onClick={() => { setMenuOpen(false); }} danger />
          </RowMenu>
        )}
      </div>
    </div>
  );
}

const PLAN_LABELS: Record<Plan, string> = {
  free: 'Free', team: 'Team', business: 'Business', enterprise: 'Enterprise',
};

// Neutral, full-perimeter pill — no left stripe.
const PLAN_TONES: Record<Plan, { bg: string; fg: string }> = {
  enterprise: { bg: 'var(--intent-info-bg)',    fg: 'var(--intent-info-fg)' },
  business:   { bg: 'var(--intent-success-bg)', fg: 'var(--intent-success-fg)' },
  team:       { bg: 'var(--bg-surface-muted)',  fg: 'var(--fg-default)' },
  free:       { bg: 'var(--bg-surface-muted)',  fg: 'var(--fg-muted)' },
};

function PlanBadge({ plan }: { plan: Plan }) {
  const tone = PLAN_TONES[plan];
  return (
    <span
      className="inline-flex items-center text-[10px] uppercase tracking-[0.14em] font-semibold px-1.5 py-0.5 rounded"
      style={{
        background: tone.bg,
        color: tone.fg,
        border: `1px solid ${tone.fg}`,
        width: 'fit-content',
      }}
    >
      {PLAN_LABELS[plan]}
    </span>
  );
}
