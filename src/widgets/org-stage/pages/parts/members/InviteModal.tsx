import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  UserPlus, Check, Copy, AlertTriangle,
} from 'lucide-react';
import { Button } from '@shared/ui/forms';
import { SettingsModal } from '@shared/ui';
import { useCopyToClipboard } from '@shared/lib';
import type { Role } from './types';

export function InviteModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('org');
  const [emails, setEmails] = useState('');
  const [role, setRole] = useState<Role>('member');
  const [team, setTeam] = useState('Frontend');
  const linkRef = useRef<HTMLInputElement>(null);
  const { copied, copy } = useCopyToClipboard(1500);

  const parsed = emails
    .split(/[\s,;\n]+/)
    .map((e) => e.trim())
    .filter((e) => e.length > 0);
  const valid = parsed.filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
  const invalid = parsed.filter((e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

  const inviteLink = 'https://acme.app/join/inv_8f3a-2c91';

  const copyLink = () => {
    if (linkRef.current) {
      linkRef.current.select();
      copy(inviteLink);
    }
  };

  return (
    <SettingsModal
      open
      onClose={onClose}
      size="md"
      icon={<UserPlus className="w-4 h-4" style={{ color: 'var(--fg-default)' }} />}
      title={t('invite.title')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button
            variant="primary"
            size="md"
            disabled={valid.length === 0}
            onClick={onClose}
          >
            {valid.length > 0 ? t('invite.send', { count: valid.length }) : t('invite.sendEmpty')}
          </Button>
        </>
      }
    >
      <label className="flex flex-col gap-1.5">
        <span
          className="text-xs uppercase tracking-eyebrow font-medium flex items-center justify-between"
          style={{ color: 'var(--fg-subtle)' }}
        >
          <span>{t('invite.emails')}</span>
          {parsed.length > 0 && (
            <span className="lowercase tracking-normal tabular-nums">
              {t('invite.valid', { count: valid.length })}{invalid.length > 0 && ` · ${t('invite.invalid', { count: invalid.length })}`}
            </span>
          )}
        </span>
        <textarea
          value={emails}
          onChange={(e) => { setEmails(e.target.value); }}
          placeholder={t('invite.emailsPlaceholder')}
          rows={3}
          className="w-full rounded-md p-2.5 text-base outline-none resize-none"
          style={{
            background: 'var(--bg-surface-muted)',
            border: '1px solid var(--border-default)',
            color: 'var(--fg-strong)',
            fontFamily: 'inherit',
          }}
        />
        {invalid.length > 0 && (
          <span className="flex items-center gap-1 text-sm" style={{ color: 'var(--intent-warn-fg)' }}>
            <AlertTriangle className="w-3 h-3" />
            {t('invite.skipping', { count: invalid.length, list: `${invalid.slice(0, 2).join(', ')}${invalid.length > 2 ? '…' : ''}` })}
          </span>
        )}
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-eyebrow font-medium" style={{ color: 'var(--fg-subtle)' }}>
            {t('invite.role')}
          </span>
          <select
            value={role}
            onChange={(e) => { setRole(e.target.value as Role); }}
            className="h-9 rounded-md px-2.5 text-base outline-none cursor-pointer"
            style={{
              background: 'var(--bg-surface-muted)',
              border: '1px solid var(--border-default)',
              color: 'var(--fg-strong)',
            }}
          >
            <option value="admin">{t('common.role.admin')}</option>
            <option value="member">{t('common.role.member')}</option>
            <option value="billing">{t('common.role.billing')}</option>
            <option value="guest">{t('common.role.guest')}</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-eyebrow font-medium" style={{ color: 'var(--fg-subtle)' }}>
            {t('invite.team')}
          </span>
          <select
            value={team}
            onChange={(e) => { setTeam(e.target.value); }}
            className="h-9 rounded-md px-2.5 text-base outline-none cursor-pointer"
            style={{
              background: 'var(--bg-surface-muted)',
              border: '1px solid var(--border-default)',
              color: 'var(--fg-strong)',
            }}
          >
            <option>Platform</option>
            <option>Frontend</option>
            <option>Backend</option>
            <option>Security</option>
            <option>Data</option>
            <option>Finance</option>
            <option>Partner</option>
          </select>
        </label>
      </div>

      <div
        className="flex flex-col gap-2 pt-3"
        style={{ borderTop: '1px solid var(--border-muted)' }}
      >
        <span className="text-xs uppercase tracking-eyebrow font-medium" style={{ color: 'var(--fg-subtle)' }}>
          {t('invite.orShareLink')}
        </span>
        <div className="flex items-center gap-2">
          <input
            ref={linkRef}
            readOnly
            value={inviteLink}
            className="flex-1 h-8 px-2.5 rounded-md text-sm font-mono outline-none"
            style={{
              background: 'var(--bg-surface-muted)',
              border: '1px solid var(--border-default)',
              color: 'var(--fg-default)',
            }}
          />
          <Button leading={copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} onClick={copyLink}>
            {copied ? t('common.copied') : t('common.copy')}
          </Button>
        </div>
      </div>
    </SettingsModal>
  );
}
