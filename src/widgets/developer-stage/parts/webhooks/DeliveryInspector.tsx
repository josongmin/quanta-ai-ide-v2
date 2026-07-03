import { RefreshCw, ChevronRight } from 'lucide-react';
import type { Delivery } from './data';
import { STATUS_META } from './data';

export function DeliveryInspector({ d }: { d: Delivery }) {
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
              className="inline-flex items-center gap-1 px-2 h-5 rounded text-xs font-bold"
              style={{ color: m.fg, background: m.bg }}
            >
              <m.icon className="w-2.5 h-2.5" />
              {m.label}
            </span>
            <code className="text-sm font-mono" style={{ color: 'var(--fg-subtle)' }}>{d.id}</code>
          </div>
          <code className="text-lg font-mono" style={{ color: 'var(--fg-strong)' }}>{d.event}</code>
          <div className="mt-1 text-sm" style={{ color: 'var(--fg-muted)' }}>
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
            className="text-sm font-mono p-3 rounded-md overflow-x-auto"
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
            className="text-sm font-mono p-3 rounded-md"
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
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-sm font-semibold transition-colors"
            style={{ background: 'var(--fg-strong)', color: 'var(--bg-canvas)' }}
          >
            <RefreshCw className="w-3 h-3" />
            Resend
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 h-8 px-3 rounded-md text-sm font-medium transition-colors"
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
      <div className="text-2xs uppercase tracking-eyebrow font-semibold" style={{ color: 'var(--fg-subtle)' }}>
        {label}
      </div>
      <div className="text-base font-semibold tabular-nums mt-0.5" style={{ color: 'var(--fg-strong)' }}>
        {value}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs uppercase tracking-eyebrow font-semibold" style={{ color: 'var(--fg-subtle)' }}>
        {title}
      </span>
      {children}
    </div>
  );
}
