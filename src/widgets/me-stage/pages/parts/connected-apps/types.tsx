import { Mail } from 'lucide-react';
import { GithubIcon, SlackIcon } from '@shared/ui/brand-icons';

// Inline brand glyphs (kept simple for the demo). Defined up-top so the
// const arrays below can reference them without TDZ issues.
type MarkProps = { className?: string };
const baseMark = (label: string) => function Mark({ className }: MarkProps) {
  return (
    <span
      className={`rounded-sm inline-flex items-center justify-center text-[7px] font-black ${className ?? 'w-3.5 h-3.5'}`}
      style={{ background: 'var(--fg-default)', color: 'var(--bg-canvas)' }}
    >
      {label}
    </span>
  );
};
const LinearMark    = baseMark('LN');
const JiraMark      = baseMark('JR');
const GitLabMark    = baseMark('GL');
const PagerDutyMark = baseMark('PD');
const DatadogMark   = baseMark('DD');
const DiscordMark   = baseMark('DC');
const NotionMark    = baseMark('NT');

export type Connection = {
  id: string;
  provider: string;
  account: string;
  scopes: { id: string; label: string; required: boolean }[];
  connectedAt: string;
  lastUsed: string;
  primary?: boolean;
  warning?: string;
  category: 'identity' | 'integration';
  iconBg?: string;
  icon: React.ComponentType<{ className?: string }>;
};

export const INITIAL_CONNECTIONS: Connection[] = [
  {
    id: 'github',
    provider: 'GitHub',
    account: '@sora · Personal',
    scopes: [
      { id: 'read:user',   label: 'Read your profile',                   required: true },
      { id: 'user:email',  label: 'Access your email addresses',         required: true },
      { id: 'repo',        label: 'Read repositories',                   required: true },
      { id: 'read:org',    label: 'Read team and member lists',          required: false },
    ],
    connectedAt: '2025-08-12',
    lastUsed: 'Active now',
    primary: true,
    category: 'identity',
    icon: GithubIcon,
  },
  {
    id: 'google',
    provider: 'Google',
    account: 'sora@acme.com',
    scopes: [
      { id: 'openid',  label: 'Identify you',         required: true },
      { id: 'email',   label: 'Read your email',      required: true },
      { id: 'profile', label: 'Read profile photo',   required: false },
    ],
    connectedAt: '2025-08-12',
    lastUsed: '2 days ago',
    category: 'identity',
    icon: Mail,
  },
  {
    id: 'slack',
    provider: 'Slack',
    account: 'acme · #review-bot',
    scopes: [
      { id: 'chat:write', label: 'Post messages on your behalf in #review-bot', required: true },
      { id: 'channels:read', label: 'See public channel list',                  required: false },
    ],
    connectedAt: '2025-09-01',
    lastUsed: '14 minutes ago',
    category: 'integration',
    icon: SlackIcon,
  },
  {
    id: 'linear',
    provider: 'Linear',
    account: 'ACME workspace',
    scopes: [
      { id: 'read', label: 'Read issues and projects', required: true },
      { id: 'write', label: 'Create and update issues', required: false },
    ],
    connectedAt: '2025-11-04',
    lastUsed: '1 hour ago',
    warning: 'Token expires in 7 days. Re-connect to extend.',
    category: 'integration',
    icon: LinearMark,
  },
  {
    id: 'jira',
    provider: 'Jira',
    account: 'acme.atlassian.net',
    scopes: [
      { id: 'read:jira-work', label: 'Read issues and JQL', required: true },
    ],
    connectedAt: '2025-12-19',
    lastUsed: '6 days ago',
    category: 'integration',
    icon: JiraMark,
  },
];

export const AVAILABLE_INTEGRATIONS = [
  { id: 'gitlab',     name: 'GitLab',       blurb: 'Sign in with GitLab + sync repos',          icon: GitLabMark },
  { id: 'pagerduty',  name: 'PagerDuty',    blurb: 'Surface incident context in investigations', icon: PagerDutyMark },
  { id: 'datadog',    name: 'Datadog',      blurb: 'Pipe metrics into the dot field',           icon: DatadogMark },
  { id: 'discord',    name: 'Discord',      blurb: 'Notify channels on review events',          icon: DiscordMark },
  { id: 'notion',     name: 'Notion',       blurb: 'Link investigations to Notion pages',       icon: NotionMark },
];
