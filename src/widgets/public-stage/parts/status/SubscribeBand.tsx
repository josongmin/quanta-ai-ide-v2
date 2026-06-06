import { useState } from 'react';
import { Mail, Rss, Activity } from 'lucide-react';
import { Eyebrow } from '@shared/ui/marketing';

export function SubscribeBand() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  return (
    <div
      className="relative overflow-hidden rounded-2xl px-8 py-10 grid gap-6"
      style={{
        background:
          'radial-gradient(ellipse 70% 100% at 100% 0%, color-mix(in srgb, var(--fg-accent) 18%, transparent), transparent 70%), var(--bg-canvas)',
        border: '1px solid var(--border-default)',
        gridTemplateColumns: '1fr 360px',
      }}
    >
      <div className="flex flex-col gap-3 min-w-0">
        <Eyebrow tone="info"><Activity className="w-2.5 h-2.5" /> Subscribe</Eyebrow>
        <h3 className="text-[22px] sm:text-[26px] font-semibold tracking-[-0.018em]" style={{ color: 'var(--fg-strong)' }}>
          Get notified when something breaks.
        </h3>
        <p className="text-[12px] leading-relaxed max-w-[480px]" style={{ color: 'var(--fg-muted)' }}>
          One email per incident, when it opens and again when it resolves. No marketing.
          Webhook + RSS available for status-page-aggregators.
        </p>
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); setDone(true); }}
        className="flex flex-col gap-2 self-end"
      >
        <div
          className="flex items-center h-11 rounded-md"
          style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}
        >
          <Mail className="w-3.5 h-3.5 mx-3 shrink-0" style={{ color: 'var(--fg-subtle)' }} />
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setDone(false); }}
            placeholder="oncall@team.com"
            required
            className="flex-1 bg-transparent outline-none text-[12px] pr-3"
            style={{ color: 'var(--fg-strong)' }}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-md text-[12px] font-semibold"
            style={{ background: 'var(--fg-strong)', color: 'var(--bg-canvas)' }}
          >
            {done ? 'Subscribed ✓' : 'Subscribe'}
          </button>
          <a
            href="/status.rss"
            className="inline-flex items-center justify-center w-10 h-10 rounded-md"
            style={{
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border-default)',
              color: 'var(--fg-muted)',
            }}
            aria-label="RSS feed"
          >
            <Rss className="w-3.5 h-3.5" />
          </a>
        </div>
      </form>
    </div>
  );
}
