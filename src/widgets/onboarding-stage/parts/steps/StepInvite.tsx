import { useMemo, useRef, useState } from 'react';
import {
  Mail, X, Send, Upload, Link2, Check, Copy, Users, ShieldCheck,
  ChevronDown, RotateCcw,
} from 'lucide-react';
import type { InviteEntry, InviteRole, WizardData } from '../wizard';
import { formatTime } from '@shared/i18n';

type Props = {
  value: WizardData['invite'];
  onChange: (v: WizardData['invite']) => void;
};

const ROLE_META: Record<InviteRole, { label: string; sub: string }> = {
  admin:    { label: 'Admin',    sub: 'Manage org & billing' },
  member:   { label: 'Member',   sub: 'Default · code + reviews' },
  reviewer: { label: 'Reviewer', sub: 'Read + comment on PRs' },
  viewer:   { label: 'Viewer',   sub: 'Read-only access' },
};

const ROLES: InviteRole[] = ['admin', 'member', 'reviewer', 'viewer'];
const isEmail = (s: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);

export function StepInvite({ value, onChange }: Props) {
  const [draft, setDraft] = useState('');
  const [defaultRole, setDefaultRole] = useState<InviteRole>('member');
  const [csvError, setCsvError] = useState<string | null>(null);
  const [sentProgress, setSentProgress] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const csvRef = useRef<HTMLInputElement>(null);

  const stats = useMemo(() => {
    const out = { admin: 0, member: 0, reviewer: 0, viewer: 0 } as Record<InviteRole, number>;
    for (const e of value.entries) out[e.role]++;
    return out;
  }, [value.entries]);

  const commitDraft = () => {
    const candidates = draft.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
    if (candidates.length === 0) return;
    const next = [...value.entries];
    for (const c of candidates) {
      if (isEmail(c) && !next.find((e) => e.email === c)) {
        next.push({ email: c, role: defaultRole });
      }
    }
    onChange({ ...value, entries: next });
    setDraft('');
    inputRef.current?.focus();
  };

  const remove = (email: string) => {
    onChange({ ...value, entries: value.entries.filter((e) => e.email !== email) });
  };

  const setRoleFor = (email: string, role: InviteRole) => {
    onChange({
      ...value,
      entries: value.entries.map((e) => (e.email === email ? { ...e, role } : e)),
    });
  };

  const importCsv = (file: File) => {
    setCsvError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const next = [...value.entries];
      let skipped = 0;
      for (const raw of lines) {
        // accept "email" or "email,role"
        const [email, role] = raw.split(/[,;]/).map((s) => s.trim());
        if (!email || !isEmail(email)) { skipped++; continue; }
        if (next.find((e) => e.email === email)) continue;
        const r: InviteRole = (ROLES as string[]).includes((role ?? '').toLowerCase())
          ? (role.toLowerCase() as InviteRole) : defaultRole;
        next.push({ email, role: r });
      }
      onChange({ ...value, entries: next });
      if (skipped > 0) setCsvError(`Skipped ${skipped} line(s) — invalid email format.`);
    };
    reader.onerror = () => { setCsvError('Could not read file.'); };
    reader.readAsText(file);
  };

  const sendInvites = () => {
    setSentProgress(0);
    let done = 0;
    const total = value.entries.length;
    const id = setInterval(() => {
      done = Math.min(total, done + 1);
      setSentProgress(done);
      if (done >= total) {
        clearInterval(id);
        onChange({ ...value, sent: true });
      }
    }, 240);
  };

  const generateLink = () => {
    const code = Array.from({ length: 16 }, () => 'abcdefghjkmnpqrstuvwxyz23456789'[Math.floor(Math.random() * 31)]).join('');
    onChange({ ...value, inviteLink: `https://se-field.app/i/${code}` });
  };

  return (
    <div className="flex flex-col gap-5">
      <DefaultRoleRow defaultRole={defaultRole} onChange={setDefaultRole} stats={stats} totalCount={value.entries.length} />

      <EmailInputBox
        draft={draft}
        setDraft={setDraft}
        onCommit={commitDraft}
        inputRef={inputRef}
        entries={value.entries}
        onRemove={remove}
        onSetRole={setRoleFor}
      />

      <div className="flex items-center justify-between text-[11px]">
        <span style={{ color: 'var(--fg-subtle)' }}>
          Press <KeyHint>Enter</KeyHint> or <KeyHint>,</KeyHint> to add. Paste a list to add many at once.
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => { csvRef.current?.click(); }}
            className="inline-flex items-center gap-1 text-[11px]"
            style={{ color: 'var(--fg-link)' }}
          >
            <Upload className="w-3 h-3" />
            Import CSV
          </button>
          <input
            ref={csvRef}
            type="file"
            accept=".csv,text/csv,text/plain"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importCsv(f);
              e.target.value = '';
            }}
          />
          {value.entries.length > 0 && (
            <button
              type="button"
              onClick={() => { onChange({ ...value, entries: [] }); }}
              className="inline-flex items-center gap-1 text-[11px]"
              style={{ color: 'var(--fg-muted)' }}
            >
              <RotateCcw className="w-3 h-3" />
              Clear all
            </button>
          )}
        </div>
      </div>

      {csvError && (
        <div className="text-[11px] onb-stagger" style={{ color: 'var(--intent-warn-fg)' }}>
          {csvError}
        </div>
      )}

      <InviteLinkPanel value={value} onGenerate={generateLink} />

      {value.entries.length > 0 && !value.sent && (
        <SendButton
          count={value.entries.length}
          progress={sentProgress}
          onSend={sendInvites}
        />
      )}

      {value.sent && <SentReceipt entries={value.entries} />}

      <RoleHint />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Default role + per-role count strip

function DefaultRoleRow({
  defaultRole, onChange, stats, totalCount,
}: {
  defaultRole: InviteRole;
  onChange: (r: InviteRole) => void;
  stats: Record<InviteRole, number>;
  totalCount: number;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] uppercase tracking-[0.14em] font-medium" style={{ color: 'var(--fg-subtle)' }}>
          Default role for new invitees
        </span>
        <div
          className="inline-flex items-center p-0.5 rounded-md"
          style={{
            background: 'var(--bg-surface-muted)',
            border: '1px solid var(--border-muted)',
          }}
        >
          {ROLES.map((r) => {
            const active = r === defaultRole;
            return (
              <button
                key={r}
                type="button"
                onClick={() => { onChange(r); }}
                className="px-2.5 h-7 rounded text-[11px] font-medium transition-colors"
                style={{
                  background: active ? 'var(--bg-canvas)' : 'transparent',
                  color: active ? 'var(--fg-strong)' : 'var(--fg-muted)',
                  boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                {ROLE_META[r].label}
              </button>
            );
          })}
        </div>
      </div>

      {totalCount > 0 && (
        <div
          className="flex items-center gap-3 px-3 py-1.5 rounded-md text-[11px] tabular-nums onb-stagger"
          style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-muted)' }}
        >
          <Users className="w-3 h-3" style={{ color: 'var(--fg-subtle)' }} />
          <span style={{ color: 'var(--fg-default)' }}>{totalCount}</span>
          {ROLES.filter((r) => stats[r] > 0).map((r) => (
            <span key={r} style={{ color: 'var(--fg-subtle)' }}>
              · {stats[r]} {ROLE_META[r].label.toLowerCase()}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Multi-line email input + chips with per-row role dropdown

function EmailInputBox({
  draft, setDraft, onCommit, inputRef, entries, onRemove, onSetRole,
}: {
  draft: string;
  setDraft: (v: string) => void;
  onCommit: () => void;
  inputRef: React.MutableRefObject<HTMLInputElement | null>;
  entries: InviteEntry[];
  onRemove: (email: string) => void;
  onSetRole: (email: string, r: InviteRole) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div
        role="button"
        tabIndex={0}
        className="flex flex-wrap items-center gap-1.5 px-2 py-2 min-h-[44px] rounded-md transition-colors"
        style={{
          background: 'var(--bg-surface-muted)',
          border: '1px solid var(--border-default)',
        }}
        onClick={() => { inputRef.current?.focus(); }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.focus(); } }}
      >
        {entries.map((e) => (
          <EmailChip
            key={e.email}
            entry={e}
            onRemove={() => { onRemove(e.email); }}
            onSetRole={(r) => { onSetRole(e.email, r); }}
          />
        ))}
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => { setDraft(e.target.value); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
              if (draft.trim()) {
                e.preventDefault();
                onCommit();
              }
            }
          }}
          onBlur={() => { if (draft.trim()) onCommit(); }}
          placeholder={entries.length === 0 ? 'name@company.com, another@company.com…' : ''}
          className="flex-1 min-w-[180px] bg-transparent outline-none text-[12px] py-1 px-1"
          style={{ color: 'var(--fg-strong)' }}
        />
      </div>
    </div>
  );
}

function EmailChip({
  entry, onRemove, onSetRole,
}: {
  entry: InviteEntry;
  onRemove: () => void;
  onSetRole: (r: InviteRole) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative inline-flex items-center gap-1 h-6 pl-2 pr-1 rounded text-[11px] tabular-nums onb-stagger"
      style={{
        background: 'var(--bg-canvas)',
        color: 'var(--fg-strong)',
        border: '1px solid var(--border-default)',
      }}
    >
      <Mail className="w-2.5 h-2.5" style={{ color: 'var(--fg-subtle)' }} />
      {entry.email}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="inline-flex items-center gap-0.5 px-1 rounded transition-colors"
        style={{
          background: 'var(--bg-surface-muted)',
          color: 'var(--fg-muted)',
        }}
      >
        {ROLE_META[entry.role].label}
        <ChevronDown className="w-2.5 h-2.5" />
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="w-4 h-4 inline-flex items-center justify-center rounded transition-colors"
        style={{ color: 'var(--fg-subtle)' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-active)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        aria-label={`Remove ${entry.email}`}
      >
        <X className="w-2.5 h-2.5" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute z-10 top-full mt-1 right-0 flex flex-col py-1 rounded-md popover-anchor-in"
          style={{
            background: 'var(--bg-canvas)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-md)',
            minWidth: 180,
          }}
          onMouseLeave={() => { setOpen(false); }}
        >
          {ROLES.map((r) => {
            const active = r === entry.role;
            return (
              <button
                key={r}
                type="button"
                onClick={(e) => { e.stopPropagation(); onSetRole(r); setOpen(false); }}
                className="flex items-center justify-between gap-3 px-2.5 h-7 transition-colors text-left"
                style={{
                  background: active ? 'var(--bg-active)' : 'transparent',
                  color: 'var(--fg-default)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = active ? 'var(--bg-active)' : 'transparent'; }}
              >
                <span className="flex flex-col">
                  <span className="text-[11px] font-medium" style={{ color: 'var(--fg-strong)' }}>
                    {ROLE_META[r].label}
                  </span>
                  <span className="text-[9px]" style={{ color: 'var(--fg-subtle)' }}>
                    {ROLE_META[r].sub}
                  </span>
                </span>
                {active && <Check className="w-3 h-3" style={{ color: 'var(--brand-fg)' }} />}
              </button>
            );
          })}
        </div>
      )}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Magic invite link — generate, copy, regenerate

function InviteLinkPanel({
  value, onGenerate,
}: { value: WizardData['invite']; onGenerate: () => void }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!value.inviteLink) return;
    try {
      await navigator.clipboard.writeText(value.inviteLink);
      setCopied(true);
      setTimeout(() => { setCopied(false); }, 1500);
    } catch { /* ignore */ }
  };

  return (
    <div
      className="flex flex-col gap-2 px-3 py-3 rounded-md"
      style={{
        background: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-muted)',
      }}
    >
      <div className="flex items-center gap-2">
        <Link2 className="w-3 h-3" style={{ color: 'var(--fg-muted)' }} />
        <span className="text-[11px] font-semibold" style={{ color: 'var(--fg-strong)' }}>
          Or share an invite link
        </span>
        <span className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
          · expires in 7 days · max 50 uses
        </span>
      </div>

      {value.inviteLink ? (
        <div className="flex items-center gap-2">
          <code
            className="flex-1 text-[11px] font-mono px-2.5 py-1.5 rounded truncate tabular-nums"
            style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-default)', color: 'var(--fg-default)' }}
          >
            {value.inviteLink}
          </code>
          <button
            type="button"
            onClick={() => { void copy(); }}
            className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-[11px] font-medium"
            style={{
              background: 'var(--bg-canvas)',
              color: 'var(--fg-default)',
              border: '1px solid var(--border-default)',
            }}
          >
            {copied ? <Check className="w-3 h-3" style={{ color: 'var(--intent-success-fg)' }} /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            type="button"
            onClick={onGenerate}
            className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-[11px] font-medium"
            style={{ color: 'var(--fg-muted)' }}
          >
            <RotateCcw className="w-3 h-3" />
            New
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onGenerate}
          className="self-start inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[11px] font-medium"
          style={{
            background: 'var(--bg-canvas)',
            color: 'var(--fg-default)',
            border: '1px dashed var(--border-default)',
          }}
        >
          <Link2 className="w-3 h-3" />
          Generate invite link
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Send button + progress + receipt

function SendButton({
  count, progress, onSend,
}: { count: number; progress: number | null; onSend: () => void }) {
  if (progress != null) {
    const pct = (progress / count) * 100;
    return (
      <div
        className="flex flex-col gap-2 px-3 py-3 rounded-md onb-stagger"
        style={{
          background: 'var(--brand-bg)',
          border: '1px solid var(--brand-vivid)',
        }}
      >
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold" style={{ color: 'var(--fg-strong)' }}>
            Sending invitations…
          </span>
          <span className="font-mono tabular-nums" style={{ color: 'var(--brand-fg)' }}>
            {progress}/{count}
          </span>
        </div>
        <div className="relative h-[3px] rounded-full overflow-hidden"
          style={{ background: 'var(--border-muted)' }}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: `${pct}%`,
              background: 'var(--brand-vivid)',
              transition: 'width 240ms linear',
            }}
          />
        </div>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onSend}
      className="self-start inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-[12px] font-semibold transition-opacity hover:opacity-90"
      style={{ background: 'var(--fg-strong)', color: 'var(--bg-canvas)' }}
    >
      <Send className="w-3.5 h-3.5" />
      Send {count} invitation{count === 1 ? '' : 's'}
    </button>
  );
}

function SentReceipt({ entries }: { entries: InviteEntry[] }) {
  return (
    <div
      className="flex flex-col gap-1.5 px-3 py-2.5 rounded-md onb-stagger"
      style={{
        background: 'var(--intent-success-bg)',
        border: '1px solid var(--intent-success-fg)',
      }}
    >
      <div className="flex items-center gap-2 text-[11px]">
        <Check className="w-3.5 h-3.5" style={{ color: 'var(--intent-success-fg)' }} />
        <span className="font-semibold" style={{ color: 'var(--fg-strong)' }}>
          {entries.length} invitation{entries.length === 1 ? '' : 's'} queued
        </span>
        <span style={{ color: 'var(--fg-muted)' }}>
          · sent at {formatTime(new Date(), { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <span className="text-[10px]" style={{ color: 'var(--fg-muted)' }}>
        Recipients will get an email within a minute. They can also use the invite link if they prefer.
      </span>
    </div>
  );
}

function KeyHint({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded text-[9px] font-mono"
      style={{
        background: 'var(--bg-canvas)',
        color: 'var(--fg-default)',
        border: '1px solid var(--border-default)',
      }}
    >
      {children}
    </kbd>
  );
}

function RoleHint() {
  return (
    <div
      className="flex items-start gap-2 px-3 py-2 rounded-md text-[11px] leading-snug"
      style={{
        background: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-muted)',
        color: 'var(--fg-muted)',
      }}
    >
      <ShieldCheck className="w-3 h-3 mt-0.5 shrink-0" style={{ color: 'var(--fg-subtle)' }} />
      <span>
        You can promote anyone to Admin from <span className="font-mono">Organization → Members</span> after they accept.
        Roles affect billing for paid plans — only Members and Admins count toward seats.
      </span>
    </div>
  );
}
