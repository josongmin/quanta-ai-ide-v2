import { OrgShell } from '../parts/OrgShell';
import {
  WebhooksManager,
  type Endpoint,
  type Delivery,
  type WebhookEvent,
} from '@widgets/_shared/WebhooksManager';

const EVENT_CATALOG: WebhookEvent[] = [
  { id: 'admission.passed',  label: 'Admission gate passed' },
  { id: 'admission.failed',  label: 'Admission gate failed' },
  { id: 'review.requested',  label: 'Review requested' },
  { id: 'review.approved',   label: 'Review approved' },
  { id: 'agent.started',     label: 'Agent started' },
  { id: 'agent.completed',   label: 'Agent completed' },
  { id: 'agent.killed',      label: 'Agent killed' },
  { id: 'incident.opened',   label: 'Incident opened' },
  { id: 'incident.resolved', label: 'Incident resolved' },
  { id: 'workspace.created', label: 'Workspace created' },
  { id: 'member.invited',    label: 'Member invited' },
];

const SEED_ENDPOINTS: Endpoint[] = [
  { id: 'wh1', url: 'https://hooks.acme.io/se-events',          description: 'Mirror to internal warehouse', events: ['admission.passed', 'admission.failed', 'agent.completed'], enabled: true,  createdAt: '2026-04-21', successCount: 1842, failureCount: 3 },
  { id: 'wh2', url: 'https://api.partner.io/webhooks/seq8f3',   description: 'Partner gate-result mirror',    events: ['admission.failed'],                                          enabled: true,  createdAt: '2026-04-25', successCount:  214, failureCount: 0 },
  { id: 'wh3', url: 'https://staging.acme.io/se-events',        description: 'Staging only',                  events: ['agent.started', 'agent.completed', 'agent.killed'],         enabled: false, createdAt: '2026-05-01', successCount:   58, failureCount: 12 },
];

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
  return (
    <WebhooksManager
      events={EVENT_CATALOG}
      initialEndpoints={SEED_ENDPOINTS}
      initialDeliveries={SEED_DELIVERIES}
      defaultEvent="admission.failed"
      urlPlaceholder="https://hooks.example.com/se-events"
      descPlaceholder="e.g. Internal warehouse mirror"
      renderShell={({ newEndpointButton, body }) => (
        <OrgShell
          orgName="ACME, Inc."
          orgSlug="acme"
          title="Webhooks"
          subtitle="HTTP callbacks fired from org-level events. Each endpoint can subscribe to a subset of event types."
          topRight={newEndpointButton}
        >
          {body}
        </OrgShell>
      )}
    />
  );
}
