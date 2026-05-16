import { useMemo, useState } from 'react';
import { Play, ChevronDown, Clock, Zap } from 'lucide-react';
import { DeveloperShell } from '../parts/DeveloperShell';

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

const PRESETS: { name: string; method: Method; path: string; body?: string }[] = [
  { name: 'List workspaces',  method: 'GET',  path: '/v1/workspaces' },
  { name: 'Get workspace',    method: 'GET',  path: '/v1/workspaces/ws_8f3a' },
  { name: 'Evaluate admission', method: 'POST', path: '/v1/admission/evaluate', body: `{\n  "workspace_id": "ws_8f3a",\n  "files": ["src/api.ts"]\n}` },
  { name: 'List webhooks',    method: 'GET',  path: '/v1/webhooks' },
];

const METHOD_TONE: Record<Method, string> = {
  GET:    'var(--intent-info-fg)',
  POST:   'var(--intent-success-fg)',
  PATCH:  'var(--intent-warn-fg)',
  DELETE: 'var(--intent-danger-fg)',
};

export default function PlaygroundPage() {
  const [method, setMethod] = useState<Method>('GET');
  const [path, setPath] = useState('/v1/workspaces');
  const [body, setBody] = useState('');
  const [response, setResponse] = useState<{ status: number; ms: number; payload: string } | null>(null);
  const [running, setRunning] = useState(false);

  const send = () => {
    setRunning(true);
    const t0 = performance.now();
    // Demo: synthesize a response after a small delay. Real version hits API.
    window.setTimeout(() => {
      const ms = Math.round(performance.now() - t0 + 12 + Math.random() * 14);
      const payload = method === 'GET' && path === '/v1/workspaces'
        ? `{\n  "data": [\n    { "id": "ws_8f3a", "name": "monorepo", "default_branch": "main" },\n    { "id": "ws_2c1d", "name": "design-system", "default_branch": "trunk" }\n  ],\n  "next_cursor": null\n}`
        : method === 'POST' && path === '/v1/admission/evaluate'
        ? `{\n  "verdict": "warn",\n  "rules_fired": ["rl_71"],\n  "evaluated_ms": ${ms}\n}`
        : `{\n  "ok": true,\n  "method": "${method}",\n  "path": "${path}"\n}`;
      setResponse({ status: method === 'POST' ? 201 : 200, ms, payload });
      setRunning(false);
    }, 280 + Math.random() * 220);
  };

  const curl = useMemo(() => {
    const lines = [`curl -X ${method} https://api.acme.dev${path}`];
    lines.push('  -H "Authorization: Bearer $ACME_TOKEN"');
    if (body.trim()) {
      lines.push('  -H "Content-Type: application/json"');
      lines.push(`  -d '${body.trim()}'`);
    }
    return lines.join(' \\\n');
  }, [method, path, body]);

  return (
    <DeveloperShell
      title="Playground"
      subtitle="Make authenticated requests against your live workspace. Requests are scoped to your current org and rate-limited as usual."
      topRight={
        <span
          className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 h-6 rounded-full"
          style={{
            background: 'var(--intent-success-bg)',
            color: 'var(--intent-success-fg)',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: 'var(--intent-success-fg)' }}
          />
          Authenticated · sk
        </span>
      }
    >
      {/* Request bar */}
      <div
        className="flex items-stretch rounded-xl overflow-hidden mb-4"
        style={{
          background: 'var(--bg-canvas)',
          border: '1px solid var(--border-default)',
        }}
      >
        <MethodPicker value={method} onChange={setMethod} />
        <input
          value={path}
          onChange={(e) => { setPath(e.target.value); }}
          spellCheck={false}
          className="flex-1 bg-transparent outline-none px-3 text-[12px] font-mono"
          style={{ color: 'var(--fg-strong)' }}
          placeholder="/v1/…"
        />
        <button
          type="button"
          onClick={send}
          disabled={running}
          className="inline-flex items-center gap-2 px-5 text-[12px] font-semibold transition-colors"
          style={{
            background: running ? 'var(--bg-active)' : 'var(--brand-vivid)',
            color: '#fff',
          }}
        >
          <Play className={`w-3.5 h-3.5 ${running ? 'animate-pulse' : ''}`} />
          {running ? 'Sending…' : 'Send'}
        </button>
      </div>

      {/* Presets */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <span className="text-[10px] uppercase tracking-[0.14em] font-semibold mr-1" style={{ color: 'var(--fg-subtle)' }}>
          Try
        </span>
        {PRESETS.map((p) => (
          <button
            key={p.name}
            type="button"
            onClick={() => {
              setMethod(p.method);
              setPath(p.path);
              setBody(p.body ?? '');
              setResponse(null);
            }}
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-medium transition-colors"
            style={{
              background: 'var(--bg-surface-muted)',
              color: 'var(--fg-muted)',
              border: '1px solid var(--border-default)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-surface-muted)'; }}
          >
            <span className="font-bold" style={{ color: METHOD_TONE[p.method] }}>{p.method}</span>
            <span>{p.name}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Body */}
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: 'var(--bg-canvas)',
            border: '1px solid var(--border-default)',
          }}
        >
          <PaneHeader title="Request body" hint={method === 'GET' || method === 'DELETE' ? 'not used for ' + method : 'JSON'} />
          <textarea
            value={body}
            onChange={(e) => { setBody(e.target.value); }}
            spellCheck={false}
            placeholder={method === 'GET' || method === 'DELETE' ? '— no body —' : '{ }'}
            disabled={method === 'GET' || method === 'DELETE'}
            className="w-full bg-transparent outline-none p-4 font-mono text-[12px] resize-none"
            style={{
              color: 'var(--fg-strong)',
              minHeight: 240,
              opacity: method === 'GET' || method === 'DELETE' ? 0.5 : 1,
            }}
          />
        </div>

        {/* Response */}
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: 'var(--bg-canvas)',
            border: '1px solid var(--border-default)',
          }}
        >
          <PaneHeader
            title="Response"
            right={response ? (
              <div className="flex items-center gap-3 text-[10px]" style={{ color: 'var(--fg-muted)' }}>
                <span className="inline-flex items-center gap-1 font-semibold" style={{ color: 'var(--intent-success-fg)' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--intent-success-fg)' }} />
                  {response.status}
                </span>
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <Clock className="w-3 h-3" />
                  {response.ms}ms
                </span>
              </div>
            ) : (
              <span className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>idle</span>
            )}
          />
          <pre
            className="font-mono text-[12px] p-4 m-0 overflow-x-auto"
            style={{ color: 'var(--fg-strong)', minHeight: 240 }}
          >
            {response?.payload ?? '// Send a request to see the response here.'}
          </pre>
        </div>
      </div>

      {/* cURL preview */}
      <div
        className="mt-4 rounded-xl overflow-hidden"
        style={{
          background: 'var(--bg-surface-muted)',
          border: '1px solid var(--border-default)',
        }}
      >
        <PaneHeader title="Equivalent cURL" right={
          <span className="inline-flex items-center gap-1 text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
            <Zap className="w-3 h-3" /> auto-generated
          </span>
        } />
        <pre
          className="font-mono text-[11px] p-4 m-0 overflow-x-auto"
          style={{ color: 'var(--fg-strong)' }}
        >
          {curl}
        </pre>
      </div>
    </DeveloperShell>
  );
}

function PaneHeader({ title, hint, right }: { title: string; hint?: string; right?: React.ReactNode }) {
  return (
    <div
      className="flex items-center justify-between px-3 h-8"
      style={{ borderBottom: '1px solid var(--border-muted)' }}
    >
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-[0.14em] font-semibold" style={{ color: 'var(--fg-subtle)' }}>
          {title}
        </span>
        {hint && (
          <span className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>· {hint}</span>
        )}
      </div>
      {right}
    </div>
  );
}

function MethodPicker({ value, onChange }: { value: Method; onChange: (m: Method) => void }) {
  const [open, setOpen] = useState(false);
  const methods: Method[] = ['GET', 'POST', 'PATCH', 'DELETE'];
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); }}
        className="inline-flex items-center gap-1.5 h-full px-4 text-[12px] font-bold tabular-nums border-r"
        style={{
          color: METHOD_TONE[value],
          borderColor: 'var(--border-muted)',
          minWidth: 96,
        }}
      >
        {value}
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>
      {open && (
        <div
          className="absolute z-10 top-full left-0 mt-1 w-32 rounded-md py-1"
          style={{
            background: 'var(--bg-canvas)',
            border: '1px solid var(--border-default)',
            boxShadow: '0 8px 24px -8px color-mix(in srgb, var(--fg-strong) 22%, transparent)',
          }}
        >
          {methods.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { onChange(m); setOpen(false); }}
              className="w-full text-left px-3 h-7 text-[11px] font-bold transition-colors"
              style={{ color: METHOD_TONE[m] }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              {m}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
