import { useMemo, useState } from 'react';
import { Filter, RefreshCw } from 'lucide-react';
import { DeveloperShell } from '../parts/DeveloperShell';
import { DELIVERIES, FILTERS, type Status } from '../parts/webhooks/data';
import { SummaryTile } from '../parts/webhooks/SummaryTile';
import { DeliveryRow } from '../parts/webhooks/DeliveryRow';
import { DeliveryInspector } from '../parts/webhooks/DeliveryInspector';

export default function WebhooksLogPage() {
  const [filter, setFilter] = useState<'all' | Status>('all');
  const [selectedId, setSelectedId] = useState(DELIVERIES[0].id);

  const filtered = useMemo(
    () => DELIVERIES.filter((d) => filter === 'all' || d.status === filter),
    [filter],
  );

  const selected = DELIVERIES.find((d) => d.id === selectedId) ?? DELIVERIES[0];
  const counts = useMemo(() => ({
    all: DELIVERIES.length,
    delivered: DELIVERIES.filter((d) => d.status === 'delivered').length,
    failed: DELIVERIES.filter((d) => d.status === 'failed').length,
    retrying: DELIVERIES.filter((d) => d.status === 'retrying').length,
  }), []);

  return (
    <DeveloperShell
      title="Webhook delivery log"
      subtitle="Every event we've tried to deliver in the past 24 hours. Click any delivery to inspect headers, payload, and retry."
      topRight={
        <button
          type="button"
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-sm font-semibold transition-colors"
          style={{
            background: 'var(--bg-surface-muted)',
            border: '1px solid var(--border-default)',
            color: 'var(--fg-strong)',
          }}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      }
    >
      {/* Summary tiles */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <SummaryTile label="Total"     value={counts.all}       tone="default" />
        <SummaryTile label="Delivered" value={counts.delivered} tone="success" />
        <SummaryTile label="Retrying"  value={counts.retrying}  tone="warn" />
        <SummaryTile label="Failed"    value={counts.failed}    tone="danger" />
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 mb-3">
        <Filter className="w-3.5 h-3.5" style={{ color: 'var(--fg-muted)' }} />
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => { setFilter(f.id); }}
              className="h-7 px-3 rounded-full text-sm font-medium transition-colors"
              style={{
                background: active ? 'color-mix(in srgb, var(--fg-accent) 12%, transparent)' : 'transparent',
                color: active ? 'var(--fg-accent)' : 'var(--fg-muted)',
                border: `1px solid ${active ? 'color-mix(in srgb, var(--fg-accent) 40%, transparent)' : 'var(--border-default)'}`,
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div
        className="grid rounded-xl overflow-hidden"
        style={{
          gridTemplateColumns: '1fr 440px',
          background: 'var(--bg-canvas)',
          border: '1px solid var(--border-default)',
        }}
      >
        {/* Delivery list */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 380px)' }}>
          {filtered.map((d, i) => (
            <DeliveryRow
              key={d.id}
              d={d}
              last={i === filtered.length - 1}
              active={d.id === selectedId}
              onClick={() => { setSelectedId(d.id); }}
            />
          ))}
          {filtered.length === 0 && (
            <div className="py-14 text-center text-base" style={{ color: 'var(--fg-subtle)' }}>
              No deliveries match this filter.
            </div>
          )}
        </div>

        {/* Inspector */}
        <DeliveryInspector d={selected} />
      </div>
    </DeveloperShell>
  );
}
