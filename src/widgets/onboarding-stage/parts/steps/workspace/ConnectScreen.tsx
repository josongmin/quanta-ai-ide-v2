import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Minus } from 'lucide-react';
import { GithubIcon } from '@shared/ui/brand-icons';
import { OAuthRedirectOverlay } from '@widgets/auth-stage';
import type { WizardData } from '../../wizard';
import type { WorkspaceStepProps } from './types';
import { providerLabel } from './data';
import { GitLabMark, BitbucketMark } from './ProviderMarks';

// Pre-connect: pick provider + redirect.
export function ConnectScreen({ value, onChange }: WorkspaceStepProps) {
  const { t } = useTranslation('onboarding');
  const [oauth, setOauth] = useState<null | 'github' | 'gitlab' | 'bitbucket' | 'google'>(null);

  const providers: { id: 'github' | 'gitlab' | 'bitbucket'; label: string; icon: React.ReactNode; perm: string }[] = [
    { id: 'github',    label: 'GitHub',     icon: <GithubIcon className="w-4 h-4" />, perm: t('workspace.connect.githubPerm') },
    { id: 'gitlab',    label: 'GitLab',     icon: <GitLabMark />,                  perm: t('workspace.connect.gitlabPerm') },
    { id: 'bitbucket', label: 'Bitbucket',  icon: <BitbucketMark />,               perm: t('workspace.connect.bitbucketPerm') },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-3 gap-2">
        {providers.map((p) => {
          const active = value.provider === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => { onChange({ ...value, provider: p.id }); }}
              className="flex flex-col items-start gap-1.5 p-4 rounded-md text-left transition-colors"
              style={{
                background: active ? 'var(--bg-active)' : 'var(--bg-surface-muted)',
                border: `1px solid ${active ? 'var(--fg-accent)' : 'var(--border-muted)'}`,
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg-surface-muted)'; }}
            >
              <div className="flex items-center gap-2">
                <span style={{ color: active ? 'var(--fg-strong)' : 'var(--fg-default)' }}>{p.icon}</span>
                <span
                  className="text-base font-semibold"
                  style={{ color: active ? 'var(--fg-strong)' : 'var(--fg-default)' }}
                >
                  {p.label}
                </span>
                {active && (
                  <span
                    className="ml-auto w-1.5 h-1.5 rounded-full onb-tick"
                    style={{ background: 'var(--fg-accent)' }}
                  />
                )}
              </div>
              <span className="text-xs leading-snug" style={{ color: 'var(--fg-subtle)' }}>
                {p.perm}
              </span>
            </button>
          );
        })}
      </div>

      <PermissionsCard provider={value.provider} />

      <button
        type="button"
        onClick={() => { setOauth(value.provider); }}
        className="inline-flex items-center justify-center gap-1.5 h-10 rounded-md text-base font-semibold transition-colors"
        style={{ background: 'var(--fg-strong)', color: 'var(--bg-canvas)' }}
      >
        {t('workspace.connect.connectTo', { provider: providerLabel(value.provider) })}
      </button>

      {oauth && (
        <OAuthRedirectOverlay
          provider={oauth}
          onCancel={() => { setOauth(null); }}
          onComplete={() => {
            setOauth(null);
            // Demo account derived from chosen provider.
            onChange({ ...value, connected: true, account: 'acme', repo: '', branch: '', monorepoPaths: [] });
          }}
        />
      )}
    </div>
  );
}

function PermissionsCard({ provider }: { provider: WizardData['workspace']['provider'] }) {
  const { t } = useTranslation('onboarding');
  const items = [
    { ok: true,  text: t('workspace.connect.perm.readContents') },
    { ok: true,  text: t('workspace.connect.perm.readMetadata') },
    { ok: true,  text: t('workspace.connect.perm.readTeam') },
    { ok: false, text: t('workspace.connect.perm.noWrite') },
    { ok: false, text: t('workspace.connect.perm.noWorkflows') },
  ];
  return (
    <div
      className="flex flex-col gap-2 px-3 py-3 rounded-md"
      style={{
        background: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-muted)',
      }}
    >
      <span className="text-xs uppercase tracking-eyebrow font-medium" style={{ color: 'var(--fg-subtle)' }}>
        {t('workspace.connect.willRequest', { provider: providerLabel(provider) })}
      </span>
      <ul className="grid grid-cols-1 gap-1">
        {items.map((it, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-sm leading-snug"
            style={{ color: it.ok ? 'var(--fg-default)' : 'var(--fg-subtle)' }}
          >
            <span
              className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full mt-0.5 shrink-0"
              style={{
                background: it.ok ? 'var(--intent-success-bg)' : 'var(--bg-canvas)',
                border: `1px solid ${it.ok ? 'var(--intent-success-fg)' : 'var(--border-muted)'}`,
              }}
            >
              {it.ok
                ? <Check className="w-2.5 h-2.5" style={{ color: 'var(--intent-success-fg)' }} />
                : <Minus className="w-2.5 h-2.5" style={{ color: 'var(--fg-subtle)' }} />}
            </span>
            <span>{it.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
