import { WsShell } from '../parts/WsShell';
import {
  WebhooksManager,
  type Endpoint,
  type Delivery,
  type WebhookEvent,
} from '@widgets/_shared/WebhooksManager';

// Workspace-scoped events: PR / branch / deploy / quality signals.
const EVENT_CATALOG: WebhookEvent[] = [
  { id: 'pr.opened',                  label: 'Pull request opened' },
  { id: 'pr.merged',                  label: 'Pull request merged' },
  { id: 'branch.protected.violated',  label: 'Protected branch rule violated' },
  { id: 'commit.signed',              label: 'Signed commit pushed' },
  { id: 'deploy.started',             label: 'Deploy started' },
  { id: 'deploy.completed',           label: 'Deploy completed' },
  { id: 'flaky.test.detected',        label: 'Flaky test detected' },
  { id: 'coverage.dropped',           label: 'Coverage dropped' },
  { id: 'bundle.size.exceeded',       label: 'Bundle size budget exceeded' },
];

const SEED_ENDPOINTS: Endpoint[] = [
  { id: 'wh1', url: 'https://hooks.acme.io/monorepo/ci',          description: 'CI mirror for PR + deploy events',     events: ['pr.opened', 'pr.merged', 'deploy.started', 'deploy.completed'], enabled: true,  createdAt: '2026-04-22', successCount: 2914, failureCount:  4 },
  { id: 'wh2', url: 'https://hooks.acme.io/monorepo/quality',     description: 'Quality bot — flake + coverage signal', events: ['flaky.test.detected', 'coverage.dropped', 'bundle.size.exceeded'], enabled: true,  createdAt: '2026-04-26', successCount:  612, failureCount:  1 },
  { id: 'wh3', url: 'https://api.partner.io/se/branch-policy',    description: 'Partner — branch protection audit',     events: ['branch.protected.violated', 'commit.signed'],                       enabled: false, createdAt: '2026-05-02', successCount:   34, failureCount: 18 },
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
  return (
    <WebhooksManager
      events={EVENT_CATALOG}
      initialEndpoints={SEED_ENDPOINTS}
      initialDeliveries={SEED_DELIVERIES}
      defaultEvent="pr.merged"
      urlPlaceholder="https://hooks.example.com/monorepo"
      descPlaceholder="e.g. CI mirror for PR + deploy events"
      inlinePauseButton
      renderShell={({ newEndpointButton, body }) => (
        <WsShell
          orgName="ACME, Inc."
          orgSlug="acme"
          wsName="monorepo"
          wsSlug="monorepo"
          title="Webhooks"
          subtitle="HTTP callbacks fired from workspace-level events: pull requests, branch policy, deploys, and code-quality signals."
          topRight={newEndpointButton}
        >
          {body}
        </WsShell>
      )}
    />
  );
}
