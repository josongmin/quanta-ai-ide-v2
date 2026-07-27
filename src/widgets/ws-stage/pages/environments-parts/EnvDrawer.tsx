import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Button, Toggle, Field } from '@shared/ui/forms';
import { ModalBackdrop, useDialogA11y } from '@shared/ui';
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
  const { t } = useTranslation('ws');
  const promoteOptions: { id: string; label: string }[] = [
    { id: 'none', label: t('environments.drawer.noAutoPromote') },
    ...allEnvs.filter((e) => e.id !== env.id).map((e) => ({ id: e.name, label: e.name })),
  ];
  const dialogRef = useRef<HTMLElement>(null);
  useDialogA11y(dialogRef, true, onClose);

  return (
    <>
      <ModalBackdrop onClick={onClose} z="z-40" alpha={0.45} />
      <aside
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('environments.drawer.aria', { name: env.name })}
        tabIndex={-1}
        className="fixed right-0 top-0 bottom-0 z-50 w-[460px] flex flex-col outline-none"
        style={{ background: 'var(--bg-elevated)', borderLeft: '1px solid var(--border-default)', boxShadow: 'var(--shadow-md)' }}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-muted)' }}>
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-base font-semibold truncate" style={{ color: 'var(--fg-strong)' }}>
              {env.name}
            </span>
            <TierBadge tier={env.tier} />
            <RegionChip region={env.region} />
          </div>
          <button type="button" onClick={onClose} aria-label={t('environments.drawer.closeAria')} className="w-7 h-7 inline-flex items-center justify-center" style={{ color: 'var(--fg-muted)' }}>
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          <Field
            label={t('environments.drawer.nameLabel')}
            value={env.name}
            onChange={(e) => { onChange({ name: e.target.value }); }}
          />

          <Field
            label={t('environments.drawer.urlLabel')}
            value={env.url}
            onChange={(e) => { onChange({ url: e.target.value }); }}
          />

          <div className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-eyebrow font-medium" style={{ color: 'var(--fg-subtle)' }}>
              {t('environments.drawer.regionLabel')}
            </span>
            <select
              value={env.region}
              onChange={(e) => { onChange({ region: e.target.value as Region }); }}
              className="h-9 rounded-md px-2.5 text-base outline-none cursor-pointer"
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
            label={t('environments.drawer.reviewersLabel')}
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
              <span className="text-base font-medium" style={{ color: 'var(--fg-strong)' }}>
                {t('environments.drawer.blockDirectPush')}
              </span>
              <span className="text-sm leading-snug" style={{ color: 'var(--fg-subtle)' }}>
                {t('environments.drawer.blockDirectPushSub')}
              </span>
            </div>
            <Toggle
              checked={env.blockDirectPush}
              onChange={(v) => { onChange({ blockDirectPush: v }); }}
              label={t('environments.drawer.blockDirectPush')}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-eyebrow font-medium" style={{ color: 'var(--fg-subtle)' }}>
              {t('environments.drawer.promotesFrom')}
            </span>
            <select
              value={env.promotesFrom}
              onChange={(e) => { onChange({ promotesFrom: e.target.value }); }}
              className="h-9 rounded-md px-2.5 text-base outline-none cursor-pointer"
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
            <span className="text-xs uppercase tracking-eyebrow font-semibold" style={{ color: 'var(--fg-subtle)' }}>
              {t('environments.drawer.recentDeploys')}
            </span>
            <ul className="flex flex-col rounded-md overflow-hidden" style={{ border: '1px solid var(--border-muted)' }}>
              {env.deploys.length === 0 ? (
                <li className="px-3 py-3 text-sm text-center" style={{ color: 'var(--fg-subtle)' }}>
                  {t('environments.drawer.noDeploys')}
                </li>
              ) : env.deploys.slice(0, 5).map((d) => (
                <li
                  key={d.id}
                  className="flex items-center gap-2 px-3 py-2 [&:not(:first-child)]:border-t"
                  style={{ borderColor: 'var(--border-muted)' }}
                >
                  <DeployStatusIcon status={d.status} />
                  <span className="font-mono text-sm shrink-0" style={{ color: 'var(--fg-strong)' }}>
                    {d.sha}
                  </span>
                  <span className="text-sm truncate flex-1" style={{ color: 'var(--fg-muted)' }}>
                    {d.by}
                  </span>
                  <span className="text-xs tabular-nums" style={{ color: 'var(--fg-subtle)' }}>
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
          <Button variant="ghost" onClick={onClose}>{t('environments.drawer.close')}</Button>
          <Button variant="primary" size="md" onClick={onClose}>{t('environments.drawer.done')}</Button>
        </div>
      </aside>
    </>
  );
}
