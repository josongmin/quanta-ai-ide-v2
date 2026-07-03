import { useState } from 'react';
import { Monitor, Globe, MapPin, X } from 'lucide-react';
import { Section, Button } from '@shared/ui/forms';
import { SESSIONS, type Session } from './types';

export function SessionsSection() {
  const [sessions, setSessions] = useState(SESSIONS);
  const revoke = (id: string) => {
    setSessions((s) => s.filter((x) => x.id !== id));
  };

  return (
    <Section
      title="Active sessions"
      hint={`${sessions.length} sessions across your devices. Revoke any you don't recognize.`}
    >
      <div
        className="flex flex-col rounded-md overflow-hidden"
        style={{ border: '1px solid var(--border-muted)' }}
      >
        {sessions.map((s, i) => (
          <SessionRow
            key={s.id}
            session={s}
            top={i === 0}
            onRevoke={s.current ? null : () => { revoke(s.id); }}
          />
        ))}
      </div>
    </Section>
  );
}

function SessionRow({
  session, top, onRevoke,
}: { session: Session; top: boolean; onRevoke: (() => void) | null }) {
  return (
    <div
      className="flex items-start gap-3 px-3 py-3"
      style={{
        background: 'var(--bg-canvas)',
        borderTop: top ? 'none' : '1px solid var(--border-muted)',
      }}
    >
      <span
        className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
        style={{
          background: session.current ? 'color-mix(in srgb, var(--fg-accent) 14%, transparent)' : 'var(--bg-surface-muted)',
          border: `1px solid ${session.current ? 'var(--fg-accent)' : 'var(--border-muted)'}`,
        }}
      >
        <Monitor className="w-4 h-4" style={{ color: session.current ? 'var(--fg-accent)' : 'var(--fg-muted)' }} />
      </span>
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold" style={{ color: 'var(--fg-strong)' }}>
            {session.device}
          </span>
          {session.current && (
            <span
              className="text-2xs uppercase tracking-eyebrow font-semibold px-1.5 py-0.5 rounded"
              style={{ color: 'var(--fg-accent)', border: '1px solid var(--fg-accent)', background: 'color-mix(in srgb, var(--fg-accent) 14%, transparent)' }}
            >
              This device
            </span>
          )}
        </div>
        <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>
          {session.browser} · {session.os}
        </span>
        <div className="flex items-center gap-3 text-xs mt-0.5" style={{ color: 'var(--fg-subtle)' }}>
          <span className="inline-flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{session.location}</span>
          <span className="inline-flex items-center gap-0.5 font-mono"><Globe className="w-2.5 h-2.5" />{session.ip}</span>
          <span>· {session.lastSeen}</span>
        </div>
      </div>
      {onRevoke && (
        <Button variant="ghost" onClick={onRevoke}>
          <X className="w-3 h-3" /> Revoke
        </Button>
      )}
    </div>
  );
}
