import { useTranslation } from 'react-i18next';
import type { DoneProps } from './types';

// Summary tile.
export function SummaryTile({ data }: DoneProps) {
  const { t } = useTranslation('onboarding');
  return (
    <dl
      className="grid grid-cols-3 gap-x-6 gap-y-3 px-4 py-3 rounded-md text-sm"
      style={{
        background: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-muted)',
      }}
    >
      <Row label={t('done.summary.profile')}      value={data.profile.name || t('done.summary.unnamed')} />
      <Row label={t('done.summary.handle')}       value={`@${data.profile.handle || 'me'}`} mono />
      <Row label={t('done.summary.timezone')}     value={data.profile.timezone} mono />
      <Row label={t('done.summary.organization')} value={data.org.name || t('done.summary.newOrg')} />
      <Row label={t('done.summary.workspace')}    value={data.workspace.repo || '—'} mono />
      <Row label={t('done.summary.branch')}       value={data.workspace.branch || 'main'} mono />
      <Row label={t('done.summary.invitees')}     value={String(data.invite.entries.length)} />
      <Row label={t('done.summary.plan')}         value={`${t(`plan.plans.${data.plan.id}Name`)} · ${data.plan.cycle}`} />
      <Row label={t('done.summary.seats')}        value={String(data.plan.seats)} />
    </dl>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <dt className="text-2xs uppercase tracking-eyebrow font-medium" style={{ color: 'var(--fg-subtle)' }}>
        {label}
      </dt>
      <dd className={`truncate ${mono ? 'font-mono tabular-nums' : ''}`} style={{ color: 'var(--fg-default)' }}>
        {value}
      </dd>
    </div>
  );
}
