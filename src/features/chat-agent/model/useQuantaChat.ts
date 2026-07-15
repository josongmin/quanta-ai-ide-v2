// Bridge the chat dock to the real quanta-codeagent agent over session.v1.
//
// Owns ONE QuantaSessionClient for the lifetime of the mounted dock, connects
// on mount when a daemon is resolvable (see @shared/agent-bridge/config), and
// exposes `runTurn(text, handlers)` that streams the agent's reply back through
// callbacks. When no daemon is reachable `available` is false and callers fall
// back to their local synthReply (offline demo mode).

import { useCallback, useEffect, useRef, useState } from 'react';
import { QuantaSessionClient, type SessionEvent } from '@shared/agent-bridge';

export type TurnHandlers = {
  /** Fired on every streamed chunk with the accumulated text so far. */
  onDelta: (accumulated: string) => void;
  /** Fired once when the turn finishes; carries the full reply text. */
  onDone: (final: string) => void;
  /** Fired when the turn fails / the socket drops before completing. */
  onError: () => void;
};

export type QuantaChat = {
  /** True when a daemon was resolvable at mount — callers may skip the fallback. */
  readonly available: boolean;
  /** Start a turn. Returns false synchronously when no client exists (offline). */
  readonly runTurn: (text: string, handlers: TurnHandlers) => boolean;
};

// A stalled daemon (hung tool, half-open TCP, laptop sleep) never emits
// completed/failed — without this, `pending` would strand the composer forever.
const TURN_TIMEOUT_MS = 90_000;
// Bound the accumulator so a hostile/buggy daemon streaming unbounded deltas
// can't OOM the tab.
const MAX_ACC_CHARS = 512 * 1024;

export function useQuantaChat(): QuantaChat {
  const clientRef = useRef<QuantaSessionClient | null>(null);
  const disposedRef = useRef(false);
  // FIFO of runTurn "claimers" awaiting their turn id from the next
  // turn.started. Because the one daemon session runs turns sequentially,
  // turn.started events arrive in fire order — so each turn claims the right id
  // and multiplexed chat tabs route deltas to the correct bubble.
  const claimQueueRef = useRef<((turnId: string | undefined) => void)[]>([]);
  // Resolved once at mount — matches how the demo reads env.useRealApi.
  const [available] = useState(() => QuantaSessionClient.isAvailable);

  useEffect(() => {
    disposedRef.current = false;
    claimQueueRef.current = [];
    if (!available) return;
    const client = new QuantaSessionClient();
    clientRef.current = client;
    // Route each turn.started's id to the oldest waiting runTurn.
    const offStarted = client.on('turn.started', (e: SessionEvent) => {
      const claim = claimQueueRef.current.shift();
      if (claim) claim(typeof e.turnId === 'string' ? e.turnId : undefined);
    });
    client.connect();
    return () => {
      disposedRef.current = true;
      offStarted();
      claimQueueRef.current = [];
      client.close();
      clientRef.current = null;
    };
  }, [available]);

  const runTurn = useCallback((text: string, handlers: TurnHandlers): boolean => {
    const client = clientRef.current;
    if (client === null) return false;

    let acc = '';
    let settled = false;
    let myTurnId: string | undefined; // set when this turn's turn.started lands
    let lastSeq = -1;
    let watchdog: ReturnType<typeof setTimeout> | null = null;
    const claim = (turnId: string | undefined): void => { myTurnId = turnId; };
    const cleanups: (() => void)[] = [];

    const cleanup = (): void => {
      const i = claimQueueRef.current.indexOf(claim);
      if (i >= 0) claimQueueRef.current.splice(i, 1);
      for (const off of cleanups) off();
      cleanups.length = 0;
      if (watchdog !== null) { clearTimeout(watchdog); watchdog = null; }
    };
    const done = (): void => {
      if (settled) return;
      settled = true;
      cleanup();
      if (!disposedRef.current) handlers.onDone(acc);
    };
    const fail = (): void => {
      if (settled) return;
      settled = true;
      cleanup();
      if (!disposedRef.current) handlers.onError();
    };

    // Only handle events for THIS turn once its id is known. Before turn.started
    // (myTurnId undefined) or when the daemon omits turnId, accept — deltas
    // never precede turn.started, so the single-turn case still works.
    const mine = (e: SessionEvent): boolean =>
      myTurnId === undefined || e.turnId === undefined || e.turnId === myTurnId;

    cleanups.push(
      client.on('turn.output.delta', (e: SessionEvent) => {
        if (!mine(e)) return;
        // seq dedup / reorder guard: a redelivered or out-of-order chunk must
        // not duplicate or scramble the reply.
        if (e.seq <= lastSeq) return;
        lastSeq = e.seq;
        if (typeof e.delta === 'string' && e.delta.length > 0 && acc.length < MAX_ACC_CHARS) {
          acc += e.delta;
          if (!disposedRef.current) handlers.onDelta(acc);
        }
      }),
    );
    cleanups.push(client.on('turn.completed', (e: SessionEvent) => { if (mine(e)) done(); }));
    cleanups.push(client.on('turn.aborted', (e: SessionEvent) => { if (mine(e)) done(); }));
    cleanups.push(client.on('turn.failed', (e: SessionEvent) => { if (mine(e)) fail(); }));

    // Watchdog starts now so it also covers a stalled handshake (never reaches
    // 'connected'), not just a stalled turn.
    watchdog = setTimeout(fail, TURN_TIMEOUT_MS);

    const fire = (): void => {
      claimQueueRef.current.push(claim);
      if (!client.runTurn(text)) {
        fail(); // cleanup() removes the claim we just pushed
        return;
      }
    };

    if (client.phase === 'connected') {
      fire();
    } else {
      // onPhase replays the current phase synchronously, so an already-'closed'
      // client (daemon never came up) fails fast → caller uses its fallback.
      const off = client.onPhase((phase) => {
        if (phase === 'connected') {
          off();
          fire();
        } else if (phase === 'closed' || phase === 'error') {
          off();
          fail();
        }
      });
      cleanups.push(off);
    }
    return true;
  }, []);

  return { available, runTurn };
}
