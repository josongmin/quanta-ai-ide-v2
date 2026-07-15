// QuantaSessionClient — thin WebSocket client for the quanta-codeagent
// web-daemon (session.v1). Drives ONE session: connect + handshake, send
// commands (input.append / turn.run / approval.respond), subscribe to events.
//
// Handshake (mirrors quanta's SessionClient, minus resume/heartbeat/canvas):
//   open → send connect frame with the discovery sentinel id
//        → daemon replies `rejected(connect)` carrying the real sessionId
//        → adopt it, re-send connect
//        → daemon replies `snapshot` → phase 'connected', commands now flow.
//
// Deliberately omitted (add by vendoring the canonical client if needed):
// auto-reconnect/backoff, keepalive heartbeat, seq-resume, canvas / agent-state
// / observability / sub-agent side channels.

import { resolveQuantaConfig } from './config';
import {
  decodeFrame,
  encodeCommandFrame,
  encodeConnectFrame,
  HANDSHAKE_DISCOVERY_SESSION_ID,
  type SessionCommandBody,
  type SessionEvent,
  type SessionEventType,
} from './protocol';

export type ConnectionPhase = 'idle' | 'connecting' | 'connected' | 'closed' | 'error';

type EventListener = (event: SessionEvent) => void;
type PhaseListener = (phase: ConnectionPhase) => void;

let commandSeq = 0;
function nextCommandId(): string {
  commandSeq += 1;
  return `cmd-${Date.now().toString(36)}-${commandSeq.toString(36)}`;
}

export class QuantaSessionClient {
  #ws: WebSocket | null = null;
  #sessionId: string | null = null;
  #phase: ConnectionPhase = 'idle';
  readonly #typed = new Map<SessionEventType, Set<EventListener>>();
  readonly #any = new Set<EventListener>();
  readonly #phaseListeners = new Set<PhaseListener>();
  // Bounded exponential-backoff reconnect so a transient blip (daemon restart,
  // Wi-Fi hiccup) recovers instead of silently degrading every later message to
  // the canned fallback. `#closedByClient` suppresses reconnect on an explicit
  // close().
  #closedByClient = false;
  #reconnectAttempts = 0;
  #reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  static readonly #MAX_RECONNECT = 6;

  get phase(): ConnectionPhase {
    return this.#phase;
  }

  get sessionId(): string | null {
    return this.#sessionId;
  }

  /** True once nothing has resolved a daemon to connect to (offline demo). */
  static get isAvailable(): boolean {
    return resolveQuantaConfig() !== null;
  }

  connect(): void {
    if (this.#ws !== null) return;
    this.#closedByClient = false;
    const cfg = resolveQuantaConfig();
    if (cfg === null) {
      this.#setPhase('error');
      return;
    }
    const url =
      cfg.token !== null && cfg.token.length > 0
        ? `${cfg.wsUrl}${cfg.wsUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(cfg.token)}`
        : cfg.wsUrl;

    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      this.#setPhase('error');
      return;
    }
    this.#ws = ws;
    this.#setPhase('connecting');

    ws.onopen = () => {
      this.#sendRaw(encodeConnectFrame(this.#sessionId ?? HANDSHAKE_DISCOVERY_SESSION_ID));
    };
    ws.onmessage = (ev: MessageEvent) => {
      this.#handle(typeof ev.data === 'string' ? ev.data : null);
    };
    ws.onclose = () => {
      this.#ws = null;
      // Unexpected drop → try to recover (unless the user/dock closed us or we
      // exhausted the budget). Stay in 'connecting' during backoff so consumers
      // don't treat a recoverable blip as a hard failure.
      if (!this.#closedByClient && this.#reconnectAttempts < QuantaSessionClient.#MAX_RECONNECT) {
        this.#scheduleReconnect();
      } else {
        this.#setPhase('closed');
      }
    };
    ws.onerror = () => {
      // `onclose` follows and drives the phase transition.
    };
  }

  #scheduleReconnect(): void {
    this.#reconnectAttempts += 1;
    // 0.5s, 1s, 2s, 4s, 8s, capped at 15s.
    const delay = Math.min(15000, 500 * 2 ** (this.#reconnectAttempts - 1));
    this.#setPhase('connecting');
    this.#reconnectTimer = setTimeout(() => {
      this.#reconnectTimer = null;
      if (!this.#closedByClient) this.connect();
    }, delay);
  }

  close(): void {
    this.#closedByClient = true;
    if (this.#reconnectTimer !== null) {
      clearTimeout(this.#reconnectTimer);
      this.#reconnectTimer = null;
    }
    const ws = this.#ws;
    this.#ws = null;
    if (ws !== null) {
      try {
        ws.close(1000, 'client_close');
      } catch {
        // some engines throw closing a never-opened socket — ignore
      }
    }
    this.#setPhase('closed');
  }

  onPhase(handler: PhaseListener): () => void {
    this.#phaseListeners.add(handler);
    handler(this.#phase);
    return () => {
      this.#phaseListeners.delete(handler);
    };
  }

  on(type: SessionEventType, handler: EventListener): () => void {
    let set = this.#typed.get(type);
    if (set === undefined) {
      set = new Set();
      this.#typed.set(type, set);
    }
    set.add(handler);
    return () => {
      this.#typed.get(type)?.delete(handler);
    };
  }

  onAny(handler: EventListener): () => void {
    this.#any.add(handler);
    return () => {
      this.#any.delete(handler);
    };
  }

  /** Send one command. Returns false (dropped) if the handshake isn't settled. */
  send(body: SessionCommandBody): boolean {
    if (this.#ws === null || this.#phase !== 'connected' || this.#sessionId === null) return false;
    this.#sendRaw(
      encodeCommandFrame({
        ...body,
        sessionId: this.#sessionId,
        commandId: nextCommandId(),
        issuedAt: new Date().toISOString(),
      }),
    );
    return true;
  }

  /** Convenience: append the prompt text then run the turn. */
  runTurn(text: string): boolean {
    return this.send({ type: 'input.append', text }) && this.send({ type: 'turn.run' });
  }

  #sendRaw(frame: string): void {
    try {
      this.#ws?.send(frame);
    } catch {
      // socket raced closed between the phase check and send — drop
    }
  }

  #handle(raw: string | null): void {
    if (raw === null) return;
    const frame = decodeFrame(raw);
    if (frame === null) return;

    if (
      frame.kind === 'rejected' &&
      frame.target === 'connect' &&
      frame.sessionId !== undefined &&
      frame.sessionId !== this.#sessionId
    ) {
      this.#sessionId = frame.sessionId;
      this.#sendRaw(encodeConnectFrame(frame.sessionId));
      return;
    }
    if (frame.kind === 'snapshot') {
      this.#sessionId = frame.sessionId;
      this.#reconnectAttempts = 0; // healthy again — reset the backoff budget
      this.#setPhase('connected');
      return;
    }
    if (frame.kind === 'event') {
      this.#fanout(frame.event);
    }
  }

  #fanout(event: SessionEvent): void {
    const typed = this.#typed.get(event.type);
    if (typed !== undefined) {
      for (const handler of [...typed]) handler(event);
    }
    for (const handler of [...this.#any]) handler(event);
  }

  #setPhase(next: ConnectionPhase): void {
    if (this.#phase === next) return;
    this.#phase = next;
    for (const handler of [...this.#phaseListeners]) handler(next);
  }
}
