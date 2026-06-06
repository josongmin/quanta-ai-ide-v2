import { useState } from 'react';
import { MessageCircle, BookOpen, Mail, Inbox, Search } from 'lucide-react';
import { PublicShell , Eyebrow, HeadlineGradient, SeamDivider } from '@shared/ui/marketing';
import type { Priority } from './parts/support/types';
import { ChannelCard } from './parts/support/ChannelCard';
import { ComposeForm } from './parts/support/ComposeForm';
import { TicketsAside } from './parts/support/TicketsAside';

export default function SupportPage() {
  const [priority, setPriority] = useState<Priority>('normal');

  return (
    <PublicShell width="bleed">
      <div className="max-w-[1080px] mx-auto px-8 pt-12 pb-24">
        <div className="flex flex-col items-center text-center gap-4 mb-10">
          <Eyebrow tone="info"><Inbox className="w-3 h-3" /> Support</Eyebrow>
          <HeadlineGradient accent="get unstuck">We&apos;re here to help</HeadlineGradient>
          <p className="text-[14.5px] leading-relaxed max-w-[600px]" style={{ color: 'var(--fg-muted)' }}>
            Search first, then talk to us. Median response time: 38 minutes. Urgent paid tickets are paged 24/7.
          </p>

          {/* Search */}
          <div
            className="mt-2 flex items-center gap-2 h-12 w-full max-w-[600px] px-4 rounded-full"
            style={{
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border-default)',
              boxShadow: '0 4px 20px -8px color-mix(in srgb, var(--fg-strong) 18%, transparent)',
            }}
          >
            <Search className="w-4 h-4" style={{ color: 'var(--fg-subtle)' }} />
            <input
              placeholder="Search help articles, error codes, SDK references…"
              className="flex-1 bg-transparent outline-none text-[13.5px]"
              style={{ color: 'var(--fg-strong)' }}
            />
            <span className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>1,284 articles</span>
          </div>
        </div>

        {/* Channels */}
        <div className="grid grid-cols-3 gap-3 mb-12">
          <ChannelCard
            icon={BookOpen}
            title="Help center"
            blurb="Searchable articles and guides."
            cta="Browse"
            href="/help"
            tone={{ from: 'var(--fg-accent)', to: 'var(--fg-link)' }}
          />
          <ChannelCard
            icon={MessageCircle}
            title="Live chat"
            blurb="Mon–Fri 8a–8p UTC. Paid plans."
            cta="Start chat"
            tone={{ from: 'var(--intent-success-fg)', to: 'var(--intent-info-fg)' }}
            badge="Online · 38 min avg"
          />
          <ChannelCard
            icon={Mail}
            title="Email"
            blurb="support@acme.dev · 24 hr SLA"
            cta="Compose"
            tone={{ from: 'var(--intent-info-fg)', to: 'var(--fg-accent)' }}
          />
        </div>

        <SeamDivider />

        {/* Ticket + Compose grid */}
        <div className="grid grid-cols-3 gap-6 mt-12">
          <ComposeForm priority={priority} onPriorityChange={setPriority} />
          <TicketsAside />
        </div>
      </div>
    </PublicShell>
  );
}
