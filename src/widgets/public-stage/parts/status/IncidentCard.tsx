import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Incident } from './types';
import { PulseDot } from './atoms';

type Tone = 'success' | 'info' | 'warn';

const INCIDENT_TONE: Record<Incident['status'], Tone> = {
  resolved:      'success',
  monitoring:    'info',
  investigating: 'warn',
};

const TONE_FG: Record<Tone, string> = {
  success: 'var(--intent-success-fg)',
  info:    'var(--intent-info-fg)',
  warn:    'var(--intent-warn-fg)',
};

const TONE_BG: Record<Tone, string> = {
  success: 'var(--intent-success-bg)',
  info:    'var(--intent-info-bg)',
  warn:    'var(--intent-warn-bg)',
};

export function IncidentCard({ incident }: { incident: Incident }) {
  const [open, setOpen] = useState(incident.status !== 'resolved');
  const tone = INCIDENT_TONE[incident.status];
  const fg = TONE_FG[tone];
  const bg = TONE_BG[tone];

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}
    >
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); }}
        className="w-full flex items-center gap-3 px-5 py-4 text-left transition-colors"
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <span
          className="inline-flex items-center gap-1 h-6 px-2 rounded-full text-xs uppercase tracking-eyebrow font-semibold shrink-0"
          style={{
            background: bg,
            color: fg,
            border: `1px solid color-mix(in srgb, ${fg} 35%, transparent)`,
          }}
        >
          {incident.status === 'monitoring' && <PulseDot status="degraded" />}
          {incident.status}
        </span>
        <div className="flex flex-col flex-1 min-w-0 gap-0.5">
          <span className="text-lg font-semibold truncate" style={{ color: 'var(--fg-strong)' }}>{incident.title}</span>
          <span className="text-sm" style={{ color: 'var(--fg-subtle)' }}>
            <span className="font-mono">{incident.startedAt}</span>
            {incident.resolvedAt && <> → <span className="font-mono">{incident.resolvedAt}</span></>}
            {' · '}Affected: {incident.affected.join(' · ')}
          </span>
        </div>
        <ChevronDown
          className="w-4 h-4 transition-transform shrink-0"
          style={{
            color: 'var(--fg-muted)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>
      {open && (
        <div className="relative px-5 pb-5 pt-1 pl-12">
          <div
            aria-hidden
            className="absolute top-2 bottom-6 w-px"
            style={{ left: 24, background: 'var(--border-muted)' }}
          />
          <div className="flex flex-col gap-4">
            {incident.updates.map((u, i) => (
              <div key={i} className="relative">
                <div
                  aria-hidden
                  className="absolute -left-[16px] top-1.5 w-2.5 h-2.5 rounded-full"
                  style={{
                    background: i === 0 ? fg : 'var(--bg-canvas)',
                    border: `2px solid ${i === 0 ? fg : 'var(--border-default)'}`,
                  }}
                />
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs uppercase tracking-eyebrow font-semibold" style={{ color: i === 0 ? fg : 'var(--fg-muted)' }}>
                    {u.status}
                  </span>
                  <span className="font-mono text-xs" style={{ color: 'var(--fg-subtle)' }}>{u.at}</span>
                </div>
                <p className="text-base leading-relaxed" style={{ color: 'var(--fg-default)' }}>{u.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
