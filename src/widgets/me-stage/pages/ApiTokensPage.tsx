import { useMemo, useState } from 'react';
import {
  Plus, Key, Copy, Check, Eye, EyeOff, Trash2, AlertTriangle, Terminal,
  ExternalLink,
} from 'lucide-react';
import { MeShell } from '../parts/MeShell';
import { Section, Field, Button, Checkbox } from '@shared/ui/forms';

type ScopeId =
  | 'read:repo' | 'write:repo'
  | 'read:investigations' | 'write:investigations'
  | 'read:reviews' | 'write:reviews'
  | 'admin:org' | 'admin:billing'
  | 'agents:run';

type Scope = { id: ScopeId; label: string; sub: string; danger?: boolean };

const SCOPE_GROUPS: { title: string; scopes: Scope[] }[] = [
  {
    title: 'Repository',
    scopes: [
      { id: 'read:repo',  label: 'read:repo',  sub: 'Read repos, files, blame, branches' },
      { id: 'write:repo', label: 'write:repo', sub: 'Open PRs, push branches, create commits', danger: true },
    ],
  },
  {
    title: 'Investigations & reviews',
    scopes: [
      { id: 'read:investigations',  label: 'read:investigations',  sub: 'Read investigation history, evidence' },
      { id: 'write:investigations', label: 'write:investigations', sub: 'Create new investigations and add evidence' },
      { id: 'read:reviews',         label: 'read:reviews',         sub: 'Read PR reviews, comments, conversations' },
      { id: 'write:reviews',        label: 'write:reviews',        sub: 'Post comments and approvals' },
    ],
  },
  {
    title: 'Agents',
    scopes: [
      { id: 'agents:run', label: 'agents:run', sub: 'Trigger AI agents on your behalf', danger: true },
    ],
  },
  {
    title: 'Admin',
    scopes: [
      { id: 'admin:org',     label: 'admin:org',     sub: 'Manage members, teams, policies', danger: true },
      { id: 'admin:billing', label: 'admin:billing', sub: 'View invoices and change plan',   danger: true },
    ],
  },
];

const ALL_SCOPES = SCOPE_GROUPS.flatMap((g) => g.scopes);

type Token = {
  id: string;
  name: string;
  scopes: ScopeId[];
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  prefix: string;            // visible portion, e.g. "sef_a82f"
};

const INITIAL_TOKENS: Token[] = [
  { id: 't1', name: 'CI · gh-actions',     scopes: ['read:repo', 'read:reviews', 'write:reviews'], createdAt: '2025-09-12', expiresAt: '2026-09-12', lastUsedAt: '4 minutes ago', prefix: 'sef_a82f' },
  { id: 't2', name: 'Local CLI · MacBook', scopes: ['read:repo', 'read:investigations'],            createdAt: '2025-11-04', expiresAt: null,         lastUsedAt: '2 hours ago',   prefix: 'sef_19q3' },
  { id: 't3', name: 'review-bot · Slack',  scopes: ['read:reviews'],                                 createdAt: '2026-02-19', expiresAt: '2026-08-19', lastUsedAt: '3 days ago',    prefix: 'sef_x7lm' },
  { id: 't4', name: 'old laptop · DELETED soon', scopes: ['read:repo'],                              createdAt: '2024-12-02', expiresAt: '2025-12-02', lastUsedAt: 'Never',         prefix: 'sef_unus' },
];

export default function ApiTokensPage() {
  const [tokens, setTokens] = useState<Token[]>(INITIAL_TOKENS);
  const [creating, setCreating] = useState(false);
  const [revealed, setRevealed] = useState<Token | null>(null);
  const [removing, setRemoving] = useState<Token | null>(null);

  return (
    <MeShell
      title="API tokens"
      subtitle="Personal access tokens (PATs) authenticate scripts, CLIs, and integrations as you. Treat them like passwords."
      topRight={
        <Button variant="primary" size="md" leading={<Plus className="w-3.5 h-3.5" />} onClick={() => { setCreating(true); }}>
          New token
        </Button>
      }
    >
      <Section
        title="Active tokens"
        hint={`${tokens.length} of 25 tokens used. Tokens you haven't used in 90 days are flagged.`}
      >
        <TokenList
          tokens={tokens}
          onRemove={(t) => { setRemoving(t); }}
        />
      </Section>

      <Section
        title="Using your tokens"
        hint="Pass the token as a Bearer header. We log every request — see Audit log for details."
      >
        <CodeSamples />
      </Section>

      {creating && (
        <CreateModal
          onClose={() => { setCreating(false); }}
          onCreate={(t) => {
            setTokens((all) => [t, ...all]);
            setCreating(false);
            setRevealed(t);
          }}
        />
      )}
      {revealed && <RevealModal token={revealed} onClose={() => { setRevealed(null); }} />}
      {removing && (
        <RevokeModal
          token={removing}
          onClose={() => { setRemoving(null); }}
          onConfirm={() => {
            setTokens((all) => all.filter((t) => t.id !== removing.id));
            setRemoving(null);
          }}
        />
      )}
    </MeShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Token list

function TokenList({ tokens, onRemove }: { tokens: Token[]; onRemove: (t: Token) => void }) {
  if (tokens.length === 0) {
    return (
      <div
        className="flex flex-col items-center gap-2 py-10 rounded-md"
        style={{
          background: 'var(--bg-surface-muted)',
          border: '1px dashed var(--border-default)',
        }}
      >
        <Key className="w-5 h-5" style={{ color: 'var(--fg-subtle)' }} />
        <span className="text-[12px]" style={{ color: 'var(--fg-muted)' }}>
          No tokens yet. Create one to use the API.
        </span>
      </div>
    );
  }
  return (
    <div className="flex flex-col rounded-md overflow-hidden"
      style={{ border: '1px solid var(--border-muted)' }}
    >
      {tokens.map((t, i) => (
        <TokenRow key={t.id} token={t} top={i === 0} onRemove={() => { onRemove(t); }} />
      ))}
    </div>
  );
}

function TokenRow({ token, top, onRemove }: { token: Token; top: boolean; onRemove: () => void }) {
  const stale = token.lastUsedAt === 'Never';
  const expired = token.expiresAt && new Date(token.expiresAt) < new Date('2026-05-10');
  return (
    <div
      className="flex items-start gap-3 px-3 py-3"
      style={{
        background: 'var(--bg-canvas)',
        borderTop: top ? 'none' : '1px solid var(--border-muted)',
      }}
    >
      <span
        className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
        style={{
          background: stale || expired ? 'var(--intent-warn-bg)' : 'var(--bg-surface-muted)',
          border: `1px solid ${stale || expired ? 'var(--intent-warn-fg)' : 'var(--border-muted)'}`,
        }}
      >
        <Key className="w-4 h-4" style={{ color: stale || expired ? 'var(--intent-warn-fg)' : 'var(--fg-muted)' }} />
      </span>

      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>
            {token.name}
          </span>
          <code className="font-mono text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
            {token.prefix}…{Array.from({ length: 24 }, () => '•').join('')}
          </code>
          {(stale || expired) && (
            <span
              className="text-[8px] uppercase tracking-[0.14em] font-semibold px-1.5 py-0.5 rounded"
              style={{
                background: 'var(--intent-warn-bg)',
                color: 'var(--intent-warn-fg)',
                border: '1px solid var(--intent-warn-fg)',
              }}
            >
              {expired ? 'Expired' : 'Unused'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5 text-[10px] mt-0.5" style={{ color: 'var(--fg-subtle)' }}>
          <span>Created {token.createdAt}</span>
          {token.expiresAt && <span>· Expires {token.expiresAt}</span>}
          {!token.expiresAt && <span style={{ color: 'var(--intent-warn-fg)' }}>· Never expires</span>}
          <span>· Last used {token.lastUsedAt}</span>
        </div>

        <ScopeChips scopes={token.scopes} />
      </div>

      <Button variant="ghost" onClick={onRemove}>
        <Trash2 className="w-3 h-3" />
        Revoke
      </Button>
    </div>
  );
}

function ScopeChips({ scopes }: { scopes: ScopeId[] }) {
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {scopes.map((s) => {
        const meta = ALL_SCOPES.find((x) => x.id === s);
        const dangerous = meta?.danger;
        return (
          <span
            key={s}
            className="inline-flex items-center text-[9px] font-mono px-1.5 py-0.5 rounded"
            style={{
              background: dangerous ? 'var(--intent-warn-bg)' : 'var(--bg-surface-muted)',
              color: dangerous ? 'var(--intent-warn-fg)' : 'var(--fg-muted)',
              border: `1px solid ${dangerous ? 'var(--intent-warn-fg)' : 'var(--border-muted)'}`,
            }}
          >
            {s}
          </span>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Create modal — pick name, expiry, scopes

function CreateModal({
  onClose, onCreate,
}: { onClose: () => void; onCreate: (t: Token) => void }) {
  const [name, setName] = useState('');
  const [expiresIn, setExpiresIn] = useState<'30' | '60' | '90' | '365' | 'never'>('90');
  const [scopes, setScopes] = useState<Set<ScopeId>>(new Set(['read:repo']));

  const valid = name.trim().length > 0 && scopes.size > 0;
  const dangerScopes = ALL_SCOPES.filter((s) => scopes.has(s.id) && s.danger);

  const create = () => {
    if (!valid) return;
    const expiresAt = expiresIn === 'never' ? null
      : new Date(Date.now() + Number(expiresIn) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const prefix = `sef_${Math.random().toString(36).slice(2, 6)}`;
    const token: Token = {
      id: `t_${Date.now()}`,
      name: name.trim(),
      scopes: Array.from(scopes),
      createdAt: new Date().toISOString().slice(0, 10),
      expiresAt,
      lastUsedAt: 'Never',
      prefix,
    };
    onCreate(token);
  };

  const toggleScope = (id: ScopeId) => {
    setScopes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 popover-backdrop-in"
      style={{ background: 'var(--bg-scrim)' }}
    >
      <div
        className="w-full max-w-[520px] max-h-[90vh] rounded-md p-5 popover-panel-in flex flex-col gap-4 overflow-y-auto"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <h3 className="text-[14px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
          New personal access token
        </h3>

        <Field
          label="Name"
          value={name}
          onChange={(e) => { setName(e.target.value); }}
          placeholder='e.g. "ci · gh-actions"'
          autoFocus
          hint="Help your future self remember what this token is for."
        />

        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-[10px] uppercase tracking-[0.14em] font-medium pb-1" style={{ color: 'var(--fg-subtle)' }}>
            Expiration
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {(['30', '60', '90', '365', 'never'] as const).map((d) => {
              const active = expiresIn === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => { setExpiresIn(d); }}
                  className="h-7 px-2.5 rounded-md text-[11px] font-medium transition-colors"
                  style={{
                    background: active ? 'var(--bg-active)' : 'var(--bg-surface-muted)',
                    color: active ? 'var(--fg-strong)' : 'var(--fg-default)',
                    border: `1px solid ${active ? 'var(--brand-vivid)' : 'var(--border-muted)'}`,
                  }}
                >
                  {d === 'never' ? 'Never (not recommended)' : `${d} days`}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-[10px] uppercase tracking-[0.14em] font-medium" style={{ color: 'var(--fg-subtle)' }}>
            Scopes
          </legend>
          <div className="flex flex-col gap-3">
            {SCOPE_GROUPS.map((g) => (
              <div key={g.title} className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--fg-muted)' }}>
                  {g.title}
                </span>
                {g.scopes.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-start gap-2.5 cursor-pointer px-2.5 py-1.5 rounded-md transition-colors"
                    style={{
                      background: scopes.has(s.id) ? 'var(--bg-active)' : 'transparent',
                    }}
                  >
                    <Checkbox
                      checked={scopes.has(s.id)}
                      onChange={() => { toggleScope(s.id); }}
                      label={s.id}
                    />
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <code
                          className="text-[11px] font-mono"
                          style={{ color: s.danger ? 'var(--intent-warn-fg)' : 'var(--fg-strong)' }}
                        >
                          {s.label}
                        </code>
                        {s.danger && (
                          <span
                            className="text-[8px] uppercase tracking-[0.14em] font-semibold px-1 py-0.5 rounded"
                            style={{
                              background: 'var(--intent-warn-bg)',
                              color: 'var(--intent-warn-fg)',
                            }}
                          >
                            destructive
                          </span>
                        )}
                      </div>
                      <span className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
                        {s.sub}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            ))}
          </div>
        </fieldset>

        {dangerScopes.length > 0 && (
          <div
            className="flex items-start gap-2 px-2.5 py-2 rounded text-[11px] onb-stagger"
            style={{
              background: 'var(--intent-warn-bg)',
              border: '1px solid var(--intent-warn-fg)',
            }}
          >
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'var(--intent-warn-fg)' }} />
            <span style={{ color: 'var(--fg-strong)' }}>
              You&apos;re about to grant {dangerScopes.length} destructive scope{dangerScopes.length === 1 ? '' : 's'}.
              Anyone holding this token can act with these permissions.
            </span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="ghost" size="md" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="md" onClick={create} disabled={!valid}>
            Generate token
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Reveal modal — show the token ONCE and let the user copy it

function RevealModal({ token, onClose }: { token: Token; onClose: () => void }) {
  const fullToken = useMemo(() => {
    // Demo: deterministic-ish full token. Real systems hash + only show on creation.
    const seedRef = { s: 0 };
    for (let i = 0; i < token.prefix.length; i++) {
      seedRef.s = (seedRef.s * 31 + token.prefix.charCodeAt(i)) >>> 0;
    }
    const rand = () => {
      seedRef.s = (seedRef.s * 9301 + 49297) % 233280;
      return seedRef.s / 233280;
    };
    const tail = Array.from({ length: 32 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(rand() * 36)]).join('');
    return `${token.prefix}${tail}`;
  }, [token.prefix]);
  const [shown, setShown] = useState(true);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try { await navigator.clipboard.writeText(fullToken); setCopied(true); setTimeout(() => { setCopied(false); }, 1500); }
    catch { /* ignore */ }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 popover-backdrop-in"
      style={{ background: 'var(--bg-scrim)' }}
    >
      <div
        className="w-full max-w-[520px] rounded-md p-5 popover-panel-in flex flex-col gap-4"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--brand-vivid)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'var(--brand-bg)' }}
          >
            <Key className="w-4 h-4" style={{ color: 'var(--brand-fg)' }} />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-[14px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
              Save your new token
            </h3>
            <p className="text-[12px] leading-snug" style={{ color: 'var(--fg-muted)' }}>
              <span className="font-semibold">This is the only time we&apos;ll show it.</span>{' '}
              Once you close this dialog, only the prefix is visible.
            </p>
          </div>
        </div>

        <div
          className="flex items-center gap-2 p-2 rounded-md font-mono text-[11px] tabular-nums"
          style={{
            background: 'var(--bg-canvas)',
            border: '1px solid var(--border-default)',
          }}
        >
          <code className="flex-1 truncate" style={{ color: 'var(--fg-strong)' }}>
            {shown ? fullToken : `${token.prefix}${'•'.repeat(28)}`}
          </code>
          <button
            type="button"
            onClick={() => { setShown((v) => !v); }}
            className="p-1 rounded transition-colors"
            style={{ color: 'var(--fg-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-active)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            aria-label={shown ? 'Hide' : 'Show'}
          >
            {shown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => { void copy(); }}
            className="inline-flex items-center gap-1 h-7 px-2 rounded text-[11px] font-medium transition-colors"
            style={{
              background: copied ? 'var(--intent-success-bg)' : 'var(--bg-surface-muted)',
              color: copied ? 'var(--intent-success-fg)' : 'var(--fg-default)',
              border: `1px solid ${copied ? 'var(--intent-success-fg)' : 'var(--border-default)'}`,
            }}
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <div className="flex flex-col gap-1 text-[11px]" style={{ color: 'var(--fg-muted)' }}>
          <div><span style={{ color: 'var(--fg-strong)' }}>{token.name}</span> · {token.scopes.length} scope{token.scopes.length === 1 ? '' : 's'}</div>
          <div>Expires {token.expiresAt ?? 'never'}</div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="primary" size="md" onClick={onClose}>I&apos;ve saved it</Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Code samples

function CodeSamples() {
  const [tab, setTab] = useState<'curl' | 'js' | 'python'>('curl');

  const sample =
    tab === 'curl' ? `curl https://api.se-field.app/v1/me \\
  -H "Authorization: Bearer sef_xxx_yourtoken"`
    : tab === 'js' ? `import { SeField } from "@se-field/sdk";

const client = new SeField({ token: process.env.SEFIELD_TOKEN });
const me = await client.me();`
    : `from sefield import Client

client = Client(token=os.environ["SEFIELD_TOKEN"])
me = client.me()`;

  return (
    <div
      className="rounded-md overflow-hidden"
      style={{ border: '1px solid var(--border-default)' }}
    >
      <div
        className="flex items-center gap-1 px-2.5 py-1.5"
        style={{ background: 'var(--bg-surface-muted)', borderBottom: '1px solid var(--border-muted)' }}
      >
        <Terminal className="w-3 h-3" style={{ color: 'var(--fg-muted)' }} />
        {(['curl', 'js', 'python'] as const).map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => { setTab(t); }}
              className="h-6 px-2 rounded text-[10px] font-medium font-mono"
              style={{
                background: active ? 'var(--bg-canvas)' : 'transparent',
                color: active ? 'var(--fg-strong)' : 'var(--fg-muted)',
                boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              {t === 'js' ? 'TypeScript' : t === 'curl' ? 'cURL' : 'Python'}
            </button>
          );
        })}
        <span className="flex-1" />
        <button type="button" className="text-[10px] inline-flex items-center gap-1 bg-transparent border-0 p-0 cursor-pointer" style={{ color: 'var(--fg-link)', font: 'inherit' }}>
          API docs <ExternalLink className="w-2.5 h-2.5" />
        </button>
      </div>
      <pre
        className="p-3 text-[11px] font-mono overflow-x-auto"
        style={{ background: 'var(--bg-canvas)', color: 'var(--fg-default)' }}
      >
        <code>{sample}</code>
      </pre>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Revoke modal

function RevokeModal({
  token, onClose, onConfirm,
}: { token: Token; onClose: () => void; onConfirm: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 popover-backdrop-in"
      style={{ background: 'var(--bg-scrim)' }}
    >
      <div
        className="w-full max-w-[420px] rounded-md p-5 popover-panel-in flex flex-col gap-4"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--intent-danger-fg)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'var(--intent-danger-bg)' }}
          >
            <Trash2 className="w-4 h-4" style={{ color: 'var(--intent-danger-fg)' }} />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-[14px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
              Revoke &quot;{token.name}&quot;?
            </h3>
            <p className="text-[12px] leading-snug" style={{ color: 'var(--fg-muted)' }}>
              Any script, CLI, or integration using this token will start failing immediately.
              We&apos;ll log the revocation in your audit trail.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="ghost" size="md" onClick={onClose}>Cancel</Button>
          <Button variant="danger" size="md" onClick={onConfirm}>
            Revoke token
          </Button>
        </div>
      </div>
    </div>
  );
}
