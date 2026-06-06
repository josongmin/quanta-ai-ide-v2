import { useMemo, useState } from 'react';
import {
  GitBranch, Copy, Check, RefreshCw, Unplug,
  Eye, EyeOff, Key, AlertTriangle,
} from 'lucide-react';
import { GithubIcon } from '@shared/ui/brand-icons';
import { WsShell } from '../parts/WsShell';
import { Section, Row, Field, Toggle, Button } from '@shared/ui/forms';
import { ModalBackdrop } from '@shared/ui';

type Host = 'github' | 'gitlab' | 'bitbucket';

type ProtectionRule = {
  id: 'pr-review' | 'status-checks' | 'force-push';
  label: string;
  sub: string;
  enabled: boolean;
};

const REPO_URL = 'git@github.com:acme/monorepo.git';
const PROBED_BRANCH = 'main';

export default function SourcePage() {
  const [host, setHost] = useState<Host>('github');
  const [copied, setCopied] = useState(false);
  const [rules, setRules] = useState<ProtectionRule[]>([
    { id: 'pr-review',     label: 'Require pull-request review', sub: 'At least one approving review before merge.',          enabled: true  },
    { id: 'status-checks', label: 'Require status checks',       sub: 'CI must pass on the merge commit.',                    enabled: true  },
    { id: 'force-push',    label: 'Restrict force push',         sub: 'Block force pushes to the default branch.',            enabled: false },
  ]);
  const [revealOpen, setRevealOpen] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const copyRepo = async () => {
    try { await navigator.clipboard.writeText(REPO_URL); } catch { /* noop */ }
    setCopied(true);
    setTimeout(() => { setCopied(false); }, 1500);
  };

  const toggleRule = (id: ProtectionRule['id']) => {
    setRules((all) => all.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  };

  return (
    <WsShell
      orgName="ACME, Inc."
      orgSlug="acme"
      wsName="monorepo"
      wsSlug="monorepo"
      title="Source connection"
      subtitle="Where this workspace pulls code from and how protected branches behave."
    >
      <Section
        title="Git host"
        hint="Pick where the repository lives. Switching providers requires re-auth."
      >
        <div className="grid grid-cols-3 gap-2">
          <HostCard
            id="github"
            label="GitHub"
            active={host === 'github'}
            onClick={() => { setHost('github'); }}
          />
          <HostCard
            id="gitlab"
            label="GitLab"
            active={host === 'gitlab'}
            onClick={() => { setHost('gitlab'); }}
          />
          <HostCard
            id="bitbucket"
            label="Bitbucket"
            active={host === 'bitbucket'}
            onClick={() => { setHost('bitbucket'); }}
          />
        </div>

        <Row label="Connection" sub="The user that authorized access to this repository.">
          <div className="flex items-center gap-2">
            <span className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>
              Connected as <span style={{ color: 'var(--fg-strong)' }}>@sora-kim</span> · 2026-04-12
            </span>
            <Button leading={<RefreshCw className="w-3 h-3" />}>Reconnect</Button>
            <Button variant="ghost" leading={<Unplug className="w-3 h-3" />} onClick={() => { setConfirmDisconnect(true); }}>
              Disconnect
            </Button>
          </div>
        </Row>
      </Section>

      <Section title="Repository" hint="Read-only — change by reconnecting to a different repo.">
        <Field
          label="Repo URL"
          value={REPO_URL}
          readOnly
          trailing={
            <button
              type="button"
              onClick={() => { void copyRepo(); }}
              className="inline-flex items-center gap-1 h-6 px-2 rounded text-[11px] font-medium"
              style={{
                background: copied ? 'var(--intent-success-bg)' : 'var(--bg-surface-muted)',
                color: copied ? 'var(--intent-success-fg)' : 'var(--fg-default)',
                border: `1px solid ${copied ? 'var(--intent-success-fg)' : 'var(--border-default)'}`,
              }}
              aria-label="Copy repo URL"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          }
        />

        <Row label="Default branch" sub="Probed from the remote on every reconnect.">
          <span
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] font-mono tabular-nums"
            style={{
              background: 'var(--bg-surface-muted)',
              border: '1px solid var(--border-muted)',
              color: 'var(--fg-strong)',
            }}
          >
            <GitBranch className="w-3 h-3" style={{ color: 'var(--fg-subtle)' }} />
            {PROBED_BRANCH}
          </span>
        </Row>
      </Section>

      <Section title="Branch protection" hint="Rules enforced on the default branch via the host.">
        <div
          className="rounded-md overflow-hidden"
          style={{ border: '1px solid var(--border-muted)' }}
        >
          <div
            className="grid items-center px-3 h-9 text-[10px] uppercase tracking-[0.14em] font-semibold"
            style={{
              gridTemplateColumns: '1fr 80px',
              gap: 12,
              background: 'var(--bg-surface-muted)',
              color: 'var(--fg-subtle)',
              borderBottom: '1px solid var(--border-muted)',
            }}
          >
            <span>Rule</span>
            <span className="text-right">Enabled</span>
          </div>
          {rules.map((r, i) => (
            <div
              key={r.id}
              role="row"
              className="grid items-center px-3 py-2.5 text-[12px] transition-colors"
              style={{
                gridTemplateColumns: '1fr 80px',
                gap: 12,
                borderTop: i === 0 ? 'none' : '1px solid var(--border-muted)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="font-medium" style={{ color: 'var(--fg-strong)' }}>{r.label}</span>
                <span className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>{r.sub}</span>
              </div>
              <div className="flex justify-end">
                <Toggle checked={r.enabled} onChange={() => { toggleRule(r.id); }} label={r.label} />
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Webhook signing secret"
        hint="Used to verify webhook payloads from the host. Rotating invalidates the previous secret."
      >
        <Row
          label="Signing secret"
          sub="Shown once at generation time. Store it in a secret manager."
        >
          <Button leading={<Key className="w-3 h-3" />} onClick={() => { setRevealOpen(true); }}>
            Generate &amp; reveal
          </Button>
        </Row>
      </Section>

      {revealOpen && <RevealSecretModal onClose={() => { setRevealOpen(false); }} />}
      {confirmDisconnect && (
        <ConfirmDisconnect
          onCancel={() => { setConfirmDisconnect(false); }}
          onConfirm={() => { setConfirmDisconnect(false); }}
        />
      )}
    </WsShell>
  );
}

function HostCard({
  id, label, active, onClick,
}: { id: Host; label: string; active: boolean; onClick: () => void }) {
  const Logo = id === 'github' ? GithubIcon : null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-start gap-2 p-3 rounded-md text-left transition-colors"
      style={{
        background: active ? 'color-mix(in srgb, var(--fg-accent) 14%, transparent)' : 'var(--bg-surface-muted)',
        border: `1px solid ${active ? 'var(--fg-accent)' : 'var(--border-muted)'}`,
        color: 'var(--fg-strong)',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg-hover)'; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg-surface-muted)'; }}
    >
      <div
        className="w-8 h-8 rounded-md flex items-center justify-center"
        style={{
          background: active ? 'var(--fg-accent)' : 'var(--bg-canvas)',
          color: active ? 'var(--bg-canvas)' : 'var(--fg-default)',
          border: `1px solid ${active ? 'var(--fg-accent)' : 'var(--border-muted)'}`,
        }}
      >
        {Logo ? (
          <Logo className="w-4 h-4" />
        ) : (
          <span className="text-[10px] font-bold tracking-wide">{label.slice(0, 2).toUpperCase()}</span>
        )}
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-[12px] font-semibold">{label}</span>
        <span className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
          {active ? 'Connected' : 'Switch to ' + label}
        </span>
      </div>
    </button>
  );
}

function RevealSecretModal({ onClose }: { onClose: () => void }) {
  const secret = useMemo(() => {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const tail = Array.from({ length: 40 }, (_, i) => {
      const a = ((0x9e3779b9 ^ (i + 1)) * 0x85ebca6b) >>> 0;
      const b = (a ^ (a >>> 13)) >>> 0;
      return alphabet[b % 36];
    }).join('');
    return `whsec_${tail}`;
  }, []);
  const [shown, setShown] = useState(true);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try { await navigator.clipboard.writeText(secret); } catch { /* noop */ }
    setCopied(true);
    setTimeout(() => { setCopied(false); }, 1500);
  };

  return (
    <>
      <ModalBackdrop onClick={onClose} z="z-40" alpha={0.45} />
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[520px] rounded-lg overflow-hidden"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-md)' }}
      >
        <div className="p-5 flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'color-mix(in srgb, var(--fg-accent) 14%, transparent)' }}
            >
              <Key className="w-4 h-4" style={{ color: 'var(--fg-accent)' }} />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-[14px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
                Save your signing secret
              </h3>
              <p className="text-[12px] leading-snug" style={{ color: 'var(--fg-muted)' }}>
                <span className="font-semibold">This is the only time we&apos;ll show it.</span>{' '}
                After you close this dialog, the secret cannot be retrieved.
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
              {shown ? secret : `whsec_${'•'.repeat(34)}`}
            </code>
            <button
              type="button"
              onClick={() => { setShown((v) => !v); }}
              className="p-1 rounded transition-colors"
              style={{ color: 'var(--fg-muted)' }}
              aria-label={shown ? 'Hide' : 'Show'}
            >
              {shown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => { void copy(); }}
              className="inline-flex items-center gap-1 h-7 px-2 rounded text-[11px] font-medium"
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
        </div>

        <div
          className="flex items-center justify-end gap-2 px-4 py-3"
          style={{ borderTop: '1px solid var(--border-muted)', background: 'var(--bg-surface-muted)' }}
        >
          <Button variant="primary" size="md" onClick={onClose}>I&apos;ve saved it</Button>
        </div>
      </div>
    </>
  );
}

function ConfirmDisconnect({
  onCancel, onConfirm,
}: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <>
      <ModalBackdrop onClick={onCancel} z="z-40" alpha={0.45} />
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[440px] rounded-lg overflow-hidden"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-md)' }}
      >
        <div className="p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" style={{ color: 'var(--intent-warn-fg)' }} />
            <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>
              Disconnect source?
            </span>
          </div>
          <p className="text-[12px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
            Pipelines for this workspace will pause until a new source is connected. Existing
            history is preserved.
          </p>
        </div>
        <div
          className="flex items-center justify-end gap-2 px-4 py-3"
          style={{ borderTop: '1px solid var(--border-muted)', background: 'var(--bg-surface-muted)' }}
        >
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" size="md" onClick={onConfirm}>Disconnect</Button>
        </div>
      </div>
    </>
  );
}
