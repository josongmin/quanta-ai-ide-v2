import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, X, Check, ChevronDown } from 'lucide-react';
import type { InviteEntry, InviteRole } from '../../wizard';
import { ROLES } from './data';

// Multi-line email input + chips with per-row role dropdown.
export function EmailInputBox({
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
  const { t } = useTranslation('onboarding');
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
          placeholder={entries.length === 0 ? t('invite.emailPlaceholder') : ''}
          className="flex-1 min-w-[180px] bg-transparent outline-none text-base py-1 px-1"
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
  const { t } = useTranslation('onboarding');
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative inline-flex items-center gap-1 h-6 pl-2 pr-1 rounded text-sm tabular-nums onb-stagger"
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
        {t(`invite.roles.${entry.role}Label`)}
        <ChevronDown className="w-2.5 h-2.5" />
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="w-4 h-4 inline-flex items-center justify-center rounded transition-colors"
        style={{ color: 'var(--fg-subtle)' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-active)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        aria-label={t('invite.removeEmail', { email: entry.email })}
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
                  <span className="text-sm font-medium" style={{ color: 'var(--fg-strong)' }}>
                    {t(`invite.roles.${r}Label`)}
                  </span>
                  <span className="text-2xs" style={{ color: 'var(--fg-subtle)' }}>
                    {t(`invite.roles.${r}Sub`)}
                  </span>
                </span>
                {active && <Check className="w-3 h-3" style={{ color: 'var(--fg-accent)' }} />}
              </button>
            );
          })}
        </div>
      )}
    </span>
  );
}
