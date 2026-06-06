import { Link } from '@tanstack/react-router';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { SectionHead } from '@shared/ui/marketing';
import { STATUS_META, TICKETS } from './types';

export function TicketsAside() {
  return (
    <aside>
      <SectionHead eyebrow="Your tickets" title="Recent" align="left" />
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: 'var(--bg-canvas)',
          border: '1px solid var(--border-default)',
        }}
      >
        {TICKETS.map((t, i) => {
          const m = STATUS_META[t.status];
          return (
            <Link
              key={t.id}
              to={'/support' as never}
              className="flex items-center gap-3 p-3 transition-colors"
              style={{
                borderBottom: i === TICKETS.length - 1 ? 'none' : '1px solid var(--border-muted)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <div
                className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
                style={{ background: m.bg, color: m.fg }}
              >
                <m.icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[12px] font-semibold truncate" style={{ color: 'var(--fg-strong)' }}>
                  {t.subject}
                </span>
                <div className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
                  <code className="font-mono">{t.id}</code>
                  <span>·</span>
                  <span>{t.updatedAt}</span>
                  <span>·</span>
                  <span>{t.lastReply === 'you' ? 'awaiting reply from us' : 'replied'}</span>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--fg-subtle)' }} />
            </Link>
          );
        })}
      </div>

      <div
        className="mt-4 rounded-xl p-4 flex items-start gap-3"
        style={{
          background: 'color-mix(in srgb, var(--intent-warn-fg) 10%, transparent)',
          border: '1px solid color-mix(in srgb, var(--intent-warn-fg) 35%, transparent)',
        }}
      >
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--intent-warn-fg)' }} />
        <div className="text-[11px]" style={{ color: 'var(--fg-default)' }}>
          Production outage? Check <Link to={'/status' as never} className="font-semibold" style={{ color: 'var(--fg-link)' }}>status.acme.dev</Link> first, then page urgent.
        </div>
      </div>
    </aside>
  );
}
