import { useTranslation } from 'react-i18next';
import { Users } from 'lucide-react';
import type { InviteRole } from '../../wizard';
import { SegmentedToggle } from '../../primitives/SegmentedToggle';
import { ROLES } from './data';

// Default role selector + per-role count strip.
export function DefaultRoleRow({
  defaultRole, onChange, stats, totalCount,
}: {
  defaultRole: InviteRole;
  onChange: (r: InviteRole) => void;
  stats: Record<InviteRole, number>;
  totalCount: number;
}) {
  const { t } = useTranslation('onboarding');
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs uppercase tracking-eyebrow font-medium" style={{ color: 'var(--fg-subtle)' }}>
          {t('invite.defaultRole')}
        </span>
        <SegmentedToggle
          options={ROLES}
          value={defaultRole}
          onChange={onChange}
          segmentPadding="px-2.5"
          renderLabel={(r) => t(`invite.roles.${r}Label`)}
        />
      </div>

      {totalCount > 0 && (
        <div
          className="flex items-center gap-3 px-3 py-1.5 rounded-md text-sm tabular-nums onb-stagger"
          style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-muted)' }}
        >
          <Users className="w-3 h-3" style={{ color: 'var(--fg-subtle)' }} />
          <span style={{ color: 'var(--fg-default)' }}>{totalCount}</span>
          {ROLES.filter((r) => stats[r] > 0).map((r) => (
            <span key={r} style={{ color: 'var(--fg-subtle)' }}>
              {t('invite.roleCount', { count: stats[r], role: t(`invite.roles.${r}Label`).toLowerCase() })}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
