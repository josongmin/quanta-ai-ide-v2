import { useRef, useState } from 'react';
import {
  MessageSquare, Lightbulb, Bug, ThumbsUp, Send, ChevronUp,
} from 'lucide-react';
import { useHoverStyle } from '@shared/lib';
import { PublicShell , Eyebrow, HeadlineGradient } from '@shared/ui/marketing';

type Kind = 'idea' | 'bug' | 'praise';

const KIND_META: Record<Kind, { label: string; icon: React.ComponentType<{ className?: string }>; tone: string; bg: string }> = {
  idea:   { label: 'Idea',    icon: Lightbulb, tone: 'var(--intent-warn-fg)',    bg: 'var(--intent-warn-bg)' },
  bug:    { label: 'Bug',     icon: Bug,       tone: 'var(--intent-danger-fg)',  bg: 'var(--intent-danger-bg)' },
  praise: { label: 'Praise',  icon: ThumbsUp,  tone: 'var(--intent-success-fg)', bg: 'var(--intent-success-bg)' },
};

const POSTS = [
  { kind: 'idea' as Kind,   title: 'Surface CI-pipeline durations in the agent activity panel', votes: 84, status: 'Planned',     author: 'm.kim',   when: '3 days ago' },
  { kind: 'idea' as Kind,   title: 'Per-environment admission rule overrides',                  votes: 62, status: 'Under review', author: 'r.osada', when: '5 days ago' },
  { kind: 'bug' as Kind,    title: 'Webhook signature drift under leap-second',                 votes: 41, status: 'In progress',  author: 'a.silva', when: 'last week' },
  { kind: 'idea' as Kind,   title: 'Bulk export of audit log to S3',                            votes: 38, status: 'Planned',     author: 'p.chen',  when: '2 weeks ago' },
  { kind: 'praise' as Kind, title: 'The keyboard-first command palette is gorgeous',            votes: 22, status: '',             author: 's.kim',   when: '3 weeks ago' },
];

export default function FeedbackPage() {
  const [kind, setKind] = useState<Kind>('idea');

  return (
    <PublicShell width="bleed">
      <div className="max-w-[1080px] mx-auto px-8 pt-12 pb-24">
        <div className="flex flex-col items-center text-center gap-4 mb-10">
          <Eyebrow tone="brand"><MessageSquare className="w-3 h-3" /> Feedback</Eyebrow>
          <HeadlineGradient accent="the roadmap">Vote on</HeadlineGradient>
          <p className="text-lg leading-relaxed max-w-[600px]" style={{ color: 'var(--fg-muted)' }}>
            What should we build next? File ideas, upvote others, watch them ship.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-8">
          {/* Compose */}
          <div className="col-span-1">
            <div
              className="rounded-xl p-5 flex flex-col gap-4 sticky top-24"
              style={{
                background: 'var(--bg-canvas)',
                border: '1px solid var(--border-default)',
              }}
            >
              <h2 className="text-base font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
                Post a new idea
              </h2>

              <div className="grid grid-cols-3 gap-1.5">
                {(['idea', 'bug', 'praise'] as Kind[]).map((k) => {
                  const m = KIND_META[k];
                  const active = kind === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => { setKind(k); }}
                      className="inline-flex items-center justify-center gap-1.5 h-8 rounded-md text-sm font-semibold transition-colors"
                      style={{
                        color: active ? m.tone : 'var(--fg-muted)',
                        background: active ? m.bg : 'transparent',
                        border: `1px solid ${active ? `color-mix(in srgb, ${m.tone} 40%, transparent)` : 'var(--border-default)'}`,
                      }}
                    >
                      <m.icon className="w-3 h-3" />
                      {m.label}
                    </button>
                  );
                })}
              </div>

              <input
                aria-label="Summary"
                placeholder="One-line summary"
                className="w-full bg-transparent outline-none text-base h-9 px-3 rounded-md focus-visible:ring-2 focus-visible:ring-[var(--fg-accent)]"
                style={{
                  background: 'var(--bg-surface-muted)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--fg-strong)',
                }}
              />
              <textarea
                rows={5}
                aria-label="Details"
                placeholder="Details… what problem does this solve?"
                className="w-full bg-transparent outline-none text-base p-3 rounded-md resize-y focus-visible:ring-2 focus-visible:ring-[var(--fg-accent)]"
                style={{
                  background: 'var(--bg-surface-muted)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--fg-strong)',
                }}
              />
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 h-9 rounded-md text-base font-semibold transition-colors"
                style={{ background: 'var(--fg-strong)', color: 'var(--bg-canvas)' }}
              >
                <Send className="w-3.5 h-3.5" />
                Post
              </button>
            </div>
          </div>

          {/* Feed */}
          <div className="col-span-2 flex flex-col gap-2">
            <div className="flex items-baseline justify-between mb-2">
              <h2 className="text-base font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
                Trending this month
              </h2>
              <span className="text-sm" style={{ color: 'var(--fg-subtle)' }}>5 posts</span>
            </div>
            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: 'var(--bg-canvas)',
                border: '1px solid var(--border-default)',
              }}
            >
              {POSTS.map((p, i) => {
                const m = KIND_META[p.kind];
                return (
                  <FeedRow
                    key={i}
                    post={p}
                    icon={m.icon}
                    tone={m.tone}
                    bg={m.bg}
                    last={i === POSTS.length - 1}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </PublicShell>
  );
}

function FeedRow({
  post, icon: Icon, tone, bg, last,
}: {
  post: { kind: Kind; title: string; votes: number; status: string; author: string; when: string };
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  bg: string;
  last: boolean;
}) {
  const [v, setV] = useState(post.votes);
  const [voted, setVoted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useHoverStyle(ref, { background: 'var(--bg-hover)' }, { background: 'transparent' });
  return (
    <div
      ref={ref}
      className="flex items-center gap-4 p-4 transition-colors"
      style={{
        borderBottom: last ? 'none' : '1px solid var(--border-muted)',
      }}
    >
      <button
        type="button"
        onClick={() => { setV((x) => x + (voted ? -1 : 1)); setVoted((x) => !x); }}
        className="flex flex-col items-center justify-center w-12 h-12 rounded-md transition-colors shrink-0"
        style={{
          background: voted ? bg : 'var(--bg-surface-muted)',
          color: voted ? tone : 'var(--fg-muted)',
          border: `1px solid ${voted ? `color-mix(in srgb, ${tone} 40%, transparent)` : 'var(--border-default)'}`,
        }}
      >
        <ChevronUp className="w-3.5 h-3.5" />
        <span className="text-sm font-bold tabular-nums leading-none">{v}</span>
      </button>
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1 px-1.5 h-5 rounded text-2xs font-bold uppercase tracking-eyebrow"
            style={{ color: tone, background: bg }}
          >
            <Icon className="w-2.5 h-2.5" />
            {post.kind}
          </span>
          {post.status && (
            <span
              className="text-2xs uppercase tracking-eyebrow font-semibold"
              style={{ color: 'var(--fg-subtle)' }}
            >
              · {post.status}
            </span>
          )}
        </div>
        <span className="text-base font-medium" style={{ color: 'var(--fg-strong)' }}>{post.title}</span>
        <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>
          {post.author} · {post.when}
        </span>
      </div>
    </div>
  );
}
