import { useState } from 'react';
import {
  MessageCircle, BookOpen, Mail, Inbox, Search, Send, Paperclip,
  CheckCircle2, Clock, AlertTriangle, ChevronRight,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { PublicShell , Eyebrow, HeadlineGradient, SectionHead, SeamDivider } from '@shared/ui/marketing';

type TicketStatus = 'open' | 'waiting' | 'resolved';

const TICKETS: { id: string; subject: string; status: TicketStatus; updatedAt: string; lastReply: string }[] = [
  { id: 'T-4821', subject: 'Webhook returning 502 from EU region',     status: 'open',     updatedAt: '12 min ago', lastReply: 'support' },
  { id: 'T-4818', subject: 'SCIM provisioning loop with Okta',         status: 'waiting',  updatedAt: '2 hr ago',   lastReply: 'you' },
  { id: 'T-4801', subject: 'Trial usage shown higher than billing',   status: 'resolved', updatedAt: 'Yesterday',  lastReply: 'support' },
];

const STATUS_META: Record<TicketStatus, { label: string; fg: string; bg: string; icon: React.ComponentType<{ className?: string }> }> = {
  open:     { label: 'Open',     fg: 'var(--brand-fg)',           bg: 'var(--brand-bg)',           icon: MessageCircle },
  waiting:  { label: 'Waiting',  fg: 'var(--intent-warn-fg)',     bg: 'var(--intent-warn-bg)',     icon: Clock },
  resolved: { label: 'Resolved', fg: 'var(--intent-success-fg)',  bg: 'var(--intent-success-bg)',  icon: CheckCircle2 },
};

export default function SupportPage() {
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');

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
            tone={{ from: 'var(--brand-vivid)', to: 'var(--fg-link)' }}
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
            tone={{ from: 'var(--intent-info-fg)', to: 'var(--brand-vivid)' }}
          />
        </div>

        <SeamDivider />

        {/* Ticket + Compose grid */}
        <div className="grid grid-cols-3 gap-6 mt-12">
          {/* Compose */}
          <div className="col-span-2">
            <SectionHead eyebrow="New ticket" title="Tell us what's going on" align="left" />
            <div
              className="rounded-xl p-6 flex flex-col gap-5"
              style={{
                background: 'var(--bg-canvas)',
                border: '1px solid var(--border-default)',
              }}
            >
              <Field label="Subject">
                <input
                  placeholder="Short description"
                  className="w-full bg-transparent outline-none text-[12px] h-9 px-3 rounded-md"
                  style={{
                    background: 'var(--bg-surface-muted)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--fg-strong)',
                  }}
                />
              </Field>

              <Field label="Category">
                <select
                  className="w-full bg-transparent outline-none text-[12px] h-9 px-3 rounded-md"
                  style={{
                    background: 'var(--bg-surface-muted)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--fg-strong)',
                  }}
                >
                  <option>Admission rules</option>
                  <option>Agents</option>
                  <option>Authentication / SSO</option>
                  <option>Billing</option>
                  <option>Webhooks</option>
                  <option>Other</option>
                </select>
              </Field>

              <Field label="Priority" hint="Urgent paged 24/7 (Business+)">
                <div className="grid grid-cols-4 gap-1.5">
                  {(['low', 'normal', 'high', 'urgent'] as const).map((p) => {
                    const active = priority === p;
                    const tone =
                      p === 'urgent' ? 'var(--intent-danger-fg)' :
                      p === 'high'   ? 'var(--intent-warn-fg)'   :
                      p === 'normal' ? 'var(--fg-default)'       :
                      'var(--fg-muted)';
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => { setPriority(p); }}
                        className="h-8 rounded-md text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors"
                        style={{
                          color: active ? tone : 'var(--fg-muted)',
                          background: active
                            ? `color-mix(in srgb, ${tone} 14%, transparent)`
                            : 'transparent',
                          border: `1px solid ${active ? `color-mix(in srgb, ${tone} 40%, transparent)` : 'var(--border-default)'}`,
                        }}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <Field label="Describe the issue" hint="Reproduction steps help.">
                <textarea
                  rows={6}
                  placeholder="What did you do? What did you expect? What happened?"
                  className="w-full bg-transparent outline-none text-[12px] p-3 rounded-md resize-y"
                  style={{
                    background: 'var(--bg-surface-muted)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--fg-strong)',
                  }}
                />
              </Field>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-[11px] font-medium transition-colors"
                  style={{
                    background: 'var(--bg-surface-muted)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--fg-default)',
                  }}
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  Attach files
                </button>
                <span className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
                  Max 25MB · logs, screenshots, HAR
                </span>
                <button
                  type="button"
                  className="ml-auto inline-flex items-center gap-1.5 h-9 px-5 rounded-md text-[12px] font-semibold transition-colors"
                  style={{ background: 'var(--brand-vivid)', color: '#fff' }}
                >
                  <Send className="w-3.5 h-3.5" />
                  Send
                </button>
              </div>
            </div>
          </div>

          {/* Your tickets */}
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
        </div>
      </div>
    </PublicShell>
  );
}

function Field({
  label, hint, children,
}: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span
        className="text-[10px] uppercase tracking-[0.14em] font-medium flex items-center justify-between"
        style={{ color: 'var(--fg-subtle)' }}
      >
        <span>{label}</span>
        {hint && <span className="lowercase tracking-normal">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function ChannelCard({
  icon: Icon, title, blurb, cta, href, tone, badge,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  blurb: string;
  cta: string;
  href?: string;
  tone: { from: string; to: string };
  badge?: string;
}) {
  // Shared props for either branch — split because TanStack's Link
  // requires `to` while plain <div> doesn't accept it.
  const commonClassName = 'rounded-xl p-5 flex flex-col gap-3 transition-all';
  const commonStyle: React.CSSProperties = {
    background: 'var(--bg-canvas)',
    border: '1px solid var(--border-default)',
  };
  const onEnter = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.transform = 'translateY(-2px)';
    e.currentTarget.style.boxShadow = '0 12px 30px -12px color-mix(in srgb, var(--brand-vivid) 22%, transparent)';
  };
  const onLeave = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = 'none';
  };
  const inner = (
    <>
      <div className="flex items-start justify-between">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-white"
          style={{ backgroundImage: `linear-gradient(135deg, ${tone.from}, ${tone.to})` }}
        >
          <Icon className="w-5 h-5" />
        </div>
        {badge && (
          <span
            className="inline-flex items-center gap-1.5 px-2 h-6 rounded-full text-[10px] font-semibold"
            style={{ color: 'var(--intent-success-fg)', background: 'var(--intent-success-bg)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--intent-success-fg)' }} />
            {badge}
          </span>
        )}
      </div>
      <h3 className="text-[14px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>{title}</h3>
      <p className="text-[12px] leading-snug" style={{ color: 'var(--fg-muted)' }}>{blurb}</p>
      <span
        className="text-[11px] font-semibold mt-1 inline-flex items-center gap-1"
        style={{ color: 'var(--fg-link)' }}
      >
        {cta} <ChevronRight className="w-3 h-3" />
      </span>
    </>
  );
  if (href) {
    return (
      <Link
        to={href as never}
        className={commonClassName}
        style={commonStyle}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
      >
        {inner}
      </Link>
    );
  }
  return (
    <div
      className={commonClassName}
      style={commonStyle}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {inner}
    </div>
  );
}
