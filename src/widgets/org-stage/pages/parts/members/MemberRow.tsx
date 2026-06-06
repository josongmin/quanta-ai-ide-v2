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
  const isOwner = member.role === 'owner';
  const isInvited = member.status === 'invited';
  const isDeactivated = member.status === 'deactivated';

  const items: RowMenuItem[] = [
    ...(isInvited ? [{ icon: Mail, label: 'Resend invite', onClick: onResend }] : []),
    ...(!isOwner && !isDeactivated ? [{ icon: UserMinus, label: 'Deactivate', onClick: onDeactivate }] : []),
    ...(isDeactivated ? [{ icon: Check, label: 'Reactivate', onClick: onReactivate }] : []),
    isOwner
      ? { icon: ArrowRightLeft, label: 'Transfer ownership', disabled: true }
      : { icon: Trash2, label: 'Remove from org', onClick: onRemove, danger: true },
  ];

  return (
    <div
      role="row"
      className="grid items-center px-3 h-12 text-[12px] transition-colors"
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
          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
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
              <span title="2FA enabled">
                <Shield className="w-3 h-3" style={{ color: 'var(--intent-success-fg)' }} />
              </span>
            )}
          </div>
          <span className="text-[11px] truncate" style={{ color: 'var(--fg-muted)' }}>
            {member.email}
          </span>
        </div>
      </div>

      <RoleSelect value={member.role} onChange={onRoleChange} disabled={isOwner || isDeactivated} />

      <span className="truncate" style={{ color: 'var(--fg-default)' }}>{member.team}</span>

      <span className="tabular-nums text-[11px]" style={{ color: 'var(--fg-muted)' }}>
        {member.lastActive}
      </span>

      <RowMenu items={items} />
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  if (status === 'active') return null;
  const tone = status === 'invited' ? 'warn' : 'neutral';
  return (
    <span
      className="text-[9px] uppercase tracking-[0.14em] font-semibold px-1.5 py-0.5 rounded"
      style={{
        background: tone === 'warn' ? 'var(--intent-warn-bg)' : 'var(--bg-surface-muted)',
        color: tone === 'warn' ? 'var(--intent-warn-fg)' : 'var(--fg-muted)',
        border: `1px solid ${tone === 'warn' ? 'var(--intent-warn-fg)' : 'var(--border-muted)'}`,
      }}
    >
      {status}
    </span>
  );
}

function RoleSelect({
  value, onChange, disabled,
}: { value: Role; onChange: (v: Role) => void; disabled: boolean }) {
  return (
    <select
      value={value}
      onChange={(e) => { onChange(e.target.value as Role); }}
      disabled={disabled}
      className="h-7 rounded-md px-2 text-[12px] outline-none cursor-pointer w-full"
      style={{
        background: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-default)',
        color: 'var(--fg-strong)',
        opacity: disabled ? 0.7 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <option value="owner">Owner</option>
      <option value="admin">Admin</option>
      <option value="member">Member</option>
      <option value="billing">Billing</option>
      <option value="guest">Guest</option>
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
