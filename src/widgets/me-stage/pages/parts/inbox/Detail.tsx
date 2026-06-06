import { Clock, Check, ExternalLink, X, Archive } from 'lucide-react';
import { Button } from '@shared/ui/forms';
import { ITEM_ICONS, tintFor, type Item } from './types';

export function Detail({
  item, onArchive, onSnooze,
}: { item: Item; onArchive: () => void; onSnooze: () => void }) {
  const Icon = ITEM_ICONS[item.type];
  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center justify-between gap-3 px-4 py-3"
        style={{ borderBottom: '1px solid var(--border-muted)' }}
      >
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: tintFor(item.type) }} />
          <span className="text-[10px] uppercase tracking-[0.14em] font-semibold"
            style={{ color: 'var(--fg-muted)' }}>
            {item.type}
          </span>
          {item.meta?.map((m, i) => (
            <span
              key={i}
              className="text-[9px] uppercase tracking-[0.14em] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap"
              style={{
                background:
                  m.tone === 'success' ? 'var(--intent-success-bg)'
                  : m.tone === 'warn' ? 'var(--intent-warn-bg)'
                  : m.tone === 'danger' ? 'var(--intent-danger-bg)'
                  : 'var(--bg-surface-muted)',
                color:
                  m.tone === 'success' ? 'var(--intent-success-fg)'
                  : m.tone === 'warn' ? 'var(--intent-warn-fg)'
                  : m.tone === 'danger' ? 'var(--intent-danger-fg)'
                  : 'var(--fg-muted)',
                border: `1px solid ${
                  m.tone === 'success' ? 'var(--intent-success-fg)'
                  : m.tone === 'warn' ? 'var(--intent-warn-fg)'
                  : m.tone === 'danger' ? 'var(--intent-danger-fg)'
                  : 'var(--border-muted)'
                }`,
              }}
            >
              {m.label}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button leading={<Clock className="w-3 h-3" />} onClick={onSnooze}>Snooze</Button>
          <Button leading={<Archive className="w-3 h-3" />} onClick={onArchive}>Archive</Button>
          <Button variant="primary" leading={<ExternalLink className="w-3 h-3" />}>
            <span className="whitespace-nowrap">Open in {item.where}</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-4">
        <h2 className="text-[16px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
          {item.title}
        </h2>
        <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--fg-subtle)' }}>
          <span>From <span style={{ color: 'var(--fg-default)' }}>{item.who}</span></span>
          <span>·</span>
          <span>In <span style={{ color: 'var(--fg-default)' }}>{item.where}</span></span>
          <span>·</span>
          <span className="font-mono">{item.at}</span>
        </div>

        <div
          className="px-4 py-3 rounded-md text-[12px] leading-relaxed"
          style={{
            background: 'var(--bg-surface-muted)',
            border: '1px solid var(--border-muted)',
            color: 'var(--fg-default)',
          }}
        >
          {item.preview}
        </div>

        <ContextSnippet item={item} />

        <div className="flex flex-col gap-1.5 mt-2">
          <span className="text-[10px] uppercase tracking-[0.14em] font-semibold" style={{ color: 'var(--fg-subtle)' }}>
            Quick reply
          </span>
          <textarea
            placeholder="Type a reply or command (Cmd+Enter to send)…"
            rows={3}
            className="rounded-md p-2.5 text-[12px] outline-none resize-none"
            style={{
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border-default)',
              color: 'var(--fg-strong)',
              fontFamily: 'inherit',
            }}
          />
          <div className="flex items-center justify-end">
            <Button variant="primary" size="md">Send reply</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContextSnippet({ item }: { item: Item }) {
  if (item.type === 'review' || item.type === 'fix') {
    return (
      <div
        className="rounded-md overflow-hidden"
        style={{ border: '1px solid var(--border-muted)' }}
      >
        <div
          className="px-2.5 py-1.5 text-[10px] uppercase tracking-[0.14em] font-semibold"
          style={{
            background: 'var(--bg-surface-muted)',
            color: 'var(--fg-subtle)',
            borderBottom: '1px solid var(--border-muted)',
          }}
        >
          Diff context
        </div>
        <pre
          className="p-2.5 text-[11px] font-mono"
          style={{ background: 'var(--bg-canvas)', color: 'var(--fg-default)', margin: 0 }}
        >
          <code>
            <span style={{ color: 'var(--intent-success-fg)' }}>+ require_sso: true</span>{'\n'}
            <span style={{ color: 'var(--intent-danger-fg)' }}>- require_sso: false</span>{'\n'}
            <span>  branches:</span>{'\n'}
            <span>    - main</span>{'\n'}
            <span>    - release/*</span>
          </code>
        </pre>
      </div>
    );
  }
  if (item.type === 'admission') {
    return (
      <ul
        className="flex flex-col gap-1 px-3 py-2.5 rounded-md"
        style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-muted)' }}
      >
        {[
          { label: 'no-secret-in-diff', pass: false },
          { label: 'tests-pass',         pass: true  },
          { label: 'review-approval-2',  pass: true  },
          { label: 'no-prod-config',     pass: false },
        ].map((o) => (
          <li key={o.label} className="flex items-center gap-2 text-[11px] font-mono"
            style={{ color: o.pass ? 'var(--intent-success-fg)' : 'var(--intent-danger-fg)' }}>
            {o.pass ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
            {o.label}
          </li>
        ))}
      </ul>
    );
  }
  return null;
}
