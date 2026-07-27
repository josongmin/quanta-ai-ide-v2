import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UserPlus, AlertTriangle } from 'lucide-react';
import { Button } from '@shared/ui/forms';
import { SettingsModal } from '@shared/ui';
import { inviteMember, type OrgRole } from '@entities/org';

// Real invite flow — replaces the mock InviteModal's fake share-link + team
// picker. Emails are invited one-by-one via better-auth (server emails each an
// accept link); partial failures are surfaced without losing the successes.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RealInviteModal({
  organizationId, onClose, onInvited,
}: {
  organizationId: string;
  onClose: () => void;
  onInvited: () => void;
}) {
  const { t } = useTranslation('org');
  const [emails, setEmails] = useState('');
  const [role, setRole] = useState<OrgRole>('member');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = emails.split(/[\s,;\n]+/).map((e) => e.trim()).filter((e) => e.length > 0);
  const valid = parsed.filter((e) => EMAIL_RE.test(e));
  const invalid = parsed.filter((e) => !EMAIL_RE.test(e));

  async function send() {
    if (valid.length === 0) return;
    setSending(true);
    setError(null);
    const failedEmails: string[] = [];
    const failMsgs: string[] = [];
    for (const email of valid) {
      const res = await inviteMember({ organizationId, email, role });
      if (!res.ok) { failedEmails.push(email); failMsgs.push(`${email}: ${res.error}`); }
    }
    setSending(false);
    onInvited(); // refresh regardless — some invites may have succeeded
    if (failedEmails.length > 0) {
      // Drop the succeeded addresses so a retry only re-sends the failures.
      setEmails(failedEmails.join(', '));
      setError(failMsgs.join(' · '));
      return;
    }
    onClose();
  }

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
            disabled={valid.length === 0 || sending}
            onClick={() => { void send(); }}
          >
            {sending
              ? t('invite.sending')
              : valid.length > 0 ? t('invite.send', { count: valid.length }) : t('invite.sendEmpty')}
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
          placeholder={t('invite.emailsPlaceholderReal')}
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

      <label className="flex flex-col gap-1.5">
        <span className="text-xs uppercase tracking-eyebrow font-medium" style={{ color: 'var(--fg-subtle)' }}>
          {t('invite.role')}
        </span>
        <select
          value={role}
          onChange={(e) => { setRole(e.target.value as OrgRole); }}
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

      {error && (
        <span className="flex items-start gap-1 text-sm" style={{ color: 'var(--intent-danger-fg)' }}>
          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
          {error}
        </span>
      )}
    </SettingsModal>
  );
}
