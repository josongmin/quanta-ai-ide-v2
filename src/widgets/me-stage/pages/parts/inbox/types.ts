import {
  AtSign, GitPullRequest, ShieldCheck, Wrench, Bot, Bell,
} from 'lucide-react';

export type ItemType = 'mention' | 'review' | 'admission' | 'fix' | 'agent' | 'security';
export type ItemStatus = 'unread' | 'read' | 'archived' | 'snoozed';

export const ITEM_ICONS = {
  mention: AtSign,
  review: GitPullRequest,
  admission: ShieldCheck,
  fix: Wrench,
  agent: Bot,
  security: Bell,
} as const;

export type Item = {
  id: string;
  type: ItemType;
  title: string;
  preview: string;
  who: string;
  where: string;
  at: string;
  status: ItemStatus;
  starred: boolean;
  href: string;
  meta?: { label: string; tone: 'success' | 'warn' | 'danger' | 'neutral' }[];
};

export const INITIAL: Item[] = [
  { id: 'i1',  type: 'mention',  title: '@sora in #investigation/payment-flow',     preview: '"Sora can you take this from here? Last touch was on the M3 deploy."', who: 'Lee Junho', where: 'Investigate', at: '2m ago',  status: 'unread', starred: true,  href: '#' },
  { id: 'i2',  type: 'review',   title: 'Review requested · PR #4821',              preview: 'Add admission rule for SSO-only prod (4 files, +83 −12)',           who: 'Mei Wang',   where: 'Reviews',     at: '14m ago', status: 'unread', starred: false, href: '#', meta: [{ label: 'review · pending', tone: 'warn' }] },
  { id: 'i3',  type: 'admission',title: 'Admission failed · branch release/2026.05', preview: 'Required obligation "no-secret-in-diff" was not satisfied.',         who: 'system',     where: 'Admission',   at: '1h ago',  status: 'unread', starred: false, href: '#', meta: [{ label: 'gate fail', tone: 'danger' }, { label: '2 obligations', tone: 'neutral' }] },
  { id: 'i4',  type: 'fix',      title: 'Fix pipeline finished · INV-2025-0012',     preview: 'Verified fix applied. Rolled back 1 reviewer comment.',              who: 'fix-pipeline', where: 'Fixes',     at: '2h ago',  status: 'read',   starred: true,  href: '#', meta: [{ label: 'success', tone: 'success' }] },
  { id: 'i5',  type: 'agent',    title: 'Agent stopped · review-bot',                preview: 'Hit rate-limit (50 calls / 5 min). Retrying in 4 min.',              who: 'system',     where: 'Agents',      at: '3h ago',  status: 'read',   starred: false, href: '#', meta: [{ label: 'rate limit', tone: 'warn' }] },
  { id: 'i6',  type: 'review',   title: 'PR approved · #4818',                       preview: 'Brad Lee approved your refactor of TokensContext.',                  who: 'Brad Lee',   where: 'Reviews',     at: '5h ago',  status: 'read',   starred: false, href: '#', meta: [{ label: 'approved', tone: 'success' }] },
  { id: 'i7',  type: 'mention',  title: '@sora in #review/PR-4801',                  preview: 'Could you take a quick look at the security tab?',                   who: 'Hana Park',  where: 'Reviews',     at: '6h ago',  status: 'read',   starred: false, href: '#' },
  { id: 'i8',  type: 'security', title: 'New sign-in detected',                      preview: 'Chrome 125 on macOS, Seoul KR. If this wasn\'t you, change password.', who: 'system',   where: 'Security',    at: '8h ago',  status: 'read',   starred: false, href: '#', meta: [{ label: 'security', tone: 'neutral' }] },
  { id: 'i9',  type: 'admission',title: 'Admission passed · 7 PRs',                  preview: 'Bulk gate run on release/2026.05. All 7 passed.',                    who: 'system',     where: 'Admission',   at: '1d ago',  status: 'read',   starred: false, href: '#', meta: [{ label: 'gate pass', tone: 'success' }] },
  { id: 'i10', type: 'fix',      title: 'Fix obligations open · PR #4799',           preview: '3 of 5 proof obligations remain. Re-run after addressing.',          who: 'fix-pipeline', where: 'Fixes',     at: '1d ago',  status: 'read',   starred: false, href: '#', meta: [{ label: '3 obligations', tone: 'warn' }] },
  { id: 'i11', type: 'agent',    title: 'Agent completed · sora-fix-flake-test',     preview: 'Patched 2 flaky tests. PR #4823 opened on your behalf.',             who: 'fix-pipeline', where: 'Agents',    at: '1d ago',  status: 'read',   starred: false, href: '#', meta: [{ label: 'success', tone: 'success' }] },
  { id: 'i12', type: 'review',   title: 'Changes requested · PR #4790',              preview: 'Junho asked for a smaller diff before merging.',                     who: 'Lee Junho',  where: 'Reviews',     at: '2d ago',  status: 'archived', starred: false, href: '#', meta: [{ label: 'changes requested', tone: 'warn' }] },
  { id: 'i13', type: 'mention',  title: '@sora in /coding chat',                     preview: 'Can you ping me when the index finishes? Thanks!',                   who: 'Mei Wang',   where: 'Coding',      at: '3d ago',  status: 'archived', starred: false, href: '#' },
];

export type Filter = 'all' | 'unread' | 'mentions' | 'reviews' | 'starred' | 'archived';

export function tintFor(t: ItemType) {
  return t === 'mention' ? 'var(--fg-accent)'
    : t === 'review' ? 'var(--fg-link)'
    : t === 'admission' ? 'var(--intent-warn-fg)'
    : t === 'fix' ? 'var(--intent-success-fg)'
    : t === 'agent' ? 'var(--fg-default)'
    : 'var(--fg-muted)';
}

export function bucketOf(rel: string): string {
  if (rel.endsWith('m ago') || rel.endsWith('h ago')) {
    const num = parseInt(rel, 10);
    if (rel.endsWith('m ago') || (rel.endsWith('h ago') && num <= 12)) return 'Today';
  }
  if (rel === '1d ago') return 'Yesterday';
  if (rel.endsWith('d ago') || rel.endsWith('w ago')) return 'Earlier';
  return 'Today';
}
