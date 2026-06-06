import {
  ShieldCheck, RefreshCw, AlertCircle, Check, X,
} from 'lucide-react';
import { Section } from '@shared/ui/forms';
import { HISTORY, type LogEvent } from './types';

export function HistorySection() {
  return (
    <Section
      title="Sign-in history"
      hint="The last 90 days of authentication events on your account. Failed attempts and unusual locations are highlighted."
    >
      <div className="flex flex-col">
        {HISTORY.map((h, i) => <HistoryRow key={h.id} event={h} top={i === 0} />)}
      </div>
    </Section>
  );
}

function HistoryRow({ event, top }: { event: LogEvent; top: boolean }) {
  const meta = (() => {
    switch (event.type) {
      case 'success': return { icon: Check,        fg: 'var(--intent-success-fg)' };
      case 'fail':    return { icon: AlertCircle,  fg: 'var(--intent-danger-fg)'  };
      case 'mfa':     return { icon: ShieldCheck,  fg: 'var(--fg-accent)'          };
      case 'reset':   return { icon: RefreshCw,    fg: 'var(--intent-warn-fg)'    };
      case 'logout':  return { icon: X,            fg: 'var(--fg-subtle)'         };
    }
  })();
  const Icon = meta.icon;
  return (
    <div
      className="grid grid-cols-[16px_1fr_140px_120px] items-center gap-3 px-2 py-2.5 text-[11px]"
      style={{ borderTop: top ? 'none' : '1px solid var(--border-muted)' }}
    >
      <Icon className="w-3.5 h-3.5" style={{ color: meta.fg }} />
      <span style={{ color: 'var(--fg-default)' }}>{event.detail}</span>
      <span className="font-mono tabular-nums" style={{ color: 'var(--fg-muted)' }}>{event.at}</span>
      <span className="font-mono tabular-nums" style={{ color: 'var(--fg-subtle)' }}>
        {event.ip} · {event.location}
      </span>
    </div>
  );
}
