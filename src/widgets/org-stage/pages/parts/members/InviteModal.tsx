import { useRef, useState } from 'react';
import {
  UserPlus, Check, Copy, AlertTriangle,
} from 'lucide-react';
import { Button } from '@shared/ui/forms';
import { SettingsModal } from '@shared/ui';
import type { Role } from './types';

export function InviteModal({ onClose }: { onClose: () => void }) {
  const [emails, setEmails] = useState('');
  const [role, setRole] = useState<Role>('member');
  const [team, setTeam] = useState('Frontend');
  const linkRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

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
      try { void navigator.clipboard.writeText(inviteLink); } catch { /* noop */ }
      setCopied(true);
      setTimeout(() => { setCopied(false); }, 1500);
    }
  };

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
            disabled={valid.length === 0}
            onClick={onClose}
          >
            Send {valid.length > 0 ? `${valid.length} invite${valid.length === 1 ? '' : 's'}` : 'invites'}
          </Button>
        </>
      }
    >
      <label className="flex flex-col gap-1.5">
        <span
          className="text-[10px] uppercase tracking-[0.14em] font-medium flex items-center justify-between"
          style={{ color: 'var(--fg-subtle)' }}
        >
          <span>Emails</span>
          {parsed.length > 0 && (
            <span className="lowercase tracking-normal tabular-nums">
              {valid.length} valid{invalid.length > 0 && ` · ${invalid.length} invalid`}
            </span>
          )}
        </span>
        <textarea
          value={emails}
          onChange={(e) => { setEmails(e.target.value); }}
          placeholder="alice@acme.com, bob@acme.com…"
          rows={3}
          className="w-full rounded-md p-2.5 text-[12px] outline-none resize-none"
          style={{
            background: 'var(--bg-surface-muted)',
            border: '1px solid var(--border-default)',
            color: 'var(--fg-strong)',
            fontFamily: 'inherit',
          }}
        />
        {invalid.length > 0 && (
          <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--intent-warn-fg)' }}>
            <AlertTriangle className="w-3 h-3" />
            Skipping {invalid.length}: {invalid.slice(0, 2).join(', ')}{invalid.length > 2 && '…'}
          </span>
        )}
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[10px] uppercase tracking-[0.14em] font-medium" style={{ color: 'var(--fg-subtle)' }}>
            Role
          </span>
          <select
            value={role}
            onChange={(e) => { setRole(e.target.value as Role); }}
            className="h-9 rounded-md px-2.5 text-[12px] outline-none cursor-pointer"
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
        <label className="flex flex-col gap-1.5">
          <span className="text-[10px] uppercase tracking-[0.14em] font-medium" style={{ color: 'var(--fg-subtle)' }}>
            Team
          </span>
          <select
            value={team}
            onChange={(e) => { setTeam(e.target.value); }}
            className="h-9 rounded-md px-2.5 text-[12px] outline-none cursor-pointer"
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
        <span className="text-[10px] uppercase tracking-[0.14em] font-medium" style={{ color: 'var(--fg-subtle)' }}>
          Or share an invite link
        </span>
        <div className="flex items-center gap-2">
          <input
            ref={linkRef}
            readOnly
            value={inviteLink}
            className="flex-1 h-8 px-2.5 rounded-md text-[11px] font-mono outline-none"
            style={{
              background: 'var(--bg-surface-muted)',
              border: '1px solid var(--border-default)',
              color: 'var(--fg-default)',
            }}
          />
          <Button leading={copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} onClick={copyLink}>
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </div>
    </SettingsModal>
  );
}
