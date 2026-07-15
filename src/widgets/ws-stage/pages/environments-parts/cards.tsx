import {
  Pencil, ArrowUpRight, X, Check,
  Globe, ExternalLink,
} from 'lucide-react';
import { Button } from '@shared/ui/forms';
import { safeHref } from '@shared/lib';
import type { DeployStatus, Environment, Region, Tier } from './types';
import { REGION_LABELS } from './types';

export function EnvCard({
  env, onEdit, onPromote,
}: { env: Environment; onEdit: () => void; onPromote: () => void }) {
  return (
    <div
      role="presentation"
      className="p-4 rounded-md flex flex-col gap-3 transition-colors"
      style={{
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-muted)',
      }}
      onMouseEnter={(ev) => { ev.currentTarget.style.borderColor = 'var(--border-default)'; }}
      onMouseLeave={(ev) => { ev.currentTarget.style.borderColor = 'var(--border-muted)'; }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
              {env.name}
            </span>
            <TierBadge tier={env.tier} />
            <RegionChip region={env.region} />
          </div>
          <a
            href={safeHref(env.url)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm font-mono truncate"
            style={{ color: 'var(--fg-link)' }}
          >
            <Globe className="w-3 h-3 shrink-0" />
            <span className="truncate">{env.url}</span>
            <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-70" />
          </a>
        </div>
      </div>

      <div
        className="rounded-md px-3 py-2.5 flex items-center justify-between gap-3"
        style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-muted)' }}
      >
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-xs uppercase tracking-eyebrow font-medium" style={{ color: 'var(--fg-subtle)' }}>
            Current deploy
          </span>
          <span className="font-mono text-base truncate" style={{ color: 'var(--fg-strong)' }}>
            {env.sha}
          </span>
        </div>
        <div className="flex flex-col gap-0.5 items-end">
          <span className="text-xs uppercase tracking-eyebrow font-medium" style={{ color: 'var(--fg-subtle)' }}>
            Deployed
          </span>
          <span className="text-sm tabular-nums" style={{ color: 'var(--fg-default)' }}>
            {env.deployedAt}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-auto">
        <Button leading={<Pencil className="w-3 h-3" />} onClick={onEdit}>Edit</Button>
        <Button
          variant="primary"
          leading={<ArrowUpRight className="w-3 h-3" />}
          onClick={onPromote}
        >
          Promote
        </Button>
      </div>
    </div>
  );
}

export function TierBadge({ tier }: { tier: Tier }) {
  const cfg =
    tier === 'production'
      ? { label: 'production', bg: 'var(--intent-warn-bg)', fg: 'var(--intent-warn-fg)' }
      : tier === 'staging'
      ? { label: 'staging',    bg: 'var(--bg-surface-muted)', fg: 'var(--fg-muted)' }
      : { label: 'dev',        bg: 'color-mix(in srgb, var(--fg-accent) 14%, transparent)', fg: 'var(--fg-accent)' };
  return (
    <span
      className="text-2xs uppercase tracking-eyebrow font-semibold px-1.5 py-0.5 rounded"
      style={{ background: cfg.bg, color: cfg.fg }}
    >
      {cfg.label}
    </span>
  );
}

export function RegionChip({ region }: { region: Region }) {
  return (
    <span
      className="text-xs font-mono px-1.5 py-0.5 rounded"
      style={{
        background: 'var(--bg-surface-muted)',
        color: 'var(--fg-muted)',
        border: '1px solid var(--border-muted)',
      }}
      title={REGION_LABELS[region]}
    >
      {region}
    </span>
  );
}

export function DeployStatusIcon({ status }: { status: DeployStatus }) {
  if (status === 'success') {
    return <Check className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--intent-success-fg)' }} />;
  }
  if (status === 'failure') {
    return <X className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--intent-danger-fg)' }} />;
  }
  return (
    <span
      className="w-2 h-2 rounded-full shrink-0 ml-[3px] mr-[3px]"
      style={{ background: 'var(--fg-accent)', boxShadow: '0 0 6px var(--fg-accent)' }}
      title="in progress"
    />
  );
}
