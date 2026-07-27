import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRightLeft, Trash2, AlertTriangle } from 'lucide-react';
import { WsShell } from '../parts/WsShell';
import { Section, Row, Toggle, Button } from '@shared/ui/forms';
import { ModalBackdrop, ConfirmDialog, useDialogA11y } from '@shared/ui';

const TARGET_ORGS = [
  { id: 'partner-co',     label: 'partner-co' },
  { id: 'lighthouse-labs',label: 'lighthouse-labs' },
  { id: 'northwind',      label: 'northwind' },
];

const WS_NAME = 'monorepo';

export default function DangerPage() {
  const { t } = useTranslation('ws');
  const [archived, setArchived] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <WsShell
      orgName="ACME, Inc."
      orgSlug="acme"
      wsName={WS_NAME}
      wsSlug={WS_NAME}
      title={t('danger.title')}
      subtitle={t('danger.subtitle')}
    >
      <Section title={t('danger.archive.title')} hint={t('danger.archive.hint')}>
        <Row
          label={t('danger.archivedRow.label')}
          sub={t('danger.archivedRow.sub')}
          danger
        >
          <Toggle checked={archived} onChange={setArchived} label={t('danger.archivedRow.toggle')} />
        </Row>
      </Section>

      <Section title={t('danger.transfer.title')} hint={t('danger.transfer.hint')}>
        <Row
          label={t('danger.transferRow.label')}
          sub={t('danger.transferRow.sub')}
          danger
        >
          <Button
            variant="danger"
            leading={<ArrowRightLeft className="w-3 h-3" />}
            onClick={() => { setTransferOpen(true); }}
          >
            {t('danger.transferRow.button')}
          </Button>
        </Row>
      </Section>

      <Section title={t('danger.delete.title')} hint={t('danger.delete.hint')}>
        <Row
          label={t('danger.deleteRow.label')}
          sub={t('danger.deleteRow.sub')}
          danger
        >
          <Button
            variant="danger"
            leading={<Trash2 className="w-3 h-3" />}
            onClick={() => { setDeleteOpen(true); }}
          >
            {t('danger.deleteRow.button')}
          </Button>
        </Row>
      </Section>

      {transferOpen && (
        <ConfirmTransfer
          wsName={WS_NAME}
          onCancel={() => { setTransferOpen(false); }}
          onConfirm={() => { setTransferOpen(false); }}
        />
      )}
      {deleteOpen && (
        <ConfirmDialog
          open
          onCancel={() => { setDeleteOpen(false); }}
          onConfirm={() => { setDeleteOpen(false); }}
          title={t('danger.deleteDialog.title', { name: WS_NAME })}
          confirmLabel={t('danger.deleteDialog.confirm')}
          width={460}
          requireTypedConfirmation={WS_NAME}
          description={(
            <>
              {t('danger.deleteDialog.descriptionPrefix')}{' '}
              <span className="font-mono" style={{ color: 'var(--fg-strong)' }}>{WS_NAME}</span>{' '}
              {t('danger.deleteDialog.descriptionSuffix')}
            </>
          )}
        />
      )}
    </WsShell>
  );
}

function ConfirmTransfer({
  wsName, onCancel, onConfirm,
}: { wsName: string; onCancel: () => void; onConfirm: () => void }) {
  const { t } = useTranslation('ws');
  const [target, setTarget] = useState(TARGET_ORGS[0].id);
  const [typed, setTyped] = useState('');
  const matches = typed === wsName;
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogA11y(dialogRef, true, onCancel);

  return (
    <>
      <ModalBackdrop onClick={onCancel} z="z-40" alpha={0.45} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('danger.transferDialog.aria', { name: wsName })}
        tabIndex={-1}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[480px] rounded-lg overflow-hidden outline-none"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-md)' }}
      >
        <div className="p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" style={{ color: 'var(--intent-warn-fg)' }} />
            <span className="text-base font-semibold" style={{ color: 'var(--fg-strong)' }}>
              {t('danger.transferDialog.title', { name: wsName })}
            </span>
          </div>
          <p className="text-base leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
            {t('danger.transferDialog.descriptionPrefix')}{' '}
            <span className="font-mono" style={{ color: 'var(--fg-strong)' }}>{wsName}</span>{' '}
            {t('danger.transferDialog.descriptionSuffix')}
          </p>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-eyebrow font-medium" style={{ color: 'var(--fg-subtle)' }}>
              {t('danger.transferDialog.destinationOrg')}
            </span>
            <select
              value={target}
              onChange={(e) => { setTarget(e.target.value); }}
              className="h-9 rounded-md px-2.5 text-base outline-none cursor-pointer"
              style={{
                background: 'var(--bg-surface-muted)',
                border: '1px solid var(--border-default)',
                color: 'var(--fg-strong)',
              }}
            >
              {TARGET_ORGS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-eyebrow font-medium" style={{ color: 'var(--fg-subtle)' }}>
              {t('danger.transferDialog.typeToConfirm')}
            </span>
            <input
              value={typed}
              onChange={(e) => { setTyped(e.target.value); }}
              placeholder={wsName}
              className="h-9 rounded-md px-3 text-base outline-none font-mono"
              style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)', color: 'var(--fg-strong)' }}
            />
          </label>
        </div>
        <div
          className="flex items-center justify-end gap-2 px-4 py-3"
          style={{ borderTop: '1px solid var(--border-muted)', background: 'var(--bg-surface-muted)' }}
        >
          <Button variant="ghost" onClick={onCancel}>{t('danger.transferDialog.cancel')}</Button>
          <Button variant="danger" size="md" disabled={!matches} onClick={onConfirm}>
            {t('danger.transferDialog.confirmButton', { target })}
          </Button>
        </div>
      </div>
    </>
  );
}

