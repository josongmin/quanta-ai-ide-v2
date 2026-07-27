import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  GitBranch, Copy, Check, RefreshCw, Unplug,
  Eye, EyeOff, Key, AlertTriangle,
} from 'lucide-react';
import { GithubIcon } from '@shared/ui/brand-icons';
import { WsShell } from '../parts/WsShell';
import { Section, Row, Field, Toggle, Button } from '@shared/ui/forms';
import { ModalBackdrop, ConfirmDialog, useDialogA11y } from '@shared/ui';
import { useCopyToClipboard } from '@shared/lib';

type Host = 'github' | 'gitlab' | 'bitbucket';

type RuleId = 'pr-review' | 'status-checks' | 'force-push';
type ProtectionRule = { id: RuleId; enabled: boolean };

// Maps rule id to its i18n key under source:rules.*
const RULE_KEY: Record<RuleId, string> = {
  'pr-review': 'prReview',
  'status-checks': 'statusChecks',
  'force-push': 'forcePush',
};

const REPO_URL = 'git@github.com:acme/monorepo.git';
const PROBED_BRANCH = 'main';

export default function SourcePage() {
  const { t } = useTranslation('ws');
  const [host, setHost] = useState<Host>('github');
  const { copied, copy: copyRepoUrl } = useCopyToClipboard(1500);
  const [rules, setRules] = useState<ProtectionRule[]>([
    { id: 'pr-review',     enabled: true  },
    { id: 'status-checks', enabled: true  },
    { id: 'force-push',    enabled: false },
  ]);
  const [revealOpen, setRevealOpen] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const toggleRule = (id: RuleId) => {
    setRules((all) => all.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  };

  return (
    <WsShell
      orgName="ACME, Inc."
      orgSlug="acme"
      wsName="monorepo"
      wsSlug="monorepo"
      title={t('source.title')}
      subtitle={t('source.subtitle')}
    >
      <Section
        title={t('source.gitHost.title')}
        hint={t('source.gitHost.hint')}
      >
        <div className="grid grid-cols-3 gap-2">
          <HostCard
            id="github"
            label={t('source.host.github')}
            active={host === 'github'}
            onClick={() => { setHost('github'); }}
          />
          <HostCard
            id="gitlab"
            label={t('source.host.gitlab')}
            active={host === 'gitlab'}
            onClick={() => { setHost('gitlab'); }}
          />
          <HostCard
            id="bitbucket"
            label={t('source.host.bitbucket')}
            active={host === 'bitbucket'}
            onClick={() => { setHost('bitbucket'); }}
          />
        </div>

        <Row label={t('source.connection.label')} sub={t('source.connection.sub')}>
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>
              {t('source.connectedAs')} <span style={{ color: 'var(--fg-strong)' }}>@sora-kim</span> · 2026-04-12
            </span>
            <Button leading={<RefreshCw className="w-3 h-3" />}>{t('source.reconnect')}</Button>
            <Button variant="ghost" leading={<Unplug className="w-3 h-3" />} onClick={() => { setConfirmDisconnect(true); }}>
              {t('source.disconnect')}
            </Button>
          </div>
        </Row>
      </Section>

      <Section title={t('source.repository.title')} hint={t('source.repository.hint')}>
        <Field
          label={t('source.repoUrl')}
          value={REPO_URL}
          readOnly
          trailing={
            <button
              type="button"
              onClick={() => { copyRepoUrl(REPO_URL); }}
              className="inline-flex items-center gap-1 h-6 px-2 rounded text-sm font-medium"
              style={{
                background: copied ? 'var(--intent-success-bg)' : 'var(--bg-surface-muted)',
                color: copied ? 'var(--intent-success-fg)' : 'var(--fg-default)',
                border: `1px solid ${copied ? 'var(--intent-success-fg)' : 'var(--border-default)'}`,
              }}
              aria-label={t('source.copyRepoUrlAria')}
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? t('source.copied') : t('source.copy')}
            </button>
          }
        />

        <Row label={t('source.defaultBranch.label')} sub={t('source.defaultBranch.sub')}>
          <span
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-sm font-mono tabular-nums"
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

      <Section title={t('source.branchProtection.title')} hint={t('source.branchProtection.hint')}>
        <div
          className="rounded-md overflow-hidden"
          style={{ border: '1px solid var(--border-muted)' }}
        >
          <div
            className="grid items-center px-3 h-9 text-xs uppercase tracking-eyebrow font-semibold"
            style={{
              gridTemplateColumns: '1fr 80px',
              gap: 12,
              background: 'var(--bg-surface-muted)',
              color: 'var(--fg-subtle)',
              borderBottom: '1px solid var(--border-muted)',
            }}
          >
            <span>{t('source.colRule')}</span>
            <span className="text-right">{t('source.colEnabled')}</span>
          </div>
          {rules.map((r, i) => {
            const label = t(`source.rules.${RULE_KEY[r.id]}.label`);
            return (
            <div
              key={r.id}
              role="row"
              className="grid items-center px-3 py-2.5 text-base transition-colors"
              style={{
                gridTemplateColumns: '1fr 80px',
                gap: 12,
                borderTop: i === 0 ? 'none' : '1px solid var(--border-muted)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="font-medium" style={{ color: 'var(--fg-strong)' }}>{label}</span>
                <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>{t(`source.rules.${RULE_KEY[r.id]}.sub`)}</span>
              </div>
              <div className="flex justify-end">
                <Toggle checked={r.enabled} onChange={() => { toggleRule(r.id); }} label={label} />
              </div>
            </div>
            );
          })}
        </div>
      </Section>

      <Section
        title={t('source.signingSecret.title')}
        hint={t('source.signingSecret.hint')}
      >
        <Row
          label={t('source.signingSecretRow.label')}
          sub={t('source.signingSecretRow.sub')}
        >
          <Button leading={<Key className="w-3 h-3" />} onClick={() => { setRevealOpen(true); }}>
            {t('source.generateReveal')}
          </Button>
        </Row>
      </Section>

      {revealOpen && <RevealSecretModal onClose={() => { setRevealOpen(false); }} />}
      {confirmDisconnect && (
        <ConfirmDialog
          open
          onCancel={() => { setConfirmDisconnect(false); }}
          onConfirm={() => { setConfirmDisconnect(false); }}
          title={t('source.disconnectDialog.title')}
          confirmLabel={t('source.disconnectDialog.confirm')}
          width={440}
          icon={<AlertTriangle className="w-4 h-4" style={{ color: 'var(--intent-warn-fg)' }} />}
          description={t('source.disconnectDialog.description')}
        />
      )}
    </WsShell>
  );
}

function HostCard({
  id, label, active, onClick,
}: { id: Host; label: string; active: boolean; onClick: () => void }) {
  const { t } = useTranslation('ws');
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
          <span className="text-xs font-bold tracking-wide">{label.slice(0, 2).toUpperCase()}</span>
        )}
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-base font-semibold">{label}</span>
        <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>
          {active ? t('source.hostConnected') : t('source.hostSwitchTo', { label })}
        </span>
      </div>
    </button>
  );
}

function RevealSecretModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('ws');
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
  const { copied, copy } = useCopyToClipboard(1500);

  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogA11y(dialogRef, true, onClose);
  return (
    <>
      <ModalBackdrop onClick={onClose} z="z-40" alpha={0.45} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('source.revealModal.aria')}
        tabIndex={-1}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[520px] rounded-lg overflow-hidden outline-none"
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
              <h3 className="text-lg font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
                {t('source.revealModal.title')}
              </h3>
              <p className="text-base leading-snug" style={{ color: 'var(--fg-muted)' }}>
                <span className="font-semibold">{t('source.revealModal.onlyTimeStrong')}</span>{' '}
                {t('source.revealModal.body')}
              </p>
            </div>
          </div>

          <div
            className="flex items-center gap-2 p-2 rounded-md font-mono text-sm tabular-nums"
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
              aria-label={shown ? t('source.revealModal.hide') : t('source.revealModal.show')}
            >
              {shown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => { copy(secret); }}
              className="inline-flex items-center gap-1 h-7 px-2 rounded text-sm font-medium"
              style={{
                background: copied ? 'var(--intent-success-bg)' : 'var(--bg-surface-muted)',
                color: copied ? 'var(--intent-success-fg)' : 'var(--fg-default)',
                border: `1px solid ${copied ? 'var(--intent-success-fg)' : 'var(--border-default)'}`,
              }}
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? t('source.copied') : t('source.copy')}
            </button>
          </div>
        </div>

        <div
          className="flex items-center justify-end gap-2 px-4 py-3"
          style={{ borderTop: '1px solid var(--border-muted)', background: 'var(--bg-surface-muted)' }}
        >
          <Button variant="primary" size="md" onClick={onClose}>{t('source.revealModal.saved')}</Button>
        </div>
      </div>
    </>
  );
}

