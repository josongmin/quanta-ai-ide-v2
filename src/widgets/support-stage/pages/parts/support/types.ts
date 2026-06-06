import { MessageCircle, Clock, CheckCircle2 } from 'lucide-react';

export type TicketStatus = 'open' | 'waiting' | 'resolved';

export type Priority = 'low' | 'normal' | 'high' | 'urgent';

export const TICKETS: { id: string; subject: string; status: TicketStatus; updatedAt: string; lastReply: string }[] = [
  { id: 'T-4821', subject: 'Webhook returning 502 from EU region',     status: 'open',     updatedAt: '12 min ago', lastReply: 'support' },
  { id: 'T-4818', subject: 'SCIM provisioning loop with Okta',         status: 'waiting',  updatedAt: '2 hr ago',   lastReply: 'you' },
  { id: 'T-4801', subject: 'Trial usage shown higher than billing',   status: 'resolved', updatedAt: 'Yesterday',  lastReply: 'support' },
];

export const STATUS_META: Record<TicketStatus, { label: string; fg: string; bg: string; icon: React.ComponentType<{ className?: string }> }> = {
  open:     { label: 'Open',     fg: 'var(--fg-accent)',           bg: 'color-mix(in srgb, var(--fg-accent) 14%, transparent)',           icon: MessageCircle },
  waiting:  { label: 'Waiting',  fg: 'var(--intent-warn-fg)',     bg: 'var(--intent-warn-bg)',     icon: Clock },
  resolved: { label: 'Resolved', fg: 'var(--intent-success-fg)',  bg: 'var(--intent-success-bg)',  icon: CheckCircle2 },
};

// Per-priority accent tone (OCP: value map instead of a type→value ternary chain).
export const PRIORITY_TONE: Record<Priority, string> = {
  low:    'var(--fg-muted)',
  normal: 'var(--fg-default)',
  high:   'var(--intent-warn-fg)',
  urgent: 'var(--intent-danger-fg)',
};

export const PRIORITIES: readonly Priority[] = ['low', 'normal', 'high', 'urgent'];
