// Minimal session.v1 wire slice for the demo chat bridge.
//
// A PURPOSE-BUILT subset of quanta-codeagent's session protocol — only the
// command/event surface the chat dock needs to drive a turn and stream the
// reply. The canonical, full-featured client (resume, heartbeat, canvas,
// sub-agents, observability) lives in the quanta repo at
// apps/web-frontend/src/ws/{client,envelope,types/protocol}.ts; graduate to
// vendoring that when those surfaces are needed. The wire shapes below mirror
// that repo's ws/envelope.ts exactly (envelope keys + payload type tags).

export const SESSION_PROTOCOL_VERSION = 'session.v1' as const;

/** Discovery sentinel: the daemon rejects it and replies with the real id. */
export const HANDSHAKE_DISCOVERY_SESSION_ID = 'ui-session';

// ── Commands the client sends ────────────────────────────────────────────
export type SessionCommandBody =
  | { readonly type: 'input.append'; readonly text: string }
  | { readonly type: 'turn.run' }
  | { readonly type: 'turn.cancel' }
  | {
      readonly type: 'approval.respond';
      readonly approvalId: string;
      readonly decision: 'approve' | 'deny';
      readonly scope?: 'once' | 'session' | 'session_prefix';
      readonly steer?: string;
    };

/** A command as it rides the wire: body + routing envelope fields the client
 *  fills in (`sessionId` / `commandId` / `issuedAt`). */
export type SessionCommand = SessionCommandBody & {
  readonly sessionId: string;
  readonly commandId: string;
  readonly issuedAt: string;
};

// ── Events the client receives ───────────────────────────────────────────
export type SessionEventType =
  | 'session.created'
  | 'session.state.updated'
  | 'turn.started'
  | 'turn.output.delta'
  | 'turn.completed'
  | 'turn.failed'
  | 'turn.aborted'
  | 'tool.invoked'
  | 'tool.progress'
  | 'tool.completed'
  | 'approval.requested'
  | 'approval.resolved';

const EVENT_TYPES: readonly SessionEventType[] = [
  'session.created',
  'session.state.updated',
  'turn.started',
  'turn.output.delta',
  'turn.completed',
  'turn.failed',
  'turn.aborted',
  'tool.invoked',
  'tool.progress',
  'tool.completed',
  'approval.requested',
  'approval.resolved',
];

/**
 * A decoded event. The demo reads a few typed fields off the hot events
 * (`delta`, tool ids, approval) and treats every other payload key as
 * forward-compatible extra data.
 */
export type SessionEvent = {
  readonly type: SessionEventType;
  readonly seq: number;
  readonly eventId: string;
  /** Correlates turn.started/output.delta/completed/failed/aborted to one turn,
   *  so multiplexed chat tabs route deltas to the right bubble. */
  readonly turnId?: string;
  /** turn.output.delta — streamed assistant text chunk. */
  readonly delta?: string;
  /** tool.invoked / tool.completed. */
  readonly toolCallId?: string;
  /** tool.invoked. */
  readonly toolName?: string;
  /** tool.completed — 'ok' | 'error' | 'denied' | 'timeout' | … */
  readonly status?: string;
  /** approval.requested. */
  readonly approval?: { readonly approvalId: string; readonly reason?: string };
  readonly [key: string]: unknown;
};

// ── Encode / decode ──────────────────────────────────────────────────────

export function encodeCommandFrame(command: SessionCommand): string {
  return JSON.stringify({
    version: SESSION_PROTOCOL_VERSION,
    kind: 'command',
    payload: command,
  });
}

/** Flat control envelope (no payload wrap), matching the daemon's connect codec. */
export function encodeConnectFrame(sessionId: string): string {
  return JSON.stringify({
    version: SESSION_PROTOCOL_VERSION,
    kind: 'connect',
    sessionId,
  });
}

export type DecodedFrame =
  | { readonly kind: 'event'; readonly event: SessionEvent }
  | { readonly kind: 'snapshot'; readonly sessionId: string; readonly seq: number }
  | { readonly kind: 'rejected'; readonly target: 'connect' | 'command'; readonly sessionId?: string }
  | { readonly kind: 'other'; readonly tag: string | null };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Parse a raw wire frame once and route by envelope `kind`. NO-THROW — returns
 *  null on any structural mismatch (caller drops). Mirrors the validation gates
 *  in quanta's ws/envelope.ts (type tag + seq + non-empty eventId for events). */
export function decodeFrame(raw: unknown): DecodedFrame | null {
  if (typeof raw !== 'string') return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;
  const kind = typeof parsed['kind'] === 'string' ? parsed['kind'] : null;

  if (kind === 'event') {
    const p = parsed['payload'];
    if (!isRecord(p)) return null;
    const type = p['type'];
    if (typeof type !== 'string' || !(EVENT_TYPES as readonly string[]).includes(type)) {
      return { kind: 'other', tag: 'event' };
    }
    const seq = p['seq'];
    if (typeof seq !== 'number' || !Number.isFinite(seq)) return null;
    const eventId = p['eventId'];
    if (typeof eventId !== 'string' || eventId.length === 0) return null;
    // The typed hot fields the demo reads off events must have the right shape
    // when present, or a hostile/buggy daemon crashes consumers that treat them
    // as `string` / structured. Absent is fine (all optional); wrong-typed is
    // not — drop the frame (null) rather than admit a lying SessionEvent.
    if ('turnId' in p && typeof p['turnId'] !== 'string') return null;
    if ('delta' in p && typeof p['delta'] !== 'string') return null;
    if ('toolCallId' in p && typeof p['toolCallId'] !== 'string') return null;
    if ('toolName' in p && typeof p['toolName'] !== 'string') return null;
    if ('status' in p && typeof p['status'] !== 'string') return null;
    if ('approval' in p) {
      const ap = p['approval'];
      if (!isRecord(ap) || typeof ap['approvalId'] !== 'string') return null;
      if ('reason' in ap && typeof ap['reason'] !== 'string') return null;
    }
    return { kind: 'event', event: p as unknown as SessionEvent };
  }

  if (kind === 'snapshot') {
    const p = parsed['payload'];
    if (!isRecord(p) || typeof p['sessionId'] !== 'string') return null;
    const seq = p['seq'];
    return { kind: 'snapshot', sessionId: p['sessionId'], seq: typeof seq === 'number' ? seq : 0 };
  }

  if (kind === 'rejected') {
    const target = parsed['target'];
    if (target !== 'connect' && target !== 'command') return { kind: 'other', tag: 'rejected' };
    const sessionId = parsed['sessionId'];
    return {
      kind: 'rejected',
      target,
      ...(typeof sessionId === 'string' ? { sessionId } : {}),
    };
  }

  return { kind: 'other', tag: kind };
}
