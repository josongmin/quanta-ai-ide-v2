import { Trans, useTranslation } from 'react-i18next';
import { Check, Loader2, AlertTriangle, Sparkles } from 'lucide-react';
import { useAvailability } from '../../../lib/availability';
import { AccentBanner } from '../../primitives/AccentBanner';
import type { OrgStepProps } from './types';
import { recognizedOrgFor } from './data';

// Join org branch.
export function JoinOrg({ value, onChange }: OrgStepProps) {
  const { t } = useTranslation('onboarding');
  const codeCheck = useAvailability(value.inviteCode, 'invite-code');

  return (
    <div className="flex flex-col gap-4 onb-stagger">
      <InviteCodeField
        value={value.inviteCode}
        onChange={(c) => { onChange({ ...value, inviteCode: c }); }}
        check={codeCheck}
      />

      {codeCheck.state === 'available' && <RecognizedOrg code={value.inviteCode} />}

      <p className="text-sm leading-snug" style={{ color: 'var(--fg-subtle)' }}>
        <Trans
          i18nKey="org.join.help"
          t={t}
          components={[
            <span key="0" className="font-mono" />,
            <span key="1" style={{ color: 'var(--fg-default)' }} />,
            <span key="2" className="font-mono" />,
          ]}
        />
      </p>
    </div>
  );
}

function RecognizedOrg({ code }: { code: string }) {
  const { t } = useTranslation('onboarding');
  const meta = recognizedOrgFor(code);
  return (
    <AccentBanner
      icon={Sparkles}
      stagger
      title={t('org.join.recognizedTitle', { name: meta.name })}
      body={t('org.join.recognizedBody', { plan: meta.plan, members: meta.members })}
    />
  );
}

// Invite code field.
function InviteCodeField({
  value, onChange, check,
}: {
  value: string;
  onChange: (v: string) => void;
  check: ReturnType<typeof useAvailability>;
}) {
  const { t } = useTranslation('onboarding');
  return (
    <label className="flex flex-col gap-1.5">
      <span
        className="text-xs uppercase tracking-eyebrow font-medium flex items-center justify-between"
        style={{ color: 'var(--fg-subtle)' }}
      >
        <span>{t('org.join.code')}</span>
        <span
          style={{
            color: check.state === 'available' ? 'var(--intent-success-fg)'
              : check.state === 'taken' || check.state === 'invalid' ? 'var(--intent-danger-fg)'
              : 'var(--fg-muted)',
          }}
        >
          {check.message}
        </span>
      </span>
      <div
        className="flex items-center h-10 rounded-md transition-colors"
        style={{
          background: 'var(--bg-surface-muted)',
          border: `1px solid ${
            check.state === 'taken' || check.state === 'invalid' ? 'var(--intent-danger-fg)'
            : check.state === 'available' ? 'var(--intent-success-fg)'
            : 'var(--border-default)'
          }`,
        }}
      >
        <input
          value={value}
          onChange={(e) => { onChange(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 32)); }}
          placeholder={t('org.join.codePlaceholder')}
          required
          autoFocus
          className="flex-1 bg-transparent outline-none px-3 text-[15px] font-mono tabular-nums tracking-wider"
          style={{ color: 'var(--fg-strong)' }}
        />
        <div className="pr-3">
          {check.state === 'checking' && <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--fg-muted)' }} />}
          {check.state === 'available' && <Check className="w-4 h-4 onb-tick" style={{ color: 'var(--intent-success-fg)' }} />}
          {(check.state === 'taken' || check.state === 'invalid') && <AlertTriangle className="w-4 h-4" style={{ color: 'var(--intent-danger-fg)' }} />}
        </div>
      </div>
    </label>
  );
}
