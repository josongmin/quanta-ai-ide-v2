import { Trans, useTranslation } from 'react-i18next';
import { ShieldCheck } from 'lucide-react';

export function KeyHint({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded text-2xs font-mono"
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

export function RoleHint() {
  const { t } = useTranslation('onboarding');
  return (
    <div
      className="flex items-start gap-2 px-3 py-2 rounded-md text-sm leading-snug"
      style={{
        background: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-muted)',
        color: 'var(--fg-muted)',
      }}
    >
      <ShieldCheck className="w-3 h-3 mt-0.5 shrink-0" style={{ color: 'var(--fg-subtle)' }} />
      <span>
        <Trans
          i18nKey="invite.roleHint"
          t={t}
          components={[<span key="0" className="font-mono" />]}
        />
      </span>
    </div>
  );
}
