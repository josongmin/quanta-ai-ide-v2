import {
  Check, GitCommit, GitMerge, MessageSquare, UserPlus, X, type LucideIcon,
} from 'lucide-react';
import type { ConversationItem, ReviewVerdict } from '@entities/pr';
import { formatTimestamp as formatTs } from '@shared/lib';
import Avatar from './Avatar';

type Props = {
  items: ConversationItem[];
};

type EventKind = Extract<ConversationItem, { kind: 'event' }>['eventType'];

const EVENT_ICON: Record<EventKind, LucideIcon> = {
  commit: GitCommit,
  'review-requested': UserPlus,
  'status-change': MessageSquare,
  merged: GitMerge,
  closed: X,
};

const VERDICT_LABEL: Record<ReviewVerdict, string> = {
  approve: 'Approved',
  comment: 'Comment',
  'request-changes': 'Requested changes',
};

const VERDICT_COLOR: Record<ReviewVerdict, string> = {
  approve: '#5fa86c',
  comment: '#8b949e',
  'request-changes': '#c25a55',
};

const VERDICT_ICON: Record<ReviewVerdict, LucideIcon> = {
  approve: Check,
  comment: MessageSquare,
  'request-changes': X,
};

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return formatTs(d);
}

/** Vertical timeline of PR-level conversation. Three shapes:
    events get a one-liner, comments get a bubble, reviews get a verdict pill. */
export default function ConversationLog({ items }: Props) {
  const muted = 'text-[color:var(--fg-subtle)]';
  const fg = 'text-[color:var(--fg-strong)]';
  const bubbleBg = 'bg-[color:var(--bg-hover)]';
  const border = 'border-[color:var(--border-default)]';

  if (items.length === 0) {
    return (
      <div className={`px-2 py-3 text-[11px] font-mono ${muted}`}>
        No conversation yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => {
        if (item.kind === 'event') {
          const Icon = EVENT_ICON[item.eventType];
          return (
            <div key={item.id} className={`flex items-center gap-1.5 text-[11px] ${muted}`}>
              <Icon className="w-3 h-3 shrink-0" />
              <span className={`font-bold ${fg}`}>@{item.actorLogin}</span>
              <span className="font-mono truncate">{item.detail}</span>
              <span className="ml-auto text-[9px] tabular-nums shrink-0">
                {formatTimestamp(item.createdAt)}
              </span>
            </div>
          );
        }
        if (item.kind === 'comment') {
          return (
            <div key={item.id} className="flex items-start gap-1.5">
              <Avatar login={item.authorLogin} size={22} />
              <div className={`flex-1 min-w-0 rounded-md px-2 py-1 ${bubbleBg}`}>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-[11px] font-bold ${fg}`}>@{item.authorLogin}</span>
                  <span className={`text-[9px] tabular-nums ${muted}`}>
                    {formatTimestamp(item.createdAt)}
                  </span>
                </div>
                <div className={`text-[11px] font-mono whitespace-pre-wrap break-words ${fg}`}>
                  {item.body}
                </div>
              </div>
            </div>
          );
        }
        // 'review'
        const VIcon = VERDICT_ICON[item.verdict];
        const color = VERDICT_COLOR[item.verdict];
        return (
          <div key={item.id} className="flex items-start gap-1.5">
            <Avatar login={item.authorLogin} size={22} />
            <div className={`flex-1 min-w-0 rounded-md px-2 py-1 border ${border}`}>
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className={`text-[11px] font-bold ${fg}`}>@{item.authorLogin}</span>
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                  style={{ background: `${color}26`, color }}
                >
                  <VIcon className="w-2.5 h-2.5" />
                  {VERDICT_LABEL[item.verdict]}
                </span>
                <span className={`text-[9px] tabular-nums ${muted}`}>
                  {formatTimestamp(item.createdAt)}
                </span>
              </div>
              {item.body.length > 0 && (
                <div className={`mt-1 text-[11px] font-mono whitespace-pre-wrap break-words ${fg}`}>
                  {item.body}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
