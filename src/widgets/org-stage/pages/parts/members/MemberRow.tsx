import { useTranslation } from 'react-i18next';
import {
  Mail, Shield, Trash2, UserMinus, ArrowRightLeft, Check,
} from 'lucide-react';
import { RowMenu, type RowMenuItem } from '@shared/ui';
import type { Member, Role, Status } from './types';

export function Row({
  member, bulkOn, onToggleBulk, onRoleChange, onDeactivate, onReactivate, onRemove, onResend,
}: {
  member: Member;
  bulkOn: boolean;
  onToggleBulk: () => void;
  onRoleChange: (r: Role) => void;
  onDeactivate: () => void;
  onReactivate: () => void;
  onRemove: () => void;
  onResend: () => void;
}) {
  const { t } = useTranslation('org');
  const isOwner = member.role === 'owner';
  const isInvited = member.status === 'invited';
  const isDeactivated = member.status === 'deactivated';

  const items: RowMenuItem[] = [
    ...(isInvited ? [{ icon: Mail, label: t('members.rowMenu.resendInvite'), onClick: onResend }] : []),
    ...(!isOwner && !isDeactivated ? [{ icon: UserMinus, label: t('members.rowMenu.deactivate'), onClick: onDeactivate }] : []),
    ...(isDeactivated ? [{ icon: Check, label: t('members.rowMenu.reactivate'), onClick: onReactivate }] : []),
    isOwner
      ? { icon: ArrowRightLeft, label: t('members.rowMenu.transferOwnership'), disabled: true }
      : { icon: Trash2, label: t('members.rowMenu.removeFromOrg'), onClick: onRemove, danger: true },
  ];

  return (
    <div
      role="row"
      className="grid items-center px-3 h-12 text-base transition-colors"
      style={{
        gridTemplateColumns: '24px 1fr 140px 130px 110px 32px',
        gap: 12,
        borderTop: '1px solid var(--border-muted)',
        opacity: isDeactivated ? 0.55 : 1,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <BulkCheckbox checked={bulkOn} onChange={onToggleBulk} disabled={isOwner} />

      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
          style={{
            background: 'var(--bg-surface-muted)',
            border: '1px solid var(--border-muted)',
            color: 'var(--fg-default)',
          }}
        >
          {member.avatar}
        </div>
        <div className="flex flex-col min-w-0 gap-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-medium truncate" style={{ color: 'var(--fg-strong)' }}>
              {member.name}
            </span>
            <StatusBadge status={member.status} />
            {member.twoFA && (
              <span title={t('members.twoFaTitle')}>
                <Shield className="w-3 h-3" style={{ color: 'var(--intent-success-fg)' }} />
              </span>
            )}
          </div>
          <span className="text-sm truncate" style={{ color: 'var(--fg-muted)' }}>
            {member.email}
          </span>
        </div>
      </div>

      <RoleSelect value={member.role} onChange={onRoleChange} disabled={isOwner || isDeactivated} />

      <span className="truncate" style={{ color: 'var(--fg-default)' }}>{member.team}</span>

      <span className="tabular-nums text-sm" style={{ color: 'var(--fg-muted)' }}>
        {member.lastActive}
      </span>

      <RowMenu items={items} />
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const { t } = useTranslation('org');
  if (status === 'active') return null;
  const tone = status === 'invited' ? 'warn' : 'neutral';
  return (
    <span
      className="text-2xs uppercase tracking-eyebrow font-semibold px-1.5 py-0.5 rounded"
      style={{
        background: tone === 'warn' ? 'var(--intent-warn-bg)' : 'var(--bg-surface-muted)',
        color: tone === 'warn' ? 'var(--intent-warn-fg)' : 'var(--fg-muted)',
        border: `1px solid ${tone === 'warn' ? 'var(--intent-warn-fg)' : 'var(--border-muted)'}`,
      }}
    >
      {t(`members.filter.${status}`)}
    </span>
  );
}

function RoleSelect({
  value, onChange, disabled,
}: { value: Role; onChange: (v: Role) => void; disabled: boolean }) {
  const { t } = useTranslation('org');
  return (
    <select
      value={value}
      onChange={(e) => { onChange(e.target.value as Role); }}
      disabled={disabled}
      className="h-7 rounded-md px-2 text-base outline-none cursor-pointer w-full"
      style={{
        background: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-default)',
        color: 'var(--fg-strong)',
        opacity: disabled ? 0.7 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <option value="owner">{t('common.role.owner')}</option>
      <option value="admin">{t('common.role.admin')}</option>
      <option value="member">{t('common.role.member')}</option>
      <option value="billing">{t('common.role.billing')}</option>
      <option value="guest">{t('common.role.guest')}</option>
    </select>
  );
}

export function BulkCheckbox({
  checked, onChange, disabled = false, indeterminate = false,
}: { checked: boolean; onChange: () => void; disabled?: boolean; indeterminate?: boolean }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className="w-4 h-4 rounded shrink-0 inline-flex items-center justify-center transition-colors"
      style={{
        background: checked || indeterminate ? 'var(--fg-accent)' : 'transparent',
        border: `1.5px solid ${checked || indeterminate ? 'var(--fg-accent)' : 'var(--border-strong)'}`,
        opacity: disabled ? 0.35 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {indeterminate && !checked && (
        <span className="w-2 h-[1.5px]" style={{ background: 'var(--bg-canvas)' }} />
      )}
      {checked && <Check className="w-2.5 h-2.5" style={{ color: 'var(--bg-canvas)' }} />}
    </button>
  );
}
