import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, ArrowUp, X, Paperclip, Hash, AtSign, Cpu, Plus, ChevronDown } from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import { GlassCard, Pill } from '@shared/ui';
import { useRunSuggestion, type SuggestionKey } from '../model/suggestions';

type Role = 'user' | 'agent';
type Msg = { id: number; role: Role; text: string };
type Session = {
  id: number;
  title: string;
  msgs: Msg[];
  input: string;
  pending: boolean;
};

const SUGGESTION_KEYS = [
  'lowSafety',
  'unknownFlag',
  'refactor',
  'blastRadius',
] as const;

let sessionSeq = 1;
function newSession(titleFn: (n: number) => string): Session {
  const n = sessionSeq++;
  return { id: n, title: titleFn(n), msgs: [], input: '', pending: false };
}

export default function ChatAgent() {
  const { t } = useTranslation('chat');
  const makeTitle = (n: number) => t('tabs.defaultTitle', { n });
  // Open by default — the agent is the primary CTA at the bottom-center.
  const [open, setOpen] = useState(true);
  const [sessions, setSessions] = useState<Session[]>(() => [newSession(makeTitle)]);
  const [activeId, setActiveId] = useState<number>(() => sessions[0]?.id ?? 1);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Pending synthetic-reply timers; cleared on unmount so a stray callback
  // can't fire setSessions on a torn-down component (the real-world cause
  // of "can't perform a React state update on an unmounted component"
  // warnings here).
  const pendingTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const runSuggestion = useRunSuggestion();

  useEffect(() => {
    const timers = pendingTimersRef.current;
    return () => {
      for (const id of timers) clearTimeout(id);
      timers.clear();
    };
  }, []);

  const active = useMemo(
    () => sessions.find((s) => s.id === activeId) ?? sessions[0],
    [sessions, activeId],
  );

  // useCallback'd so the keyboard effect can list these in deps without
  // re-binding listeners on every render. Identity is stable as long as
  // `activeId` / `makeTitle` don't change.
  const addSession = useCallback(() => {
    const s = newSession(makeTitle);
    setSessions((cur) => [...cur, s]);
    setActiveId(s.id);
  }, [makeTitle]);

  const closeSession = useCallback((id: number) => {
    setSessions((cur) => {
      if (cur.length === 1) {
        // last tab: reset rather than removing
        const fresh = newSession(makeTitle);
        setActiveId(fresh.id);
        return [fresh];
      }
      const next = cur.filter((s) => s.id !== id);
      if (id === activeId) setActiveId(next[next.length - 1].id);
      return next;
    });
  }, [activeId, makeTitle]);

  // ⌘K toggles, ⌘T new tab, ⌘W close tab, ⌘1..9 jump
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (!open) return;
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (meta && e.key.toLowerCase() === 't') {
        e.preventDefault();
        addSession();
      } else if (meta && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        closeSession(activeId);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); };
  }, [open, activeId, addSession, closeSession]);

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open, activeId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [active?.msgs.length, active?.pending]);

  function patchActive(patch: Partial<Session>) {
    setSessions((cur) => cur.map((s) => (s.id === activeId ? { ...s, ...patch } : s)));
  }

  // Suggestion preset handler — runs a real store-side action (filter, lens,
  // overlay, scope) and posts the agent's response synchronously so the user
  // sees the wiring fire even without an LLM round-trip.
  function pickSuggestion(key: SuggestionKey, text: string) {
    if (!active) return;
    const sid = active.id;
    const id = Date.now();
    const userMsg: Msg = { id, role: 'user', text };
    const isFirst = active.msgs.length === 0;
    setSessions((cur) => cur.map((s) => s.id === sid
      ? { ...s, msgs: [...s.msgs, userMsg], input: '', pending: true,
          title: isFirst ? deriveTitle(text) : s.title }
      : s));

    // Defer the action one frame so the user message paints before any
    // overlay/filter changes ripple back into the UI.
    requestAnimationFrame(() => {
      const effect = runSuggestion(key);
      const reply = effect.reply ?? synthReply(text, t);
      setSessions((cur) => cur.map((s) => s.id === sid
        ? { ...s, msgs: [...s.msgs, { id: id + 1, role: 'agent', text: reply }], pending: false }
        : s));
    });
  }

  function send(text: string) {
    if (!active) return;
    const trimmed = text.trim();
    if (!trimmed || active.pending) return;
    const id = Date.now();
    const userMsg: Msg = { id, role: 'user', text: trimmed };
    const isFirst = active.msgs.length === 0;
    const sid = active.id;
    setSessions((cur) => cur.map((s) => s.id === sid
      ? {
          ...s,
          msgs: [...s.msgs, userMsg],
          input: '',
          pending: true,
          title: isFirst ? deriveTitle(trimmed) : s.title,
        }
      : s));
    const timer = setTimeout(() => {
      pendingTimersRef.current.delete(timer);
      setSessions((cur) => cur.map((s) => s.id === sid
        ? {
            ...s,
            msgs: [...s.msgs, { id: id + 1, role: 'agent', text: synthReply(trimmed, t) }],
            pending: false,
          }
        : s));
    }, 700);
    pendingTimersRef.current.add(timer);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (active) send(active.input);
    }
  }

  if (!open) {
    return (
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
        <GlassCard className="overflow-hidden">
          <button type="button"
            onClick={() => { setOpen(true); }}
            title={t('agent.openTitle')}
            aria-label={t('agent.openAria')}
            className="flex items-center justify-center w-10 h-10 transition-colors hover-surface"
            style={{ color: 'var(--fg-muted)' }}
          >
            <Sparkles className="w-4 h-4" style={{ color: 'var(--intent-success-vivid)' }} />
          </button>
        </GlassCard>
      </div>
    );
  }

  if (!active) return null;

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-30 pointer-events-auto w-[560px] max-w-[calc(100vw-820px)] min-w-[420px]">
      {/* Suggestions float above the chat box, only on a fresh session */}
      {active.msgs.length === 0 && (
        <div className="mb-3 pointer-events-auto">
          <ExternalSuggestions
            onPick={(key, label) => { pickSuggestion(key, label); }}
            t={t}
          />
        </div>
      )}
      <GlassCard className="overflow-hidden flex flex-col max-h-[60vh]">
        {/* Header — p0 brand on the left, tab strip inline, close on the right */}
        <header
          className="shrink-0 flex items-stretch border-b"
          style={{ height: 48, borderColor: 'var(--border-default)' }}
        >
          <div className="shrink-0 flex items-center pl-4 pr-4">
            <span
              className="font-mono font-black tracking-tight text-[13px] leading-none"
              style={{ color: 'var(--fg-strong)' }}
            >
              p0
            </span>
          </div>

          {/* Inline tab strip */}
          <div className="flex-1 min-w-0 overflow-x-auto scrollbar-hide">
            <div className="flex items-stretch min-w-max h-full">
              {sessions.map((s) => {
                const a = s.id === activeId;
                return (
                  <div
                    key={s.id}
                    className="group relative flex items-center gap-2 px-3 text-[11px] font-bold cursor-pointer transition-colors whitespace-nowrap"
                    style={{ color: a ? 'var(--fg-strong)' : 'var(--fg-subtle)' }}
                    onClick={() => { setActiveId(s.id); }}
                  >
                    <span className="max-w-[160px] truncate">{s.title}</span>
                    {s.pending && (
                      <span
                        className="w-1 h-1 rounded-full animate-pulse shrink-0"
                        style={{ background: 'var(--intent-success-vivid)' }}
                      />
                    )}
                    <button type="button"
                      onClick={(e) => { e.stopPropagation(); closeSession(s.id); }}
                      className="ml-0.5 p-0.5 rounded-md transition-colors hover-surface"
                      style={{ color: 'var(--fg-subtle)', opacity: 0.7 }}
                      title={t('tabs.closeTitle')}
                      aria-label={t('tabs.closeAria')}
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                    {a && (
                      <span
                        className="absolute left-2 right-2 bottom-0 h-[2px]"
                        style={{ background: 'var(--intent-success-vivid)' }}
                      />
                    )}
                  </div>
                );
              })}
              <button type="button"
                onClick={addSession}
                title={t('tabs.newTitle')}
                aria-label={t('tabs.newAria')}
                className="shrink-0 px-3 flex items-center justify-center transition-colors hover-surface"
                style={{ color: 'var(--fg-subtle)' }}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="shrink-0 flex items-center pr-2">
            <button type="button"
              onClick={() => { setOpen(false); }}
              aria-label={t('agent.closeAria')}
              className="p-1.5 rounded-md transition-colors hover-surface"
              style={{ color: 'var(--fg-subtle)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Conversation */}
        {(active.msgs.length > 0 || active.pending) && (
          <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto scrollbar-hide px-4 py-3">
            <div className="space-y-3">
              {active.msgs.map((m) => (
                <Message key={m.id} msg={m} />
              ))}
              {active.pending && <PendingDots />}
            </div>
          </div>
        )}

        {/* Composer */}
        <div className="shrink-0 border-t" style={{ borderColor: 'var(--border-default)' }}>
          <div className="px-3 pt-2.5 pb-2">
            <textarea
              ref={inputRef}
              rows={1}
              value={active.input}
              onChange={(e) => { patchActive({ input: e.target.value }); }}
              onKeyDown={onKeyDown}
              placeholder={t('composer.placeholder')}
              spellCheck={false}
              className="w-full bg-transparent resize-none text-[12px] leading-relaxed font-medium focus:outline-none placeholder:text-[color:var(--fg-subtle)]"
              style={{ maxHeight: 120, color: 'var(--fg-strong)' }}
            />
          </div>
          <div
            className="flex items-center justify-between px-2 pb-2 pt-1 border-t"
            style={{ borderColor: 'var(--border-muted)' }}
          >
            <div className="flex items-center gap-1">
              <ToolChip title={t('composer.attachFile')} icon={Paperclip} />
              <ToolChip title={t('composer.mentionFile')} icon={Hash} />
              <ToolChip title={t('composer.mentionPerson')} icon={AtSign} />
              <span className="mx-1 h-3 w-px" style={{ background: 'var(--border-default)' }} />
              <ModelChip t={t} />
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-[9px] font-mono"
                style={{ color: 'var(--fg-subtle)', opacity: 0.7 }}
              >
                <kbd
                  className="px-1 py-0.5 rounded-md"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--fg-subtle)' }}
                >↵</kbd> {t('composer.hintSend')}
                <span className="mx-1.5 opacity-50">·</span>
                <kbd
                  className="px-1 py-0.5 rounded-md"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--fg-subtle)' }}
                >⇧↵</kbd> {t('composer.hintNewline')}
              </span>
              <button type="button"
                onClick={() => { send(active.input); }}
                disabled={!active.input.trim() || active.pending}
                className="flex items-center justify-center w-7 h-7 rounded-md transition-all"
                style={
                  active.input.trim() && !active.pending
                    ? { background: 'var(--intent-success-vivid)', color: 'var(--bg-canvas)' }
                    : { background: 'var(--bg-elevated)', color: 'var(--fg-subtle)' }
                }
                title={t('composer.send')}
                aria-label={t('composer.sendAria')}
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

function ExternalSuggestions({
  onPick, t,
}: {
  onPick: (key: SuggestionKey, label: string) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {SUGGESTION_KEYS.map((k) => {
          const s = t(`suggestions.items.${k}`);
          return (
            <Pill key={k} onClick={() => { onPick(k, s); }}>
              {s}
            </Pill>
          );
        })}
      </div>
    </div>
  );
}

function Message({ msg }: { msg: Msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className="max-w-[85%] px-3 py-2 rounded-xl text-[12px] leading-relaxed"
        style={
          isUser
            ? {
                background: 'var(--bg-elevated)',
                color: 'var(--fg-strong)',
              }
            : {
                background: 'var(--bg-surface-muted)',
                color: 'var(--fg-muted)',
                border: '1px solid var(--border-muted)',
              }
        }
      >
        {!isUser && (
          <div
            className="mb-1 font-mono font-black tracking-tight text-[11px] leading-none"
            style={{ color: 'var(--fg-muted)' }}
          >
            p0
          </div>
        )}
        <div className="whitespace-pre-wrap">{msg.text}</div>
      </div>
    </div>
  );
}

function PendingDots() {
  return (
    <div className="flex justify-start">
      <div
        className="px-3 py-2 rounded-xl border"
        style={{
          background: 'var(--bg-surface-muted)',
          borderColor: 'var(--border-muted)',
        }}
      >
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1 h-1 rounded-full animate-pulse"
              style={{ background: 'var(--fg-subtle)', animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

const MODELS = [
  'claude-opus-4-7',
  'claude-sonnet-4-6',
  'claude-haiku-4-5',
];

function ModelChip({
  t,
}: {
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const [open, setOpen] = useState(false);
  const [model, setModel] = useState(MODELS[0]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onDoc);
    return () => { window.removeEventListener('mousedown', onDoc); };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); }}
        title={t('composer.model')}
        className="flex items-center gap-1 px-1.5 py-1 rounded-md text-[9px] font-mono transition-colors hover-surface"
        style={{
          background: 'var(--bg-elevated)',
          color: 'var(--fg-muted)',
        }}
      >
        <Cpu className="w-2.5 h-2.5" />
        <span>{model}</span>
        <ChevronDown className={`w-2.5 h-2.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute bottom-full left-0 mb-1 w-[180px] rounded-lg border shadow-2xl"
          style={{
            borderColor: 'var(--border-default)',
            background: 'var(--bg-overlay)',
            backdropFilter: 'blur(22px) saturate(160%)',
            WebkitBackdropFilter: 'blur(22px) saturate(160%)',
          }}
        >
          {MODELS.map((m) => {
            const a = m === model;
            return (
              <button type="button"
                key={m}
                onClick={() => { setModel(m); setOpen(false); }}
                className="w-full text-left px-2.5 py-1.5 text-[10px] font-mono transition-colors hover-surface"
                style={
                  a
                    ? { background: 'var(--bg-active)', color: 'var(--fg-strong)' }
                    : { color: 'var(--fg-muted)' }
                }
              >
                {m}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ToolChip({
  title, icon: Icon,
}: {
  title: string; icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button type="button"
      title={title}
      aria-label={title}
      className="p-1.5 rounded-md transition-colors hover-surface"
      style={{ color: 'var(--fg-subtle)' }}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

// Derive a short tab title from the first user message.
function deriveTitle(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= 22) return cleaned;
  return cleaned.slice(0, 22).trimEnd() + '…';
}

// Local synthetic reply — no real model call, just a plausible response shape.
// Takes a t() function so the canned phrases live in locale JSON
// (chat.synthReply.*) and stay in sync with the user's chosen language.
type SynthT = (key: string, opts?: Record<string, unknown>) => string;
function synthReply(q: string, t: SynthT): string {
  const lower = q.toLowerCase();
  if (lower.includes('blast')) return t('synthReply.blast');
  if (lower.includes('refactor')) return t('synthReply.refactor');
  if (lower.includes('unknown') || lower.includes('flagged')) return t('synthReply.unknown');
  if (lower.includes('low edit safety') || lower.includes('safety')) return t('synthReply.safety');
  return t('synthReply.fallback', { q });
}
