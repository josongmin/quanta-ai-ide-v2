import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { WsShell } from '../parts/WsShell';
import {
  WebhooksManager,
  type Endpoint,
  type Delivery,
  type WebhookEvent,
} from '@widgets/_shared/WebhooksManager';

// Workspace-scoped events: PR / branch / deploy / quality signals.
// event ids stay stable; labels resolve from ws:webhooks.events.* at render.
const EVENT_IDS: { id: string; key: string }[] = [
  { id: 'pr.opened',                 key: 'prOpened' },
  { id: 'pr.merged',                 key: 'prMerged' },
  { id: 'branch.protected.violated', key: 'branchViolated' },
  { id: 'commit.signed',             key: 'commitSigned' },
  { id: 'deploy.started',            key: 'deployStarted' },
  { id: 'deploy.completed',          key: 'deployCompleted' },
  { id: 'flaky.test.detected',       key: 'flakyDetected' },
  { id: 'coverage.dropped',          key: 'coverageDropped' },
  { id: 'bundle.size.exceeded',      key: 'bundleExceeded' },
];

const SEED_DELIVERIES: Delivery[] = [
  { id: 'd1', endpointId: 'wh1', event: 'deploy.completed',          status: 'success', statusCode: 200, durationMs: 168, at: '1m ago'  },
  { id: 'd2', endpointId: 'wh1', event: 'pr.merged',                 status: 'success', statusCode: 200, durationMs:  92, at: '7m ago'  },
  { id: 'd3', endpointId: 'wh2', event: 'flaky.test.detected',       status: 'success', statusCode: 200, durationMs: 132, at: '14m ago' },
  { id: 'd4', endpointId: 'wh3', event: 'branch.protected.violated', status: 'failure', statusCode: 502, durationMs: 5012, at: '22m ago' },
  { id: 'd5', endpointId: 'wh1', event: 'pr.opened',                 status: 'success', statusCode: 200, durationMs:  74, at: '38m ago' },
  { id: 'd6', endpointId: 'wh2', event: 'coverage.dropped',          status: 'success', statusCode: 200, durationMs: 109, at: '1h ago'  },
  { id: 'd7', endpointId: 'wh1', event: 'deploy.started',            status: 'failure', statusCode: 500, durationMs: 1840, at: '2h ago'  },
  { id: 'd8', endpointId: 'wh2', event: 'bundle.size.exceeded',      status: 'success', statusCode: 200, durationMs:  88, at: '3h ago'  },
];

export default function WebhooksPage() {
  const { t } = useTranslation('ws');

  const eventCatalog = useMemo<WebhookEvent[]>(
    () => EVENT_IDS.map(({ id, key }) => ({ id, label: t(`webhooks.events.${key}`) })),
    [t],
  );

  const seedEndpoints = useMemo<Endpoint[]>(() => [
    { id: 'wh1', url: 'https://hooks.acme.io/monorepo/ci',       description: t('webhooks.endpoints.ci'),      events: ['pr.opened', 'pr.merged', 'deploy.started', 'deploy.completed'], enabled: true,  createdAt: '2026-04-22', successCount: 2914, failureCount:  4 },
    { id: 'wh2', url: 'https://hooks.acme.io/monorepo/quality',  description: t('webhooks.endpoints.quality'), events: ['flaky.test.detected', 'coverage.dropped', 'bundle.size.exceeded'], enabled: true,  createdAt: '2026-04-26', successCount:  612, failureCount:  1 },
    { id: 'wh3', url: 'https://api.partner.io/se/branch-policy', description: t('webhooks.endpoints.partner'), events: ['branch.protected.violated', 'commit.signed'],                       enabled: false, createdAt: '2026-05-02', successCount:   34, failureCount: 18 },
  ], [t]);

  return (
    <WebhooksManager
      events={eventCatalog}
      initialEndpoints={seedEndpoints}
      initialDeliveries={SEED_DELIVERIES}
      defaultEvent="pr.merged"
      urlPlaceholder={t('webhooks.urlPlaceholder')}
      descPlaceholder={t('webhooks.descPlaceholder')}
      inlinePauseButton
      renderShell={({ newEndpointButton, body }) => (
        <WsShell
          orgName="ACME, Inc."
          orgSlug="acme"
          wsName="monorepo"
          wsSlug="monorepo"
          title={t('webhooks.title')}
          subtitle={t('webhooks.subtitle')}
          topRight={newEndpointButton}
        >
          {body}
        </WsShell>
      )}
    />
  );
}
