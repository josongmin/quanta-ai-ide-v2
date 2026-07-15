// Agent bridge — connect the demo chat to the quanta-codeagent SDK over the
// session.v1 WebSocket protocol. See ./config for connection resolution and
// ./client for the thin session client.

export { resolveQuantaConfig, type QuantaConfig } from './config';
export { QuantaSessionClient, type ConnectionPhase } from './client';
export type {
  SessionCommandBody,
  SessionEvent,
  SessionEventType,
} from './protocol';
