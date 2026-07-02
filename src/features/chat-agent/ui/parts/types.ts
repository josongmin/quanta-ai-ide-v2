// Shared module-private types + helpers for the chat-agent dock. These were
// inline in ChatAgent.tsx before the container was split into parts/.

export type Role = 'user' | 'agent';
export type Msg = { id: number; role: Role; text: string };
export type Session = {
  id: number;
  title: string;
  msgs: Msg[];
  input: string;
  pending: boolean;
};

// A narrowed i18n t() signature shared by the parts that only translate.
export type TFn = (key: string, opts?: Record<string, unknown>) => string;

export const SUGGESTION_KEYS = [
  'lowSafety',
  'unknownFlag',
  'refactor',
  'blastRadius',
] as const;

export const MODELS = [
  'claude-opus-4-7',
  'claude-sonnet-4-6',
  'claude-haiku-4-5',
];

let sessionSeq = 1;
export function newSession(titleFn: (n: number) => string): Session {
  const n = sessionSeq++;
  return { id: n, title: titleFn(n), msgs: [], input: '', pending: false };
}

// Derive a short tab title from the first user message.
export function deriveTitle(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= 22) return cleaned;
  return cleaned.slice(0, 22).trimEnd() + '…';
}

// Local synthetic reply — no real model call, just a plausible response shape.
// Takes a t() function so the canned phrases live in locale JSON
// (chat.synthReply.*) and stay in sync with the user's chosen language.
export function synthReply(q: string, t: TFn): string {
  const lower = q.toLowerCase();
  if (lower.includes('blast')) return t('synthReply.blast');
  if (lower.includes('refactor')) return t('synthReply.refactor');
  if (lower.includes('unknown') || lower.includes('flagged')) return t('synthReply.unknown');
  if (lower.includes('low edit safety') || lower.includes('safety')) return t('synthReply.safety');
  return t('synthReply.fallback', { q });
}
