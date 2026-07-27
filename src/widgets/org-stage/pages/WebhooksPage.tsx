import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { OrgShell } from '../parts/OrgShell';
import {
  WebhooksManager,
  type Endpoint,
  type Delivery,
  type WebhookEvent,
} from '@widgets/_shared/WebhooksManager';

function eventCatalog(t: TFunction<'org'>): WebhookEvent[] {
  return [
    { id: 'admission.passed',  label: t('webhooks.event.admissionPassed') },
    { id: 'admission.failed',  label: t('webhooks.event.admissionFailed') },
    { id: 'review.requested',  label: t('webhooks.event.reviewRequested') },
    { id: 'review.approved',   label: t('webhooks.event.reviewApproved') },
    { id: 'agent.started',     label: t('webhooks.event.agentStarted') },
    { id: 'agent.completed',   label: t('webhooks.event.agentCompleted') },
    { id: 'agent.killed',      label: t('webhooks.event.agentKilled') },
    { id: 'incident.opened',   label: t('webhooks.event.incidentOpened') },
    { id: 'incident.resolved', label: t('webhooks.event.incidentResolved') },
    { id: 'workspace.created', label: t('webhooks.event.workspaceCreated') },
    { id: 'member.invited',    label: t('webhooks.event.memberInvited') },
  ];
}

function seedEndpoints(t: TFunction<'org'>): Endpoint[] {
  return [
    { id: 'wh1', url: 'https://hooks.acme.io/se-events',          description: t('webhooks.seed.warehouse'), events: ['admission.passed', 'admission.failed', 'agent.completed'], enabled: true,  createdAt: '2026-04-21', successCount: 1842, failureCount: 3 },
    { id: 'wh2', url: 'https://api.partner.io/webhooks/seq8f3',   description: t('webhooks.seed.partner'),   events: ['admission.failed'],                                          enabled: true,  createdAt: '2026-04-25', successCount:  214, failureCount: 0 },
    { id: 'wh3', url: 'https://staging.acme.io/se-events',        description: t('webhooks.seed.staging'),   events: ['agent.started', 'agent.completed', 'agent.killed'],         enabled: false, createdAt: '2026-05-01', successCount:   58, failureCount: 12 },
  ];
}

const SEED_DELIVERIES: Delivery[] = [
  { id: 'd1',  endpointId: 'wh1', event: 'admission.failed',  status: 'success', statusCode: 200, durationMs: 142, at: '2m ago'  },
  { id: 'd2',  endpointId: 'wh1', event: 'agent.completed',   status: 'success', statusCode: 200, durationMs:  89, at: '5m ago'  },
  { id: 'd3',  endpointId: 'wh3', event: 'agent.killed',      status: 'failure', statusCode: 502, durationMs: 5012, at: '12m ago' },
  { id: 'd4',  endpointId: 'wh2', event: 'admission.failed',  status: 'success', statusCode: 200, durationMs: 211, at: '23m ago' },
  { id: 'd5',  endpointId: 'wh1', event: 'admission.passed',  status: 'success', statusCode: 200, durationMs:  76, at: '1h ago'  },
  { id: 'd6',  endpointId: 'wh3', event: 'agent.started',     status: 'failure', statusCode: 504, durationMs: 5005, at: '1h ago'  },
  { id: 'd7',  endpointId: 'wh1', event: 'admission.passed',  status: 'success', statusCode: 200, durationMs:  98, at: '2h ago'  },
  { id: 'd8',  endpointId: 'wh1', event: 'agent.completed',   status: 'failure', statusCode: 500, durationMs: 1820, at: '3h ago'  },
];

export default function WebhooksPage() {
  const { t } = useTranslation('org');
  return (
    <WebhooksManager
      events={eventCatalog(t)}
      initialEndpoints={seedEndpoints(t)}
      initialDeliveries={SEED_DELIVERIES}
      defaultEvent="admission.failed"
      urlPlaceholder={t('webhooks.urlPlaceholder')}
      descPlaceholder={t('webhooks.descPlaceholder')}
      renderShell={({ newEndpointButton, body }) => (
        <OrgShell
          orgName="ACME, Inc."
          orgSlug="acme"
          title={t('webhooks.title')}
          subtitle={t('webhooks.subtitle')}
          topRight={newEndpointButton}
        >
          {body}
        </OrgShell>
      )}
    />
  );
}
