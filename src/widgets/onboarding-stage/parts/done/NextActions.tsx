import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Code2, GitPullRequest, Bot } from 'lucide-react';
import { ACCENT_TINT } from '../primitives/shared';
import type { DoneProps } from './types';

// Next actions — concrete things to try in the dot field.
export function NextActions({ data }: DoneProps) {
  const { t } = useTranslation('onboarding');
  const items = [
    {
      icon: Code2,
      title: t('done.actions.codingTitle'),
      hint: t('done.actions.codingHint'),
      to: '/coding',
    },
    {
      icon: GitPullRequest,
      title: t('done.actions.reviewTitle'),
      hint: data.invite.entries.length > 0
        ? t('done.actions.reviewHintInvited', { count: data.invite.entries.length })
        : t('done.actions.reviewHintEmpty'),
      to: '/reviews',
    },
    {
      icon: Bot,
      title: t('done.actions.fixTitle'),
      hint: t('done.actions.fixHint'),
      to: '/fixes',
    },
  ];
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs uppercase tracking-eyebrow font-medium" style={{ color: 'var(--fg-subtle)' }}>
        {t('done.whatToTry')}
      </span>
      <ul className="grid grid-cols-2 gap-2">
        {items.map((it) => (
          <li key={it.to}>
            <Link
              to={it.to as never}
              className="group flex items-start gap-3 px-3 py-2.5 rounded-md transition-colors"
              style={{
                background: 'var(--bg-surface-muted)',
                border: '1px solid var(--border-muted)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-active)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-surface-muted)'; }}
            >
              <span
                className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                style={{
                  background: ACCENT_TINT,
                  border: '1px solid var(--fg-accent)',
                }}
              >
                <it.icon className="w-3.5 h-3.5" style={{ color: 'var(--fg-accent)' }} />
              </span>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-base font-semibold" style={{ color: 'var(--fg-strong)' }}>
                  {it.title}
                </span>
                <span className="text-xs leading-snug" style={{ color: 'var(--fg-muted)' }}>
                  {it.hint}
                </span>
              </div>
              <ArrowRight
                className="w-3 h-3 ml-auto shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: 'var(--fg-link)' }}
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
