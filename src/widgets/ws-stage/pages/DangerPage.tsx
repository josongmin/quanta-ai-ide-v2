import { useState } from 'react';
import { ArrowRightLeft, Trash2, AlertTriangle } from 'lucide-react';
import { WsShell } from '../parts/WsShell';
import { Section, Row, Toggle, Button } from '@shared/ui/forms';
import { ModalBackdrop } from '@shared/ui';

const TARGET_ORGS = [
  { id: 'partner-co',     label: 'partner-co' },
  { id: 'lighthouse-labs',label: 'lighthouse-labs' },
  { id: 'northwind',      label: 'northwind' },
];

const WS_NAME = 'monorepo';

export default function DangerPage() {
  const [archived, setArchived] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <WsShell
      orgName="ACME, Inc."
      orgSlug="acme"
      wsName={WS_NAME}
      wsSlug={WS_NAME}
      title="Danger zone"
      subtitle="Irreversible actions that affect this entire workspace."
    >
      <Section title="Archive workspace" hint="Hide this workspace from default views without losing any data.">
        <Row
          label="Archived"
          sub="Archived workspaces are read-only. Pipelines pause and the workspace is hidden from the launcher. You can restore at any time."
          danger
        >
          <Toggle checked={archived} onChange={setArchived} label="Archive workspace" />
        </Row>
      </Section>

      <Section title="Transfer workspace" hint="Move this workspace to a different organization you own.">
        <Row
          label="Transfer to another org"
          sub="The new org becomes the billing owner. Members keep access if they belong to the destination org."
          danger
        >
          <Button
            variant="danger"
            leading={<ArrowRightLeft className="w-3 h-3" />}
            onClick={() => { setTransferOpen(true); }}
          >
            Transfer workspace
          </Button>
        </Row>
      </Section>

      <Section title="Delete workspace" hint="Permanently remove this workspace and all attached data.">
        <Row
          label="Permanently delete workspace"
          sub="Deletes pipelines, agent history, secrets, labels, and webhooks. Source repository is untouched."
          danger
        >
          <Button
            variant="danger"
            leading={<Trash2 className="w-3 h-3" />}
            onClick={() => { setDeleteOpen(true); }}
          >
            Delete workspace
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
        <ConfirmDelete
          wsName={WS_NAME}
          onCancel={() => { setDeleteOpen(false); }}
          onConfirm={() => { setDeleteOpen(false); }}
        />
      )}
    </WsShell>
  );
}

function ConfirmTransfer({
  wsName, onCancel, onConfirm,
}: { wsName: string; onCancel: () => void; onConfirm: () => void }) {
  const [target, setTarget] = useState(TARGET_ORGS[0].id);
  const [typed, setTyped] = useState('');
  const matches = typed === wsName;

  return (
    <>
      <ModalBackdrop onClick={onCancel} z="z-40" alpha={0.45} />
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[480px] rounded-lg overflow-hidden"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-md)' }}
      >
        <div className="p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" style={{ color: 'var(--intent-warn-fg)' }} />
            <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>
              Transfer {wsName}?
            </span>
          </div>
          <p className="text-[12px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
            This moves the workspace to the destination org and re-attaches billing.
            Type <span className="font-mono" style={{ color: 'var(--fg-strong)' }}>{wsName}</span> below to confirm.
          </p>

          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.14em] font-medium" style={{ color: 'var(--fg-subtle)' }}>
              Destination org
            </span>
            <select
              value={target}
              onChange={(e) => { setTarget(e.target.value); }}
              className="h-9 rounded-md px-2.5 text-[12px] outline-none cursor-pointer"
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
            <span className="text-[10px] uppercase tracking-[0.14em] font-medium" style={{ color: 'var(--fg-subtle)' }}>
              Type to confirm
            </span>
            <input
              value={typed}
              onChange={(e) => { setTyped(e.target.value); }}
              placeholder={wsName}
              className="h-9 rounded-md px-3 text-[12px] outline-none font-mono"
              style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)', color: 'var(--fg-strong)' }}
            />
          </label>
        </div>
        <div
          className="flex items-center justify-end gap-2 px-4 py-3"
          style={{ borderTop: '1px solid var(--border-muted)', background: 'var(--bg-surface-muted)' }}
        >
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" size="md" disabled={!matches} onClick={onConfirm}>
            Transfer to {target}
          </Button>
        </div>
      </div>
    </>
  );
}

function ConfirmDelete({
  wsName, onCancel, onConfirm,
}: { wsName: string; onCancel: () => void; onConfirm: () => void }) {
  const [typed, setTyped] = useState('');
  const matches = typed === wsName;

  return (
    <>
      <ModalBackdrop onClick={onCancel} z="z-40" alpha={0.45} />
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[460px] rounded-lg overflow-hidden"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-md)' }}
      >
        <div className="p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" style={{ color: 'var(--intent-danger-fg)' }} />
            <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>
              Delete {wsName}?
            </span>
          </div>
          <p className="text-[12px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
            This permanently deletes the workspace, every pipeline run, agent thread,
            secret, label, and webhook attached to it. The source repository is not touched.
            Type <span className="font-mono" style={{ color: 'var(--fg-strong)' }}>{wsName}</span> below to confirm.
          </p>
          <input
            value={typed}
            onChange={(e) => { setTyped(e.target.value); }}
            placeholder={wsName}
            className="h-9 rounded-md px-3 text-[12px] outline-none font-mono"
            style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)', color: 'var(--fg-strong)' }}
          />
        </div>
        <div
          className="flex items-center justify-end gap-2 px-4 py-3"
          style={{ borderTop: '1px solid var(--border-muted)', background: 'var(--bg-surface-muted)' }}
        >
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" size="md" disabled={!matches} onClick={onConfirm}>
            I understand, delete
          </Button>
        </div>
      </div>
    </>
  );
}
