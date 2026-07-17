import { useState } from 'react';
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
      title="Invite people"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            size="md"
            disabled={valid.length === 0 || sending}
            onClick={() => { void send(); }}
          >
            {sending
              ? 'Sending…'
              : `Send ${valid.length > 0 ? `${valid.length.toString()} invite${valid.length === 1 ? '' : 's'}` : 'invites'}`}
          </Button>
        </>
      }
    >
      <label className="flex flex-col gap-1.5">
        <span
          className="text-xs uppercase tracking-eyebrow font-medium flex items-center justify-between"
          style={{ color: 'var(--fg-subtle)' }}
        >
          <span>Emails</span>
          {parsed.length > 0 && (
            <span className="lowercase tracking-normal tabular-nums">
              {valid.length} valid{invalid.length > 0 && ` · ${invalid.length.toString()} invalid`}
            </span>
          )}
        </span>
        <textarea
          value={emails}
          onChange={(e) => { setEmails(e.target.value); }}
          placeholder="teammate@company.com, another@company.com…"
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
            Skipping {invalid.length}: {invalid.slice(0, 2).join(', ')}{invalid.length > 2 && '…'}
          </span>
        )}
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs uppercase tracking-eyebrow font-medium" style={{ color: 'var(--fg-subtle)' }}>
          Role
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
          <option value="admin">Admin</option>
          <option value="member">Member</option>
          <option value="billing">Billing</option>
          <option value="guest">Guest</option>
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
