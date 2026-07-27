import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import type { DoneProps } from './types';

// CTA row — single dominant button + secondary action.
export function CtaRow({ data }: DoneProps) {
  const { t } = useTranslation('onboarding');
  return (
    <div className="flex items-center justify-between gap-4 pt-2">
      <span className="text-sm" style={{ color: 'var(--fg-subtle)' }}>
        {data.invite.entries.length > 0 && data.invite.sent
          ? t('done.ctaNotified')
          : t('done.ctaInviteLater')}
      </span>
      <Link
        to={'/intelligence'}
        className="inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-md text-base font-semibold transition-opacity hover:opacity-90"
        style={{ background: 'var(--fg-strong)', color: 'var(--bg-canvas)' }}
      >
        {t('done.openDotField')}
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
