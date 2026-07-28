import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import { safeLocalGet, safeLocalSet, safeLocalRemove, STORAGE_KEYS, clamp } from '@shared/lib';
import { GlassCard } from '@shared/ui';
import { useRunSuggestion, type SuggestionKey } from '../model/suggestions';
import { useQuantaChat } from '../model/useQuantaChat';
import { ChatHeader } from './parts/ChatHeader';
import { Composer } from './parts/Composer';
import { ExternalSuggestions } from './parts/ExternalSuggestions';
import { MessageList } from './parts/MessageList';
import { ResizeHandle } from './parts/ResizeHandle';
import {
  deriveTitle,
  newSession,
  synthReply,
  type Msg,
  type Session,
} from './parts/types';

export default function ChatAgent({
  maxWidth = 'calc(100vw - 820px)',
}: {
  maxWidth?: number | string;
} = {}) {
  const { t } = useTranslation('chat');
  const makeTitle = useCallback((n: number) => t('tabs.defaultTitle', { n }), [t]);
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
  const pendingRafsRef = useRef<Set<number>>(new Set());
  const runSuggestion = useRunSuggestion();
  // Real agent bridge (quanta-codeagent web-daemon). Falls back to synthReply
  // when no daemon is reachable — see useQuantaChat.
  const quanta = useQuantaChat();

  // User-resizable height. The widget defaults to 60vh-ish via CSS but
  // when the user drags the top handle we switch to an explicit pixel
  // height that survives reloads via localStorage. Dragging up grows
  // the widget (since it's anchored to the bottom of the viewport),
  // so deltaY is *subtracted* from the running height during drag.
  const HEIGHT_KEY = STORAGE_KEYS.chatAgentHeight;
  const HEIGHT_MIN = 240;
  const HEIGHT_MAX_VH = 0.92;
  const [height, setHeight] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    const raw = safeLocalGet(HEIGHT_KEY);
    if (raw == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n >= HEIGHT_MIN ? n : null;
  });
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);
  const [isResizing, setIsResizing] = useState(false);

  function clampHeight(h: number): number {
    if (typeof window === 'undefined') return Math.max(HEIGHT_MIN, h);
    const max = Math.floor(window.innerHeight * HEIGHT_MAX_VH);
    return clamp(h, HEIGHT_MIN, max);
  }

  function onResizeStart(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const current = height ?? Math.floor(window.innerHeight * 0.6);
    dragRef.current = { startY: e.clientY, startHeight: current };
    setIsResizing(true);
  }
  function onResizeMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    // Anchored to the viewport bottom, so dragging *up* (negative dy)
    // grows the widget. Invert the sign so the cursor and edge follow.
    const dy = dragRef.current.startY - e.clientY;
    setHeight(clampHeight(dragRef.current.startHeight + dy));
  }
  function onResizeEnd(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.releasePointerCapture(e.pointerId);
    dragRef.current = null;
    setIsResizing(false);
    if (height != null) {
      safeLocalSet(HEIGHT_KEY, String(height));
    }
  }
  function onResizeDoubleClick() {
    // Reset to the CSS default (max-h-[60vh]) by clearing the override.
    setHeight(null);
    safeLocalRemove(HEIGHT_KEY);
  }
  function onResizeKey(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'ArrowUp')   { e.preventDefault(); setHeight((h) => clampHeight((h ?? 360) + 24)); }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHeight((h) => clampHeight((h ?? 360) - 24)); }
    if (e.key === 'Home' || e.key === 'Escape') {
      e.preventDefault();
      setHeight(null);
      safeLocalRemove(HEIGHT_KEY);
    }
  }

  useEffect(() => {
    const timers = pendingTimersRef.current;
    const rafs = pendingRafsRef.current;
    return () => {
      for (const id of timers) clearTimeout(id);
      timers.clear();
      for (const id of rafs) cancelAnimationFrame(id);
      rafs.clear();
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

  // ⌘K toggles, ⌘T new tab, ⌘W close tab, Esc closes
  // Latest-state ref keeps the keydown listener stable: the handler reads
  // current `open`/`activeId` via the ref instead of capturing them, so we
  // don't tear down/re-add the global listener on every tab switch.
  const kbdStateRef = useRef({ open, activeId, addSession, closeSession });
  useLayoutEffect(() => {
    kbdStateRef.current = { open, activeId, addSession, closeSession };
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const { open, activeId, addSession, closeSession } = kbdStateRef.current;
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
  }, []);

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open, activeId]);

  // Auto-scroll respects user intent. If the user scrolled up to read
  // older context, we stop following new agent messages and surface a
  // small pill so they can opt back in.
  const [pinnedToBottom, setPinnedToBottom] = useState(true);
  const [hasNewBelow, setHasNewBelow] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect --
   * Both effects below mirror DOM/scroll state into React so the pill can
   * react. The trigger is external (message growth, tab switch); the
   * resulting state is consumed in the same render cycle by the pill JSX. */

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (pinnedToBottom) {
      el.scrollTop = el.scrollHeight;
      setHasNewBelow(false);
    } else {
      setHasNewBelow(true);
    }
    // pinnedToBottom intentionally omitted; only message growth triggers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.msgs.length, active?.pending]);

  // Reset to pinned when switching tabs.
  useEffect(() => {
    setPinnedToBottom(true);
    setHasNewBelow(false);
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, [activeId]);

  /* eslint-enable react-hooks/set-state-in-effect */

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
    setPinnedToBottom(atBottom);
    if (atBottom) setHasNewBelow(false);
  }

  function jumpToLatest() {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    setPinnedToBottom(true);
    setHasNewBelow(false);
  }

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
    // overlay/filter changes ripple back into the UI. Tracked so it's
    // cancelled on unmount (no setState after teardown).
    const raf = requestAnimationFrame(() => {
      pendingRafsRef.current.delete(raf);
      const effect = runSuggestion(key);
      const reply = effect.reply ?? synthReply(text, t);
      setSessions((cur) => cur.map((s) => s.id === sid
        ? { ...s, msgs: [...s.msgs, { id: id + 1, role: 'agent', text: reply }], pending: false }
        : s));
    });
    pendingRafsRef.current.add(raf);
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

    const agentId = id + 1;
    // Upsert the (streaming) agent reply into the originating tab — one message
    // grows as deltas arrive rather than appending a bubble per chunk.
    const putAgent = (agentText: string, pending: boolean): void => {
      setSessions((cur) => cur.map((s) => {
        if (s.id !== sid) return s;
        const has = s.msgs.some((m) => m.id === agentId);
        const msgs = has
          ? s.msgs.map((m) => (m.id === agentId ? { ...m, text: agentText } : m))
          : [...s.msgs, { id: agentId, role: 'agent' as const, text: agentText }];
        return { ...s, msgs, pending };
      }));
    };

    // Offline fallback — the original 700ms synthetic reply.
    const fallback = (): void => {
      const timer = setTimeout(() => {
        pendingTimersRef.current.delete(timer);
        putAgent(synthReply(trimmed, t), false);
      }, 700);
      pendingTimersRef.current.add(timer);
    };

    const started = quanta.runTurn(trimmed, {
      onDelta: (acc) => { putAgent(acc, true); },
      onDone: (final) => { putAgent(final.length > 0 ? final : synthReply(trimmed, t), false); },
      onError: fallback,
    });
    if (!started) fallback();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // IME-safe: don't submit while a CJK composition is in flight. Without
    // this guard, hitting Enter to commit a Korean/Japanese candidate
    // accidentally fires send().
    if (e.nativeEvent.isComposing) return;
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

  const hasConversation = active.msgs.length > 0 || active.pending;

  return (
    <div
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-30 pointer-events-auto w-[560px] min-w-[420px]"
      style={{ maxWidth }}
    >
      {/* Suggestions float above the chat box, only on a fresh session */}
      {active.msgs.length === 0 && (
        <div className="mb-3 pointer-events-auto">
          <ExternalSuggestions
            onPick={(key, label) => { pickSuggestion(key, label); }}
            t={t}
          />
        </div>
      )}
      <GlassCard
        className={`overflow-hidden flex flex-col relative ${
          hasConversation && height == null ? 'max-h-[60vh]' : ''
        }`}
        style={hasConversation && height != null ? { height } : undefined}
      >
        {hasConversation && (
          <ResizeHandle
            isResizing={isResizing}
            onPointerDown={onResizeStart}
            onPointerMove={onResizeMove}
            onPointerUp={onResizeEnd}
            onDoubleClick={onResizeDoubleClick}
            onKeyDown={onResizeKey}
            t={t}
          />
        )}
        <ChatHeader
          sessions={sessions}
          activeId={activeId}
          onSelect={setActiveId}
          onAddSession={addSession}
          onCloseSession={closeSession}
          onClose={() => { setOpen(false); }}
          t={t}
        />

        {/* Conversation */}
        {hasConversation && (
          <MessageList
            msgs={active.msgs}
            pending={active.pending}
            scrollRef={scrollRef}
            onScroll={onScroll}
            hasNewBelow={hasNewBelow}
            pinnedToBottom={pinnedToBottom}
            onJumpToLatest={jumpToLatest}
          />
        )}

        <Composer
          inputRef={inputRef}
          value={active.input}
          pending={active.pending}
          onChange={(value) => { patchActive({ input: value }); }}
          onKeyDown={onKeyDown}
          onSend={() => { send(active.input); }}
          t={t}
        />
      </GlassCard>
    </div>
  );
}
