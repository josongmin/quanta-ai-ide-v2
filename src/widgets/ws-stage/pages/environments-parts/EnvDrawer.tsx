import { X } from 'lucide-react';
import { Button, Toggle, Field } from '@shared/ui/forms';
import { ModalBackdrop } from '@shared/ui';
import { DeployStatusIcon, RegionChip, TierBadge } from './cards';
import type { Environment, Region } from './types';
import { REGION_LABELS } from './types';

export function EnvDrawer({
  env, allEnvs, onClose, onChange,
}: {
  env: Environment;
  allEnvs: Environment[];
  onClose: () => void;
  onChange: (patch: Partial<Environment>) => void;
}) {
  const promoteOptions: { id: string; label: string }[] = [
    { id: 'none', label: '(no auto-promote)' },
    ...allEnvs.filter((e) => e.id !== env.id).map((e) => ({ id: e.name, label: e.name })),
  ];

  return (
    <>
      <ModalBackdrop onClick={onClose} z="z-40" alpha={0.45} />
      <aside
        className="fixed right-0 top-0 bottom-0 z-50 w-[460px] flex flex-col"
        style={{ background: 'var(--bg-elevated)', borderLeft: '1px solid var(--border-default)', boxShadow: 'var(--shadow-md)' }}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-muted)' }}>
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-[12px] font-semibold truncate" style={{ color: 'var(--fg-strong)' }}>
              {env.name}
            </span>
            <TierBadge tier={env.tier} />
            <RegionChip region={env.region} />
          </div>
          <button type="button" onClick={onClose} className="w-7 h-7 inline-flex items-center justify-center" style={{ color: 'var(--fg-muted)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          <Field
            label="Name"
            value={env.name}
            onChange={(e) => { onChange({ name: e.target.value }); }}
          />

          <Field
            label="URL"
            value={env.url}
            onChange={(e) => { onChange({ url: e.target.value }); }}
          />

          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.14em] font-medium" style={{ color: 'var(--fg-subtle)' }}>
              Region
            </span>
            <select
              value={env.region}
              onChange={(e) => { onChange({ region: e.target.value as Region }); }}
              className="h-9 rounded-md px-2.5 text-[12px] outline-none cursor-pointer"
              style={{
                background: 'var(--bg-surface-muted)',
                border: '1px solid var(--border-default)',
                color: 'var(--fg-strong)',
              }}
            >
              {(['us', 'eu', 'apac'] as Region[]).map((r) => (
                <option key={r} value={r}>{r} · {REGION_LABELS[r]}</option>
              ))}
            </select>
          </div>

          <Field
            label="Required reviewers to deploy"
            type="number"
            min={0}
            max={5}
            value={env.reviewers}
            onChange={(e) => { onChange({ reviewers: Math.max(0, Math.min(5, Number(e.target.value) || 0)) }); }}
          />

          <div
            className="flex items-start justify-between gap-4 px-3 py-3 rounded-md"
            style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-muted)' }}
          >
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[12px] font-medium" style={{ color: 'var(--fg-strong)' }}>
                Block direct push
              </span>
              <span className="text-[11px] leading-snug" style={{ color: 'var(--fg-subtle)' }}>
                Only the promotion gate can deploy here. Direct pushes are rejected.
              </span>
            </div>
            <Toggle
              checked={env.blockDirectPush}
              onChange={(v) => { onChange({ blockDirectPush: v }); }}
              label="Block direct push"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.14em] font-medium" style={{ color: 'var(--fg-subtle)' }}>
              Promotes from
            </span>
            <select
              value={env.promotesFrom}
              onChange={(e) => { onChange({ promotesFrom: e.target.value }); }}
              className="h-9 rounded-md px-2.5 text-[12px] outline-none cursor-pointer"
              style={{
                background: 'var(--bg-surface-muted)',
                border: '1px solid var(--border-default)',
                color: 'var(--fg-strong)',
              }}
            >
              {promoteOptions.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-[0.14em] font-semibold" style={{ color: 'var(--fg-subtle)' }}>
              Recent deploys
            </span>
            <ul className="flex flex-col rounded-md overflow-hidden" style={{ border: '1px solid var(--border-muted)' }}>
              {env.deploys.length === 0 ? (
                <li className="px-3 py-3 text-[11px] text-center" style={{ color: 'var(--fg-subtle)' }}>
                  No deploys yet.
                </li>
              ) : env.deploys.slice(0, 5).map((d) => (
                <li
                  key={d.id}
                  className="flex items-center gap-2 px-3 py-2 [&:not(:first-child)]:border-t"
                  style={{ borderColor: 'var(--border-muted)' }}
                >
                  <DeployStatusIcon status={d.status} />
                  <span className="font-mono text-[11px] shrink-0" style={{ color: 'var(--fg-strong)' }}>
                    {d.sha}
                  </span>
                  <span className="text-[11px] truncate flex-1" style={{ color: 'var(--fg-muted)' }}>
                    {d.by}
                  </span>
                  <span className="text-[10px] tabular-nums" style={{ color: 'var(--fg-subtle)' }}>
                    {d.at}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div
          className="flex items-center justify-end gap-2 px-4 py-3"
          style={{ borderTop: '1px solid var(--border-muted)', background: 'var(--bg-surface-muted)' }}
        >
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button variant="primary" size="md" onClick={onClose}>Done</Button>
        </div>
      </aside>
    </>
  );
}
