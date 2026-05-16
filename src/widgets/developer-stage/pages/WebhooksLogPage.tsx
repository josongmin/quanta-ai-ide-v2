import { useMemo, useState } from 'react';
import { Filter, RefreshCw, CheckCircle2, XCircle, AlertTriangle, ChevronRight } from 'lucide-react';
import { DeveloperShell } from '../parts/DeveloperShell';

type Status = 'delivered' | 'failed' | 'retrying';
type Delivery = {
  id: string;
  event: string;
  endpoint: string;
  status: Status;
  httpStatus: number | null;
  durationMs: number;
  at: string;
  attempt: number;
  payloadPreview: string;
};

const DELIVERIES: Delivery[] = [
  { id: 'd_482', event: 'admission.fired',     endpoint: 'hooks.acme.io/se',       status: 'delivered', httpStatus: 200, durationMs: 142, at: '14:32:08', attempt: 1, payloadPreview: '{"rule_id":"rl_71","verdict":"warn"}' },
  { id: 'd_481', event: 'agent.run.succeeded', endpoint: 'hooks.acme.io/se',       status: 'delivered', httpStatus: 200, durationMs: 89,  at: '14:31:42', attempt: 1, payloadPreview: '{"run_id":"run_24","status":"succeeded"}' },
  { id: 'd_480', event: 'webhook.test',        endpoint: 'staging.acme.io/x',      status: 'failed',    httpStatus: 502, durationMs: 5021,at: '14:30:11', attempt: 3, payloadPreview: '{"test":true}' },
  { id: 'd_479', event: 'workspace.created',   endpoint: 'analytics.acme.io/in',   status: 'retrying',  httpStatus: 429, durationMs: 312, at: '14:28:55', attempt: 2, payloadPreview: '{"workspace_id":"ws_2c1d"}' },
  { id: 'd_478', event: 'agent.run.failed',    endpoint: 'hooks.acme.io/se',       status: 'delivered', httpStatus: 200, durationMs: 121, at: '14:27:30', attempt: 1, payloadPreview: '{"run_id":"run_23","error":"timeout"}' },
  { id: 'd_477', event: 'admission.fired',     endpoint: 'hooks.acme.io/se',       status: 'delivered', httpStatus: 200, durationMs: 98,  at: '14:25:12', attempt: 1, payloadPreview: '{"rule_id":"rl_18","verdict":"block"}' },
  { id: 'd_476', event: 'admission.fired',     endpoint: 'hooks.acme.io/se',       status: 'failed',    httpStatus: 500, durationMs: 4202,at: '14:21:48', attempt: 4, payloadPreview: '{"rule_id":"rl_71","verdict":"warn"}' },
  { id: 'd_475', event: 'member.invited',      endpoint: 'crm.acme.io/in',         status: 'delivered', httpStatus: 201, durationMs: 64,  at: '14:18:01', attempt: 1, payloadPreview: '{"email":"new@acme.com"}' },
];

const STATUS_META: Record<Status, { label: string; fg: string; bg: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }> = {
  delivered: { label: 'Delivered', fg: 'var(--intent-success-fg)', bg: 'var(--intent-success-bg)', icon: CheckCircle2 },
  failed:    { label: 'Failed',    fg: 'var(--intent-danger-fg)',  bg: 'var(--intent-danger-bg)',  icon: XCircle },
  retrying:  { label: 'Retrying',  fg: 'var(--intent-warn-fg)',    bg: 'var(--intent-warn-bg)',    icon: AlertTriangle },
};

const FILTERS: { id: 'all' | Status; label: string }[] = [
  { id: 'all',       label: 'All' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'retrying',  label: 'Retrying' },
  { id: 'failed',    label: 'Failed' },
];

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
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[11px] font-semibold transition-colors"
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
              className="h-7 px-3 rounded-full text-[11px] font-medium transition-colors"
              style={{
                background: active ? 'color-mix(in srgb, var(--brand-vivid) 12%, transparent)' : 'transparent',
                color: active ? 'var(--brand-fg)' : 'var(--fg-muted)',
                border: `1px solid ${active ? 'color-mix(in srgb, var(--brand-vivid) 40%, transparent)' : 'var(--border-default)'}`,
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
            <div className="py-14 text-center text-[12px]" style={{ color: 'var(--fg-subtle)' }}>
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

function SummaryTile({
  label, value, tone,
}: { label: string; value: number; tone: 'default' | 'success' | 'warn' | 'danger' }) {
  const color =
    tone === 'success' ? 'var(--intent-success-fg)' :
    tone === 'warn'    ? 'var(--intent-warn-fg)' :
    tone === 'danger'  ? 'var(--intent-danger-fg)' :
    'var(--fg-strong)';
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-1"
      style={{
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-default)',
      }}
    >
      <span className="text-[10px] uppercase tracking-[0.14em] font-semibold" style={{ color: 'var(--fg-subtle)' }}>
        {label}
      </span>
      <span className="text-[22px] font-semibold tabular-nums tracking-tight" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

function DeliveryRow({
  d, last, active, onClick,
}: { d: Delivery; last: boolean; active: boolean; onClick: () => void }) {
  const m = STATUS_META[d.status];
  const Icon = m.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left grid items-center px-4 h-12 transition-colors"
      style={{
        gridTemplateColumns: '0.5fr 1.6fr 1.4fr 0.6fr 0.4fr 0.6fr',
        borderBottom: last ? 'none' : '1px solid var(--border-muted)',
        background: active ? 'color-mix(in srgb, var(--brand-vivid) 7%, transparent)' : 'transparent',
        boxShadow: active ? 'inset 0 0 0 1px color-mix(in srgb, var(--brand-vivid) 40%, transparent)' : 'none',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg-hover)'; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      <Icon className="w-3.5 h-3.5" style={{ color: m.fg }} />
      <code className="text-[11px] font-mono truncate" style={{ color: 'var(--fg-strong)' }}>{d.event}</code>
      <span className="text-[11px] truncate" style={{ color: 'var(--fg-muted)' }}>{d.endpoint}</span>
      <span className="text-[11px] tabular-nums" style={{ color: d.httpStatus && d.httpStatus >= 400 ? m.fg : 'var(--fg-muted)' }}>
        {d.httpStatus ?? '—'}
      </span>
      <span className="text-[11px] tabular-nums text-right" style={{ color: 'var(--fg-muted)' }}>{d.durationMs}ms</span>
      <span className="text-[11px] tabular-nums text-right font-mono" style={{ color: 'var(--fg-subtle)' }}>{d.at}</span>
    </button>
  );
}

function DeliveryInspector({ d }: { d: Delivery }) {
  const m = STATUS_META[d.status];
  return (
    <aside
      className="border-l overflow-y-auto"
      style={{
        borderColor: 'var(--border-muted)',
        background: 'var(--bg-surface-muted)',
        maxHeight: 'calc(100vh - 380px)',
      }}
    >
      <div className="p-5 flex flex-col gap-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="inline-flex items-center gap-1 px-2 h-5 rounded text-[10px] font-bold"
              style={{ color: m.fg, background: m.bg }}
            >
              <m.icon className="w-2.5 h-2.5" />
              {m.label}
            </span>
            <code className="text-[11px] font-mono" style={{ color: 'var(--fg-subtle)' }}>{d.id}</code>
          </div>
          <code className="text-[14px] font-mono" style={{ color: 'var(--fg-strong)' }}>{d.event}</code>
          <div className="mt-1 text-[11px]" style={{ color: 'var(--fg-muted)' }}>
            → <span className="font-mono">{d.endpoint}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Stat label="HTTP" value={d.httpStatus ? String(d.httpStatus) : '—'} />
          <Stat label="Duration" value={`${d.durationMs}ms`} />
          <Stat label="Attempt" value={`#${d.attempt}`} />
        </div>

        <Section title="Payload">
          <pre
            className="text-[11px] font-mono p-3 rounded-md overflow-x-auto"
            style={{
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border-default)',
              color: 'var(--fg-strong)',
            }}
          >
            {d.payloadPreview}
          </pre>
        </Section>

        <Section title="Headers">
          <div
            className="text-[11px] font-mono p-3 rounded-md"
            style={{
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border-default)',
              color: 'var(--fg-muted)',
            }}
          >
            <div><span style={{ color: 'var(--fg-subtle)' }}>X-Acme-Signature:</span> t=174..,v1=••••</div>
            <div><span style={{ color: 'var(--fg-subtle)' }}>X-Acme-Event:</span> {d.event}</div>
            <div><span style={{ color: 'var(--fg-subtle)' }}>X-Acme-Delivery:</span> {d.id}</div>
            <div><span style={{ color: 'var(--fg-subtle)' }}>Content-Type:</span> application/json</div>
          </div>
        </Section>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[11px] font-semibold transition-colors"
            style={{ background: 'var(--fg-strong)', color: 'var(--bg-canvas)' }}
          >
            <RefreshCw className="w-3 h-3" />
            Resend
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 h-8 px-3 rounded-md text-[11px] font-medium transition-colors"
            style={{
              background: 'transparent',
              border: '1px solid var(--border-default)',
              color: 'var(--fg-default)',
            }}
          >
            View request body
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </aside>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-md p-2.5"
      style={{
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-default)',
      }}
    >
      <div className="text-[9px] uppercase tracking-[0.14em] font-semibold" style={{ color: 'var(--fg-subtle)' }}>
        {label}
      </div>
      <div className="text-[12px] font-semibold tabular-nums mt-0.5" style={{ color: 'var(--fg-strong)' }}>
        {value}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[10px] uppercase tracking-[0.14em] font-semibold" style={{ color: 'var(--fg-subtle)' }}>
        {title}
      </span>
      {children}
    </div>
  );
}
