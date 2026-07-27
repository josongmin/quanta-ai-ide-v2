import { useTranslation } from 'react-i18next';
import { Fingerprint } from 'lucide-react';
import { AuthButton as Button } from '@shared/ui/forms';
import type { Phase } from './types';

// WebAuthn — animated fingerprint pulse + state machine.

export function WebAuthnPrompt({ phase, onActivate }: { phase: Phase; onActivate: () => void }) {
  const { t } = useTranslation('auth');
  return (
    <div
      className="flex flex-col items-center gap-4 px-3 py-6 rounded-md"
      style={{
        background: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-default)',
      }}
    >
      <div
        className="relative w-16 h-16 rounded-full flex items-center justify-center"
        style={{
          background: 'color-mix(in srgb, var(--fg-accent) 14%, transparent)',
          border: '1.5px solid var(--fg-accent)',
        }}
      >
        <Fingerprint className="w-7 h-7" style={{ color: 'var(--fg-accent)' }} />
        {phase === 'challenge' && (
          <span
            className="absolute inset-0 rounded-full onb-pulse-ring"
            aria-hidden
          />
        )}
      </div>
      <div className="flex flex-col items-center gap-1 text-center">
        <span className="text-base font-semibold" style={{ color: 'var(--fg-strong)' }}>
          {phase === 'challenge'  && t('mfa.webauthn.touch')}
          {phase === 'verifying'  && t('mfa.webauthn.verifying')}
          {phase === 'success'    && t('mfa.webauthn.confirmed')}
        </span>
        <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>
          {t('mfa.webauthn.compatible')}
        </span>
      </div>
      {phase === 'challenge' && (
        <Button onClick={onActivate} variant="secondary" full={false}>
          <Fingerprint className="w-3.5 h-3.5" />
          {t('mfa.webauthn.useAuthenticator')}
        </Button>
      )}
    </div>
  );
}
