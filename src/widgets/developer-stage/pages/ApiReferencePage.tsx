import { useMemo, useState } from 'react';
import { Search, Copy, Check } from 'lucide-react';
import { DeveloperShell } from '../parts/DeveloperShell';

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';
type Endpoint = {
  id: string;
  method: Method;
  path: string;
  summary: string;
  group: string;
  body?: string;
  response: string;
};

const ENDPOINTS: Endpoint[] = [
  // Workspaces
  { id: 'ws-list',   group: 'Workspaces', method: 'GET',    path: '/v1/workspaces',            summary: 'List workspaces in the current org.',
    response: `{\n  "data": [\n    { "id": "ws_8f3a", "name": "monorepo", "default_branch": "main" }\n  ],\n  "next_cursor": null\n}` },
  { id: 'ws-create', group: 'Workspaces', method: 'POST',   path: '/v1/workspaces',            summary: 'Create a new workspace.',
    body:     `{ "name": "monorepo", "git_url": "git@github.com:acme/monorepo.git" }`,
    response: `{ "id": "ws_8f3a", "name": "monorepo", "default_branch": "main" }` },
  { id: 'ws-get',    group: 'Workspaces', method: 'GET',    path: '/v1/workspaces/{id}',       summary: 'Fetch a single workspace.',
    response: `{ "id": "ws_8f3a", "name": "monorepo", "default_branch": "main" }` },
  { id: 'ws-update', group: 'Workspaces', method: 'PATCH',  path: '/v1/workspaces/{id}',       summary: 'Patch workspace fields.',
    body:     `{ "default_branch": "develop" }`,
    response: `{ "id": "ws_8f3a", "default_branch": "develop" }` },
  { id: 'ws-delete', group: 'Workspaces', method: 'DELETE', path: '/v1/workspaces/{id}',       summary: 'Archive a workspace.',
    response: `204 No Content` },

  // Admission
  { id: 'adm-list',  group: 'Admission', method: 'GET',  path: '/v1/admission/rules',          summary: 'List admission rules.',
    response: `{\n  "data": [\n    { "id": "rl_71", "name": "Block large diffs", "severity": "block" }\n  ]\n}` },
  { id: 'adm-eval',  group: 'Admission', method: 'POST', path: '/v1/admission/evaluate',       summary: 'Evaluate a candidate change.',
    body:     `{ "workspace_id": "ws_8f3a", "files": ["src/api.ts"] }`,
    response: `{ "verdict": "warn", "rules_fired": ["rl_71"] }` },

  // Agents
  { id: 'ag-list',   group: 'Agents', method: 'GET',  path: '/v1/agents/runs',                 summary: 'List recent agent runs.',
    response: `{ "data": [ { "id": "run_24", "status": "succeeded" } ] }` },
  { id: 'ag-start',  group: 'Agents', method: 'POST', path: '/v1/agents/runs',                 summary: 'Start a new agent run.',
    body:     `{ "agent_id": "fix-ts", "ticket": "JIRA-12" }`,
    response: `{ "id": "run_24", "status": "queued" }` },
  { id: 'ag-kill',   group: 'Agents', method: 'POST', path: '/v1/agents/runs/{id}/cancel',     summary: 'Cancel a running agent.',
    response: `{ "id": "run_24", "status": "cancelled" }` },

  // Webhooks
  { id: 'wh-list',   group: 'Webhooks', method: 'GET',  path: '/v1/webhooks',                  summary: 'List webhook subscriptions.',
    response: `{ "data": [ { "id": "wh_2", "url": "https://hooks.acme.io/se" } ] }` },
  { id: 'wh-create', group: 'Webhooks', method: 'POST', path: '/v1/webhooks',                  summary: 'Create a webhook.',
    body:     `{ "url": "https://hooks.acme.io/se", "events": ["admission.fired"] }`,
    response: `{ "id": "wh_2", "secret": "whsec_••••" }` },

  // Tokens
  { id: 'tk-list',   group: 'Tokens', method: 'GET',  path: '/v1/tokens',                      summary: 'List personal access tokens.',
    response: `{ "data": [ { "id": "tk_7", "name": "ci", "last_used": "2026-05-12T03:11Z" } ] }` },
];

const GROUP_ORDER = ['Workspaces', 'Admission', 'Agents', 'Webhooks', 'Tokens'];

const METHOD_TONE: Record<Method, { fg: string; bg: string }> = {
  GET:    { fg: 'var(--intent-info-fg)',    bg: 'var(--intent-info-bg)' },
  POST:   { fg: 'var(--intent-success-fg)', bg: 'var(--intent-success-bg)' },
  PATCH:  { fg: 'var(--intent-warn-fg)',    bg: 'var(--intent-warn-bg)' },
  DELETE: { fg: 'var(--intent-danger-fg)',  bg: 'var(--intent-danger-bg)' },
};

export default function ApiReferencePage() {
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState(ENDPOINTS[0].id);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return ENDPOINTS;
    return ENDPOINTS.filter((e) =>
      e.path.toLowerCase().includes(n)
      || e.summary.toLowerCase().includes(n)
      || e.method.toLowerCase().includes(n)
      || e.group.toLowerCase().includes(n),
    );
  }, [q]);

  const grouped = useMemo(() => {
    const m = new Map<string, Endpoint[]>();
    for (const e of filtered) {
      const arr = m.get(e.group) ?? [];
      arr.push(e);
      m.set(e.group, arr);
    }
    return m;
  }, [filtered]);

  const selected = ENDPOINTS.find((e) => e.id === selectedId) ?? ENDPOINTS[0];

  return (
    <DeveloperShell
      title="API reference"
      subtitle="REST v1. JSON in, JSON out. Bearer-token authentication."
    >
      <div
        className="grid rounded-xl overflow-hidden"
        style={{
          gridTemplateColumns: '260px 1fr',
          background: 'var(--bg-canvas)',
          border: '1px solid var(--border-default)',
          minHeight: 'calc(100vh - 240px)',
        }}
      >
        {/* Endpoint list */}
        <aside
          className="border-r overflow-y-auto"
          style={{ borderColor: 'var(--border-muted)' }}
        >
          <div className="p-3 sticky top-0" style={{ background: 'var(--bg-canvas)', borderBottom: '1px solid var(--border-muted)' }}>
            <div
              className="flex items-center gap-2 h-8 px-2.5 rounded-md"
              style={{
                background: 'var(--bg-surface-muted)',
                border: '1px solid var(--border-default)',
              }}
            >
              <Search className="w-3.5 h-3.5" style={{ color: 'var(--fg-subtle)' }} />
              <input
                value={q}
                onChange={(e) => { setQ(e.target.value); }}
                placeholder="Filter endpoints…"
                className="flex-1 bg-transparent outline-none text-[11px]"
                style={{ color: 'var(--fg-strong)' }}
              />
            </div>
          </div>
          <div className="flex flex-col p-2">
            {GROUP_ORDER.map((g) => {
              const items = grouped.get(g);
              if (!items?.length) return null;
              return (
                <div key={g} className="mb-2">
                  <div
                    className="px-2 py-1.5 text-[9px] uppercase tracking-[0.18em] font-semibold"
                    style={{ color: 'var(--fg-subtle)' }}
                  >
                    {g}
                  </div>
                  {items.map((e) => {
                    const active = e.id === selectedId;
                    const tone = METHOD_TONE[e.method];
                    return (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => { setSelectedId(e.id); }}
                        className="w-full text-left flex items-center gap-2 px-2 h-7 rounded-md transition-colors"
                        style={{
                          background: 'transparent',
                          boxShadow: active ? 'inset 0 0 0 1px var(--fg-accent)' : 'none',
                        }}
                        onMouseEnter={(e2) => {
                          if (!active) e2.currentTarget.style.background = 'var(--bg-hover)';
                        }}
                        onMouseLeave={(e2) => {
                          if (!active) e2.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <span
                          className="text-[9px] font-bold tabular-nums"
                          style={{ color: tone.fg, minWidth: 38 }}
                        >
                          {e.method}
                        </span>
                        <code
                          className="text-[11px] font-mono truncate"
                          style={{ color: active ? 'var(--fg-strong)' : 'var(--fg-muted)' }}
                        >
                          {e.path.replace('/v1', '')}
                        </code>
                      </button>
                    );
                  })}
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center py-12 text-[11px]" style={{ color: 'var(--fg-subtle)' }}>
                No matches.
              </div>
            )}
          </div>
        </aside>

        {/* Detail */}
        <EndpointDetail endpoint={selected} />
      </div>
    </DeveloperShell>
  );
}

function EndpointDetail({ endpoint }: { endpoint: Endpoint }) {
  const tone = METHOD_TONE[endpoint.method];
  const curl = `curl -X ${endpoint.method} https://api.acme.dev${endpoint.path}${endpoint.body ? ` \\\n  -H "Content-Type: application/json"` : ''} \\\n  -H "Authorization: Bearer $ACME_TOKEN"${endpoint.body ? ` \\\n  -d '${endpoint.body}'` : ''}`;

  return (
    <div className="overflow-y-auto p-8">
      <div className="flex items-center gap-3 mb-5">
        <span
          className="inline-flex items-center justify-center px-2.5 h-6 rounded text-[10px] font-bold tabular-nums"
          style={{ color: tone.fg, background: tone.bg }}
        >
          {endpoint.method}
        </span>
        <code className="text-[14px] font-mono" style={{ color: 'var(--fg-strong)' }}>
          {endpoint.path}
        </code>
      </div>
      <p className="text-[12px] leading-snug mb-6" style={{ color: 'var(--fg-muted)' }}>
        {endpoint.summary}
      </p>

      <CodeBlock label="cURL" code={curl} />
      {endpoint.body && (
        <CodeBlock label="Request body" code={endpoint.body} muted />
      )}
      <CodeBlock label="Response" code={endpoint.response} muted />

      <div className="mt-8 flex items-center gap-3 text-[11px]" style={{ color: 'var(--fg-subtle)' }}>
        <span>Rate limit: <span style={{ color: 'var(--fg-default)' }}>5000 req/min</span></span>
        <span>·</span>
        <span>Idempotency: <span style={{ color: 'var(--fg-default)' }}>{endpoint.method === 'POST' ? 'header supported' : 'native'}</span></span>
        <span>·</span>
        <span>Scope: <code className="font-mono">{endpoint.group.toLowerCase()}:{endpoint.method === 'GET' ? 'read' : 'write'}</code></span>
      </div>
    </div>
  );
}

function CodeBlock({ label, code, muted }: { label: string; code: string; muted?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div
      className="rounded-lg overflow-hidden mb-3"
      style={{
        background: muted ? 'var(--bg-surface-muted)' : 'var(--bg-canvas)',
        border: '1px solid var(--border-default)',
      }}
    >
      <div
        className="flex items-center justify-between px-3 h-8"
        style={{ borderBottom: '1px solid var(--border-muted)' }}
      >
        <span className="text-[10px] uppercase tracking-[0.14em] font-semibold" style={{ color: 'var(--fg-subtle)' }}>
          {label}
        </span>
        <button
          type="button"
          onClick={() => {
            if (typeof navigator !== 'undefined' && navigator.clipboard) {
              void navigator.clipboard.writeText(code);
              setCopied(true);
              window.setTimeout(() => { setCopied(false); }, 1200);
            }
          }}
          className="inline-flex items-center gap-1 px-2 h-6 rounded text-[10px] font-medium transition-colors"
          style={{ color: 'var(--fg-muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre
        className="text-[12px] leading-relaxed font-mono p-4 m-0 overflow-x-auto"
        style={{ color: 'var(--fg-strong)' }}
      >
        {code}
      </pre>
    </div>
  );
}
