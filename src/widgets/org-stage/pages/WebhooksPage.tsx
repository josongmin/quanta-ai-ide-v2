import { useState } from 'react';
import {
  Webhook, Plus, Check, X, Activity, Pause, Play,
  Copy, RefreshCw, Trash2, ChevronRight, AlertTriangle,
} from 'lucide-react';
import { OrgShell } from '../parts/OrgShell';
import { Button, Toggle } from '@shared/ui/forms';

type Endpoint = {
  id: string;
  url: string;
  description: string;
  events: string[];
  enabled: boolean;
  createdAt: string;
  successCount: number;
  failureCount: number;
};

type Delivery = {
  id: string;
  endpointId: string;
  event: string;
  status: 'success' | 'failure';
  statusCode: number;
  durationMs: number;
  at: string;
};

const EVENT_CATALOG: { id: string; label: string }[] = [
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
  const [endpoints, setEndpoints] = useState<Endpoint[]>(SEED_ENDPOINTS);
  const [deliveries, setDeliveries] = useState<Delivery[]>(SEED_DELIVERIES);
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Endpoint | null>(null);

  const toggleEnabled = (id: string) => {
    setEndpoints((all) => all.map((e) => (e.id === id ? { ...e, enabled: !e.enabled } : e)));
  };
  const remove = (id: string) => {
    setEndpoints((all) => all.filter((e) => e.id !== id));
    setDeliveries((all) => all.filter((d) => d.endpointId !== id));
  };
  const addEndpoint = (url: string, description: string, events: string[]) => {
    const id = `wh-${Date.now()}`;
    setEndpoints((all) => [...all, {
      id, url, description, events, enabled: true, createdAt: '2026-05-11', successCount: 0, failureCount: 0,
    }]);
  };
  const redeliver = (deliveryId: string) => {
    setDeliveries((all) => all.map((d) => (d.id === deliveryId ? { ...d, status: 'success', statusCode: 200, durationMs: 120, at: 'just now' } : d)));
  };

  return (
    <OrgShell
      orgName="ACME, Inc."
      orgSlug="acme"
      title="Webhooks"
      subtitle="HTTP callbacks fired from org-level events. Each endpoint can subscribe to a subset of event types."
      topRight={
        <Button variant="primary" size="md" leading={<Plus className="w-3.5 h-3.5" />} onClick={() => { setCreateOpen(true); }}>
          New endpoint
        </Button>
      }
    >
      {/* Endpoints */}
      <h2 className="text-[10px] uppercase tracking-[0.14em] font-semibold mb-2" style={{ color: 'var(--fg-subtle)' }}>
        Endpoints · {endpoints.length}
      </h2>
      <div className="rounded-md overflow-hidden" style={{ border: '1px solid var(--border-muted)' }}>
        {endpoints.length === 0 ? (
          <div className="px-4 py-8 text-center text-[12px]" style={{ color: 'var(--fg-subtle)' }}>
            No endpoints yet. Add one to start receiving events.
          </div>
        ) : endpoints.map((e) => (
          <EndpointRow
            key={e.id}
            endpoint={e}
            onToggle={() => { toggleEnabled(e.id); }}
            onDelete={() => { setConfirmDelete(e); }}
          />
        ))}
      </div>

      {/* Recent deliveries */}
      <h2 className="text-[10px] uppercase tracking-[0.14em] font-semibold mt-8 mb-2 flex items-center gap-1.5" style={{ color: 'var(--fg-subtle)' }}>
        <Activity className="w-3 h-3" />
        Recent deliveries
      </h2>
      <div className="rounded-md overflow-hidden" style={{ border: '1px solid var(--border-muted)' }}>
        <div
          className="grid items-center px-3 h-9 text-[10px] uppercase tracking-[0.14em] font-semibold"
          style={{
            gridTemplateColumns: '20px 1fr 90px 80px 90px 90px 90px',
            gap: 12,
            background: 'var(--bg-surface-muted)',
            color: 'var(--fg-subtle)',
            borderBottom: '1px solid var(--border-muted)',
          }}
        >
          <span />
          <span>Event · Endpoint</span>
          <span>HTTP</span>
          <span>Latency</span>
          <span>When</span>
          <span />
          <span />
        </div>
        {deliveries.map((d) => {
          const ep = endpoints.find((e) => e.id === d.endpointId);
          return (
            <DeliveryRow key={d.id} delivery={d} endpointUrl={ep?.url ?? '(deleted)'} onRedeliver={() => { redeliver(d.id); }} />
          );
        })}
      </div>

      {createOpen && (
        <CreateEndpointModal
          onCancel={() => { setCreateOpen(false); }}
          onCreate={(url, desc, events) => { addEndpoint(url, desc, events); setCreateOpen(false); }}
        />
      )}
      {confirmDelete && (
        <ConfirmDelete
          url={confirmDelete.url}
          onCancel={() => { setConfirmDelete(null); }}
          onConfirm={() => { remove(confirmDelete.id); setConfirmDelete(null); }}
        />
      )}
    </OrgShell>
  );
}

function EndpointRow({
  endpoint, onToggle, onDelete,
}: { endpoint: Endpoint; onToggle: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const total = endpoint.successCount + endpoint.failureCount;
  const successRate = total > 0 ? (endpoint.successCount / total) * 100 : 100;

  return (
    <div
      className="flex flex-col"
      style={{
        borderTop: expanded ? '1px solid var(--border-muted)' : 'none',
        opacity: endpoint.enabled ? 1 : 0.6,
      }}
    >
      <div
        role="row"
        className="flex items-center gap-3 px-3 h-14 transition-colors"
        style={{ borderTop: '1px solid var(--border-muted)' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <button
          type="button"
          onClick={() => { setExpanded((v) => !v); }}
          className="w-7 h-7 rounded-md inline-flex items-center justify-center"
          style={{ color: 'var(--fg-subtle)' }}
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          <ChevronRight
            className="w-4 h-4 transition-transform"
            style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
          />
        </button>
        <Webhook className="w-4 h-4 shrink-0" style={{ color: 'var(--fg-muted)' }} />
        <div className="flex flex-col flex-1 min-w-0 gap-0.5">
          <span className="text-[12px] font-mono truncate" style={{ color: 'var(--fg-strong)' }}>
            {endpoint.url}
          </span>
          <div className="flex items-center gap-3 text-[10px] tabular-nums" style={{ color: 'var(--fg-muted)' }}>
            <span>{endpoint.events.length} events</span>
            <span>·</span>
            <span style={{ color: successRate < 95 ? 'var(--intent-warn-fg)' : 'var(--fg-muted)' }}>
              {successRate.toFixed(1)}% success
            </span>
            <span>·</span>
            <span>added {endpoint.createdAt}</span>
          </div>
        </div>
        <Toggle checked={endpoint.enabled} onChange={onToggle} label="Enable" />
        <button
          type="button"
          onClick={onDelete}
          className="w-7 h-7 rounded-md inline-flex items-center justify-center"
          style={{ color: 'var(--fg-subtle)' }}
          aria-label="Delete endpoint"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      {expanded && (
        <div className="px-3 py-3 flex flex-col gap-3" style={{ background: 'var(--bg-surface-muted)' }}>
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.14em] font-semibold" style={{ color: 'var(--fg-subtle)' }}>
              Description
            </span>
            <span className="text-[12px]" style={{ color: 'var(--fg-default)' }}>
              {endpoint.description || '—'}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.14em] font-semibold" style={{ color: 'var(--fg-subtle)' }}>
              Subscribed events
            </span>
            <div className="flex flex-wrap gap-1.5">
              {endpoint.events.map((ev) => (
                <span
                  key={ev}
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                  style={{
                    background: 'var(--bg-canvas)',
                    border: '1px solid var(--border-muted)',
                    color: 'var(--fg-default)',
                  }}
                >
                  {ev}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button leading={<Copy className="w-3 h-3" />}>Copy signing secret</Button>
            <Button leading={endpoint.enabled ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />} onClick={() => { /* duplicate of toggle */ }}>
              {endpoint.enabled ? 'Pause' : 'Resume'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function DeliveryRow({
  delivery, endpointUrl, onRedeliver,
}: { delivery: Delivery; endpointUrl: string; onRedeliver: () => void }) {
  const ok = delivery.status === 'success';
  return (
    <div
      role="row"
      className="grid items-center px-3 h-11 text-[12px] transition-colors"
      style={{
        gridTemplateColumns: '20px 1fr 90px 80px 90px 90px 90px',
        gap: 12,
        borderTop: '1px solid var(--border-muted)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      {ok
        ? <Check className="w-3.5 h-3.5" style={{ color: 'var(--intent-success-fg)' }} />
        : <X className="w-3.5 h-3.5" style={{ color: 'var(--intent-danger-fg)' }} />}
      <div className="flex flex-col min-w-0 gap-0.5">
        <span className="font-mono truncate" style={{ color: 'var(--fg-strong)' }}>{delivery.event}</span>
        <span className="text-[10px] truncate" style={{ color: 'var(--fg-subtle)' }}>{endpointUrl}</span>
      </div>
      <span
        className="font-mono tabular-nums text-[11px]"
        style={{ color: ok ? 'var(--intent-success-fg)' : 'var(--intent-danger-fg)' }}
      >
        {delivery.statusCode}
      </span>
      <span className="font-mono tabular-nums text-[11px]" style={{ color: 'var(--fg-muted)' }}>
        {delivery.durationMs}ms
      </span>
      <span className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>{delivery.at}</span>
      <div />
      <div className="flex justify-end">
        <Button leading={<RefreshCw className="w-3 h-3" />} onClick={onRedeliver} disabled={ok}>
          Redeliver
        </Button>
      </div>
    </div>
  );
}

function CreateEndpointModal({
  onCancel, onCreate,
}: { onCancel: () => void; onCreate: (url: string, desc: string, events: string[]) => void }) {
  const [url, setUrl] = useState('https://');
  const [desc, setDesc] = useState('');
  const [events, setEvents] = useState<Set<string>>(new Set(['admission.failed']));
  const valid = /^https:\/\/.+/.test(url) && events.size > 0;

  const toggle = (id: string) => {
    setEvents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <>
      <button type="button" aria-label="Dismiss" className="fixed inset-0 z-40 border-0 p-0 cursor-default" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={onCancel} />
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[520px] max-h-[80vh] flex flex-col rounded-lg overflow-hidden"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-md)' }}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-muted)' }}>
          <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>New webhook endpoint</span>
          <button type="button" onClick={onCancel} className="w-7 h-7 inline-flex items-center justify-center" style={{ color: 'var(--fg-muted)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 flex flex-col gap-4 overflow-y-auto">
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.14em] font-medium" style={{ color: 'var(--fg-subtle)' }}>URL</span>
            <input
              value={url}
              onChange={(e) => { setUrl(e.target.value); }}
              placeholder="https://hooks.example.com/se-events"
              className="h-9 rounded-md px-3 text-[12px] font-mono outline-none"
              style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)', color: 'var(--fg-strong)' }}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.14em] font-medium" style={{ color: 'var(--fg-subtle)' }}>Description</span>
            <input
              value={desc}
              onChange={(e) => { setDesc(e.target.value); }}
              placeholder="e.g. Internal warehouse mirror"
              className="h-9 rounded-md px-3 text-[12px] outline-none"
              style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)', color: 'var(--fg-strong)' }}
            />
          </label>
          <div className="flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-[0.14em] font-medium flex items-center justify-between" style={{ color: 'var(--fg-subtle)' }}>
              <span>Events</span>
              <span className="lowercase tracking-normal tabular-nums">{events.size} selected</span>
            </span>
            <div className="rounded-md overflow-hidden flex flex-col" style={{ border: '1px solid var(--border-muted)' }}>
              {EVENT_CATALOG.map((e) => {
                const on = events.has(e.id);
                return (
                  <label
                    key={e.id}
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors"
                    style={{
                      borderTop: '1px solid var(--border-muted)',
                      background: on ? 'var(--bg-active)' : 'transparent',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => { toggle(e.id); }}
                      className="w-3.5 h-3.5 cursor-pointer"
                    />
                    <span className="font-mono text-[11px] flex-1" style={{ color: 'var(--fg-default)' }}>{e.id}</span>
                    <span className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>{e.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-4 py-3" style={{ borderTop: '1px solid var(--border-muted)', background: 'var(--bg-surface-muted)' }}>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" size="md" disabled={!valid} onClick={() => { onCreate(url, desc, Array.from(events)); }}>
            Create endpoint
          </Button>
        </div>
      </div>
    </>
  );
}

function ConfirmDelete({
  url, onCancel, onConfirm,
}: { url: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <>
      <button type="button" aria-label="Dismiss" className="fixed inset-0 z-40 border-0 p-0 cursor-default" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={onCancel} />
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[420px] rounded-lg overflow-hidden"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-md)' }}
      >
        <div className="p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" style={{ color: 'var(--intent-danger-fg)' }} />
            <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>Delete endpoint?</span>
          </div>
          <p className="text-[12px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
            <span className="font-mono">{url}</span> will stop receiving events immediately. Past delivery history is purged after 30 days.
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 px-4 py-3" style={{ borderTop: '1px solid var(--border-muted)', background: 'var(--bg-surface-muted)' }}>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" size="md" onClick={onConfirm}>Delete</Button>
        </div>
      </div>
    </>
  );
}
