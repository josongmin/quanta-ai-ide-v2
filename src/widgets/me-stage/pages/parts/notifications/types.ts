import { Bell, Mail, Smartphone } from 'lucide-react';
import { SlackIcon } from '@shared/ui/brand-icons';

export type Channel = 'inApp' | 'email' | 'slack' | 'mobile';
export type EventId =
  | 'mention' | 'review.requested' | 'review.commented'
  | 'review.approved' | 'review.changes-requested'
  | 'admission.failed' | 'admission.passed'
  | 'fix.completed' | 'fix.rolled-back'
  | 'agent.completed' | 'agent.failed'
  | 'inv.evidence' | 'inv.handoff'
  | 'security.signin' | 'security.token'
  | 'billing.invoice' | 'billing.usage';

export type EventMeta = {
  id: EventId;
  label: string;
  sub: string;
  group: string;
};

export const EVENTS: EventMeta[] = [
  { id: 'mention',                   label: '@mentions',                  sub: 'Someone mentions you in a comment, review, or chat',  group: 'You & teammates' },
  { id: 'review.requested',          label: 'Review requested',           sub: 'A teammate adds you as a reviewer',                   group: 'Reviews' },
  { id: 'review.commented',          label: 'New comment on your PR',     sub: 'Someone comments on a PR you authored',               group: 'Reviews' },
  { id: 'review.approved',           label: 'PR approved',                sub: 'Your PR receives an approval',                        group: 'Reviews' },
  { id: 'review.changes-requested',  label: 'Changes requested',          sub: 'Reviewer requested changes on your PR',               group: 'Reviews' },
  { id: 'admission.failed',          label: 'Admission gate failed',      sub: 'A change you authored failed the admission policy',   group: 'Admission & fixes' },
  { id: 'admission.passed',          label: 'Admission gate passed',      sub: 'A change you authored passed gate (low priority)',    group: 'Admission & fixes' },
  { id: 'fix.completed',             label: 'Fix pipeline completed',     sub: 'A fix run you started finished',                      group: 'Admission & fixes' },
  { id: 'fix.rolled-back',           label: 'Fix rolled back',            sub: 'A fix you applied was rolled back',                   group: 'Admission & fixes' },
  { id: 'agent.completed',           label: 'Agent completed',            sub: 'An agent run finished its task',                      group: 'Agents' },
  { id: 'agent.failed',              label: 'Agent failed',               sub: 'An agent crashed or hit a hard limit',                group: 'Agents' },
  { id: 'inv.evidence',              label: 'New evidence',               sub: 'New evidence linked to an investigation you watch',   group: 'Investigations' },
  { id: 'inv.handoff',              label: 'Investigation handoff',      sub: 'An investigation was handed off to you',              group: 'Investigations' },
  { id: 'security.signin',           label: 'New sign-in',                sub: 'New device or location signed into your account',     group: 'Security' },
  { id: 'security.token',            label: 'Token created or revoked',   sub: 'PAT was generated or revoked on your account',        group: 'Security' },
  { id: 'billing.invoice',           label: 'Invoice issued',             sub: 'Monthly invoice ready for your org',                  group: 'Billing' },
  { id: 'billing.usage',             label: 'Usage limit warning',        sub: 'Org is approaching a usage cap',                      group: 'Billing' },
];

export const CHANNELS: { id: Channel; label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; sub?: string }[] = [
  { id: 'inApp', label: 'In-app',  icon: Bell,        sub: 'Inbox bell' },
  { id: 'email', label: 'Email',   icon: Mail,        sub: 'sora@acme.com' },
  { id: 'slack', label: 'Slack',   icon: SlackIcon,   sub: 'acme · @sora' },
  { id: 'mobile',label: 'Mobile',  icon: Smartphone,  sub: 'Push to iOS app' },
];

export type Settings = {
  matrix: Record<EventId, Record<Channel, boolean>>;
  digest: 'realtime' | 'hourly' | 'daily-9am' | 'weekly-monday';
  quietHours: { enabled: boolean; from: string; to: string; timezone: string };
  doNotDisturb: boolean;
  globalMute: boolean;
};

export const INITIAL: Settings = {
  matrix: makeInitialMatrix(),
  digest: 'realtime',
  quietHours: { enabled: true, from: '22:00', to: '08:00', timezone: 'Asia/Seoul' },
  doNotDisturb: false,
  globalMute: false,
};

function makeInitialMatrix(): Record<EventId, Record<Channel, boolean>> {
  const out: Record<string, Record<Channel, boolean>> = {};
  for (const e of EVENTS) {
    out[e.id] = {
      inApp:  true,
      email:  e.id === 'mention' || e.id.startsWith('security.') || e.id.startsWith('billing.'),
      slack:  e.id === 'mention' || e.id === 'review.requested',
      mobile: e.id === 'mention' || e.id.startsWith('security.'),
    };
  }
  return out;
}
