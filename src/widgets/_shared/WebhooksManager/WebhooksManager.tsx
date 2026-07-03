import { type ReactNode, useState } from 'react';
import {
  Webhook, Plus, Check, X, Activity, Pause, Play,
  Copy, RefreshCw, Trash2, ChevronRight,
} from 'lucide-react';
import { Button, Toggle } from '@shared/ui/forms';
import { SettingsModal, ConfirmDialog, DataTable } from '@shared/ui';

export type Endpoint = {
  id: string;
  url: string;
  description: string;
  events: string[];
  enabled: boolean;
  createdAt: string;
  successCount: number;
  failureCount: number;
};

export type Delivery = {
  id: string;
  endpointId: string;
  event: string;
  status: 'success' | 'failure';
  statusCode: number;
  durationMs: number;
  at: string;
};

export type WebhookEvent = { id: string; label: string };

export type WebhooksManagerProps = {
  /** Event catalog offered when creating an endpoint. */
  events: WebhookEvent[];
  /** Initial endpoint fixtures. */
  initialEndpoints: Endpoint[];
  /** Initial delivery-log fixtures. */
  initialDeliveries: Delivery[];
  /** Event id pre-selected in the create modal. */
  defaultEvent: string;
  /** Placeholder text for the URL field in the create modal. */
  urlPlaceholder: string;
  /** Placeholder text for the description field in the create modal. */
  descPlaceholder: string;
  /**
   * When true, the row surfaces an inline Pause/Resume button (ws variant)
   * instead of the expanded-panel Pause/Resume button (org variant).
   */
  inlinePauseButton?: boolean;
  /**
   * Renders the outer Shell (OrgShell / WsShell). Receives the "New endpoint"
   * button to place in the Shell's topRight slot, and the body to render as
   * children. This keeps the create-modal state owned by the manager while the
   * trigger lives in the Shell header.
   */
  renderShell: (args: { newEndpointButton: ReactNode; body: ReactNode }) => ReactNode;
};

/**
 * Shared webhooks admin surface — the endpoint list, create/delete modals,
 * delivery log, and enable toggles. Rendered by both org-stage and ws-stage
 * WebhooksPage. Each page supplies its own fixtures and its own Shell via
 * `renderShell`; everything else is identical between the two.
 */
export function WebhooksManager({
  events,
  initialEndpoints,
  initialDeliveries,
  defaultEvent,
  urlPlaceholder,
  descPlaceholder,
  inlinePauseButton = false,
  renderShell,
}: WebhooksManagerProps) {
  const [endpoints, setEndpoints] = useState<Endpoint[]>(initialEndpoints);
  const [deliveries, setDeliveries] = useState<Delivery[]>(initialDeliveries);
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Endpoint | null>(null);

  const toggleEnabled = (id: string) => {
    setEndpoints((all) => all.map((e) => (e.id === id ? { ...e, enabled: !e.enabled } : e)));
  };
  const remove = (id: string) => {
    setEndpoints((all) => all.filter((e) => e.id !== id));
    setDeliveries((all) => all.filter((d) => d.endpointId !== id));
  };
  const addEndpoint = (url: string, description: string, evts: string[]) => {
    const id = `wh-${Date.now()}`;
    setEndpoints((all) => [...all, {
      id, url, description, events: evts, enabled: true, createdAt: '2026-05-11', successCount: 0, failureCount: 0,
    }]);
  };
  const redeliver = (deliveryId: string) => {
    setDeliveries((all) => all.map((d) => (d.id === deliveryId ? { ...d, status: 'success', statusCode: 200, durationMs: 120, at: 'just now' } : d)));
  };

  const newEndpointButton = (
    <Button variant="primary" size="md" leading={<Plus className="w-3.5 h-3.5" />} onClick={() => { setCreateOpen(true); }}>
      New endpoint
    </Button>
  );

  const body = (
    <>
      {/* Endpoints */}
      <h2 className="text-xs uppercase tracking-eyebrow font-semibold mb-2" style={{ color: 'var(--fg-subtle)' }}>
        Endpoints · {endpoints.length}
      </h2>
      <div className="rounded-md overflow-hidden" style={{ border: '1px solid var(--border-muted)' }}>
        {endpoints.length === 0 ? (
          <div className="px-4 py-8 text-center text-base" style={{ color: 'var(--fg-subtle)' }}>
            No endpoints yet. Add one to start receiving events.
          </div>
        ) : endpoints.map((e) => (
          <EndpointRow
            key={e.id}
            endpoint={e}
            inlinePauseButton={inlinePauseButton}
            onToggle={() => { toggleEnabled(e.id); }}
            onDelete={() => { setConfirmDelete(e); }}
          />
        ))}
      </div>

      {/* Recent deliveries */}
      <h2 className="text-xs uppercase tracking-eyebrow font-semibold mt-8 mb-2 flex items-center gap-1.5" style={{ color: 'var(--fg-subtle)' }}>
        <Activity className="w-3 h-3" />
        Recent deliveries
      </h2>
      <DataTable
        columns="20px 1fr 90px 80px 90px 90px 90px"
        firstRowBorder
        rowHeight={44}
        headers={[
          { header: '' },
          { header: 'Event · Endpoint' },
          { header: 'HTTP' },
          { header: 'Latency' },
          { header: 'When' },
          { header: '' },
          { header: '' },
        ]}
        rows={deliveries}
        rowKey={(d) => d.id}
        renderRow={(d) => {
          const ep = endpoints.find((e) => e.id === d.endpointId);
          return (
            <DeliveryCells delivery={d} endpointUrl={ep?.url ?? '(deleted)'} onRedeliver={() => { redeliver(d.id); }} />
          );
        }}
      />

      {createOpen && (
        <CreateEndpointModal
          events={events}
          defaultEvent={defaultEvent}
          urlPlaceholder={urlPlaceholder}
          descPlaceholder={descPlaceholder}
          onCancel={() => { setCreateOpen(false); }}
          onCreate={(url, desc, evts) => { addEndpoint(url, desc, evts); setCreateOpen(false); }}
        />
      )}
      {confirmDelete && (
        <ConfirmDialog
          open
          onCancel={() => { setConfirmDelete(null); }}
          onConfirm={() => { remove(confirmDelete.id); setConfirmDelete(null); }}
          title="Delete endpoint?"
          confirmLabel="Delete"
          description={(
            <>
              <span className="font-mono">{confirmDelete.url}</span> will stop receiving events immediately. Past delivery history is purged after 30 days.
            </>
          )}
        />
      )}
    </>
  );

  return <>{renderShell({ newEndpointButton, body })}</>;
}

function EndpointRow({
  endpoint, onToggle, onDelete, inlinePauseButton,
}: { endpoint: Endpoint; onToggle: () => void; onDelete: () => void; inlinePauseButton: boolean }) {
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
          <span className="text-base font-mono truncate" style={{ color: 'var(--fg-strong)' }}>
            {endpoint.url}
          </span>
          <div className="flex items-center gap-3 text-xs tabular-nums" style={{ color: 'var(--fg-muted)' }}>
            <span>{endpoint.events.length} events</span>
            <span>·</span>
            <span style={{ color: successRate < 95 ? 'var(--intent-warn-fg)' : 'var(--fg-muted)' }}>
              {successRate.toFixed(1)}% success
            </span>
            <span>·</span>
            <span>added {endpoint.createdAt}</span>
          </div>
        </div>
        {inlinePauseButton && (
          <Button leading={endpoint.enabled ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />} onClick={onToggle}>
            {endpoint.enabled ? 'Pause' : 'Resume'}
          </Button>
        )}
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
            <span className="text-xs uppercase tracking-eyebrow font-semibold" style={{ color: 'var(--fg-subtle)' }}>
              Description
            </span>
            <span className="text-base" style={{ color: 'var(--fg-default)' }}>
              {endpoint.description || '—'}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-eyebrow font-semibold" style={{ color: 'var(--fg-subtle)' }}>
              Subscribed events
            </span>
            <div className="flex flex-wrap gap-1.5">
              {endpoint.events.map((ev) => (
                <span
                  key={ev}
                  className="text-xs font-mono px-1.5 py-0.5 rounded"
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
            {!inlinePauseButton && (
              <Button leading={endpoint.enabled ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />} onClick={() => { /* duplicate of toggle */ }}>
                {endpoint.enabled ? 'Pause' : 'Resume'}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DeliveryCells({
  delivery, endpointUrl, onRedeliver,
}: { delivery: Delivery; endpointUrl: string; onRedeliver: () => void }) {
  const ok = delivery.status === 'success';
  return (
    <>
      {ok
        ? <Check className="w-3.5 h-3.5" style={{ color: 'var(--intent-success-fg)' }} />
        : <X className="w-3.5 h-3.5" style={{ color: 'var(--intent-danger-fg)' }} />}
      <div className="flex flex-col min-w-0 gap-0.5">
        <span className="font-mono truncate" style={{ color: 'var(--fg-strong)' }}>{delivery.event}</span>
        <span className="text-xs truncate" style={{ color: 'var(--fg-subtle)' }}>{endpointUrl}</span>
      </div>
      <span
        className="font-mono tabular-nums text-sm"
        style={{ color: ok ? 'var(--intent-success-fg)' : 'var(--intent-danger-fg)' }}
      >
        {delivery.statusCode}
      </span>
      <span className="font-mono tabular-nums text-sm" style={{ color: 'var(--fg-muted)' }}>
        {delivery.durationMs}ms
      </span>
      <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>{delivery.at}</span>
      <div />
      <div className="flex justify-end">
        <Button leading={<RefreshCw className="w-3 h-3" />} onClick={onRedeliver} disabled={ok}>
          Redeliver
        </Button>
      </div>
    </>
  );
}

function CreateEndpointModal({
  events, defaultEvent, urlPlaceholder, descPlaceholder, onCancel, onCreate,
}: {
  events: WebhookEvent[];
  defaultEvent: string;
  urlPlaceholder: string;
  descPlaceholder: string;
  onCancel: () => void;
  onCreate: (url: string, desc: string, events: string[]) => void;
}) {
  const [url, setUrl] = useState('https://');
  const [desc, setDesc] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set([defaultEvent]));
  const valid = /^https:\/\/.+/.test(url) && selected.size > 0;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <SettingsModal
      open
      onClose={onCancel}
      title="New webhook endpoint"
      size="lg"
      maxHeightVh={80}
      footer={(
        <>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" size="md" disabled={!valid} onClick={() => { onCreate(url, desc, Array.from(selected)); }}>
            Create endpoint
          </Button>
        </>
      )}
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-xs uppercase tracking-eyebrow font-medium" style={{ color: 'var(--fg-subtle)' }}>URL</span>
        <input
          value={url}
          onChange={(e) => { setUrl(e.target.value); }}
          placeholder={urlPlaceholder}
          className="h-9 rounded-md px-3 text-base font-mono outline-none"
          style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)', color: 'var(--fg-strong)' }}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs uppercase tracking-eyebrow font-medium" style={{ color: 'var(--fg-subtle)' }}>Description</span>
        <input
          value={desc}
          onChange={(e) => { setDesc(e.target.value); }}
          placeholder={descPlaceholder}
          className="h-9 rounded-md px-3 text-base outline-none"
          style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)', color: 'var(--fg-strong)' }}
        />
      </label>
      <div className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-eyebrow font-medium flex items-center justify-between" style={{ color: 'var(--fg-subtle)' }}>
          <span>Events</span>
          <span className="lowercase tracking-normal tabular-nums">{selected.size} selected</span>
        </span>
        <div className="rounded-md overflow-hidden flex flex-col" style={{ border: '1px solid var(--border-muted)' }}>
          {events.map((e) => {
            const on = selected.has(e.id);
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
                <span className="font-mono text-sm flex-1" style={{ color: 'var(--fg-default)' }}>{e.id}</span>
                <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>{e.label}</span>
              </label>
            );
          })}
        </div>
      </div>
    </SettingsModal>
  );
}
