import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

export type Status = 'delivered' | 'failed' | 'retrying';

export type Delivery = {
  id: string;
  event: string;
  endpoint: string;
  status: Status;
  httpStatus: number | null;
  durationMs: number;
  at: string;
  attempt: number;
  payloadPreview: string;
};

export const DELIVERIES: Delivery[] = [
  { id: 'd_482', event: 'admission.fired',     endpoint: 'hooks.acme.io/se',       status: 'delivered', httpStatus: 200, durationMs: 142, at: '14:32:08', attempt: 1, payloadPreview: '{"rule_id":"rl_71","verdict":"warn"}' },
  { id: 'd_481', event: 'agent.run.succeeded', endpoint: 'hooks.acme.io/se',       status: 'delivered', httpStatus: 200, durationMs: 89,  at: '14:31:42', attempt: 1, payloadPreview: '{"run_id":"run_24","status":"succeeded"}' },
  { id: 'd_480', event: 'webhook.test',        endpoint: 'staging.acme.io/x',      status: 'failed',    httpStatus: 502, durationMs: 5021,at: '14:30:11', attempt: 3, payloadPreview: '{"test":true}' },
  { id: 'd_479', event: 'workspace.created',   endpoint: 'analytics.acme.io/in',   status: 'retrying',  httpStatus: 429, durationMs: 312, at: '14:28:55', attempt: 2, payloadPreview: '{"workspace_id":"ws_2c1d"}' },
  { id: 'd_478', event: 'agent.run.failed',    endpoint: 'hooks.acme.io/se',       status: 'delivered', httpStatus: 200, durationMs: 121, at: '14:27:30', attempt: 1, payloadPreview: '{"run_id":"run_23","error":"timeout"}' },
  { id: 'd_477', event: 'admission.fired',     endpoint: 'hooks.acme.io/se',       status: 'delivered', httpStatus: 200, durationMs: 98,  at: '14:25:12', attempt: 1, payloadPreview: '{"rule_id":"rl_18","verdict":"block"}' },
  { id: 'd_476', event: 'admission.fired',     endpoint: 'hooks.acme.io/se',       status: 'failed',    httpStatus: 500, durationMs: 4202,at: '14:21:48', attempt: 4, payloadPreview: '{"rule_id":"rl_71","verdict":"warn"}' },
  { id: 'd_475', event: 'member.invited',      endpoint: 'crm.acme.io/in',         status: 'delivered', httpStatus: 201, durationMs: 64,  at: '14:18:01', attempt: 1, payloadPreview: '{"email":"new@acme.com"}' },
];

export const STATUS_META: Record<Status, { label: string; fg: string; bg: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }> = {
  delivered: { label: 'Delivered', fg: 'var(--intent-success-fg)', bg: 'var(--intent-success-bg)', icon: CheckCircle2 },
  failed:    { label: 'Failed',    fg: 'var(--intent-danger-fg)',  bg: 'var(--intent-danger-bg)',  icon: XCircle },
  retrying:  { label: 'Retrying',  fg: 'var(--intent-warn-fg)',    bg: 'var(--intent-warn-bg)',    icon: AlertTriangle },
};

export const FILTERS: { id: 'all' | Status; label: string }[] = [
  { id: 'all',       label: 'All' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'retrying',  label: 'Retrying' },
  { id: 'failed',    label: 'Failed' },
];
