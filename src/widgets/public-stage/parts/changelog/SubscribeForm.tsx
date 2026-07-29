import { useState } from 'react';
import { Mail, Rss, ArrowRight, Check } from 'lucide-react';

export function SubscribeForm() {
  const [subscribed, setSubscribed] = useState(false);
  const [email, setEmail] = useState('');

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); setSubscribed(true); }}
      className="flex items-center gap-2 mt-3"
    >
      <div
        className="flex items-center h-10 rounded-md w-[300px]"
        style={{
          background: 'var(--bg-canvas)',
          border: '1px solid var(--border-default)',
          boxShadow: '0 1px 2px color-mix(in srgb, var(--fg-strong) 6%, transparent)',
        }}
      >
        <Mail className="w-3.5 h-3.5 mx-3 shrink-0" style={{ color: 'var(--fg-subtle)' }} />
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setSubscribed(false); }}
          required
          aria-label="Email"
          placeholder="you@company.com"
          className="flex-1 bg-transparent outline-none text-base pr-3"
          style={{ color: 'var(--fg-strong)' }}
        />
      </div>
      <button
        type="submit"
        className="inline-flex items-center gap-1.5 h-10 px-4 rounded-md text-base font-semibold transition-transform"
        style={{ background: 'var(--fg-strong)', color: 'var(--bg-canvas)' }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
      >
        {subscribed ? <><Check className="w-3.5 h-3.5" /> Subscribed</> : <>Subscribe <ArrowRight className="w-3.5 h-3.5" /></>}
      </button>
      <a
        href="/changelog.rss"
        className="inline-flex items-center justify-center w-10 h-10 rounded-md transition-colors"
        style={{
          background: 'var(--bg-canvas)',
          border: '1px solid var(--border-default)',
          color: 'var(--fg-muted)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-canvas)'; }}
        aria-label="RSS feed"
      >
        <Rss className="w-3.5 h-3.5" />
      </a>
    </form>
  );
}
