import { useMemo, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Upload, RotateCcw } from 'lucide-react';
import type { InviteRole, WizardData } from '../wizard';
import { ROLES, isEmail } from './invite/data';
import { DefaultRoleRow } from './invite/DefaultRoleRow';
import { EmailInputBox } from './invite/EmailInputBox';
import { InviteLinkPanel } from './invite/InviteLinkPanel';
import { SendButton, SentReceipt } from './invite/SendButton';
import { KeyHint, RoleHint } from './invite/bits';

type Props = {
  value: WizardData['invite'];
  onChange: (v: WizardData['invite']) => void;
};

export function StepInvite({ value, onChange }: Props) {
  const { t } = useTranslation('onboarding');
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
      // An empty/blank file would otherwise add nothing with no feedback.
      if (lines.length === 0) { setCsvError(t('invite.csvEmpty')); return; }
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
      if (skipped > 0) setCsvError(t('invite.csvSkipped', { count: skipped }));
    };
    reader.onerror = () => { setCsvError(t('invite.csvReadError')); };
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

      <div className="flex items-center justify-between text-sm">
        <span style={{ color: 'var(--fg-subtle)' }}>
          <Trans
            i18nKey="invite.pressEnter"
            t={t}
            components={[<KeyHint key="0">Enter</KeyHint>, <KeyHint key="1">,</KeyHint>]}
          />
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => { csvRef.current?.click(); }}
            className="inline-flex items-center gap-1 text-sm"
            style={{ color: 'var(--fg-link)' }}
          >
            <Upload className="w-3 h-3" />
            {t('invite.importCsv')}
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
              className="inline-flex items-center gap-1 text-sm"
              style={{ color: 'var(--fg-muted)' }}
            >
              <RotateCcw className="w-3 h-3" />
              {t('invite.clearAll')}
            </button>
          )}
        </div>
      </div>

      {csvError && (
        <div className="text-sm onb-stagger" style={{ color: 'var(--intent-warn-fg)' }}>
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
