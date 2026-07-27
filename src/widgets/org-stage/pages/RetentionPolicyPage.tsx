import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Gavel, X, Archive, Clock, ShieldAlert } from 'lucide-react';
import { OrgShell } from '../parts/OrgShell';
import { Section, Row, Field, Toggle, Button, SaveBar } from '@shared/ui/forms';
import { ModalBackdrop, useDialogA11y } from '@shared/ui';
import { shallowEqual } from '@shared/lib';

type RetentionDays = 30 | 60 | 90 | 180 | 365 | 730 | -1;

type ClassId =
  | 'audit_log' | 'agent_runs' | 'webhook_deliveries' | 'investigation_chats'
  | 'code_review_threads' | 'inactive_sessions' | 'deleted_user_pii' | 'telemetry';

type DataClass = {
  id: ClassId;
  labelKey: string;
  hintKey: string;
  retention: RetentionDays | 'inherit';
};

type LegalHold = {
  id: string;
  ref: string;
  scope: string;
  creator: string;
  createdAt: string;
};

const INITIAL_CLASSES: DataClass[] = [
  { id: 'audit_log',           labelKey: 'retention.class.auditLog',           hintKey: 'retention.class.auditLogHint',           retention: 730    },
  { id: 'agent_runs',          labelKey: 'retention.class.agentRuns',          hintKey: 'retention.class.agentRunsHint',          retention: 'inherit' },
  { id: 'webhook_deliveries',  labelKey: 'retention.class.webhookDeliveries',  hintKey: 'retention.class.webhookDeliveriesHint',  retention: 90     },
  { id: 'investigation_chats', labelKey: 'retention.class.investigationChats', hintKey: 'retention.class.investigationChatsHint', retention: 'inherit' },
  { id: 'code_review_threads', labelKey: 'retention.class.codeReviewThreads',  hintKey: 'retention.class.codeReviewThreadsHint',  retention: 365    },
  { id: 'inactive_sessions',   labelKey: 'retention.class.inactiveSessions',   hintKey: 'retention.class.inactiveSessionsHint',   retention: 30     },
  { id: 'deleted_user_pii',    labelKey: 'retention.class.deletedUserPii',     hintKey: 'retention.class.deletedUserPiiHint',     retention: 60     },
  { id: 'telemetry',           labelKey: 'retention.class.telemetry',          hintKey: 'retention.class.telemetryHint',          retention: 'inherit' },
];

const INITIAL_HOLDS: LegalHold[] = [
  { id: 'h1', ref: 'INV-2026-0042', scope: 'All artifacts touching the auth service',          creator: 'Sora Kim',    createdAt: '2026-04-21' },
  { id: 'h2', ref: 'LH-2025-11',    scope: 'Agent runs + audit log for diego.ramos@acme.com', creator: 'Legal Ops',   createdAt: '2025-11-03' },
];

const RETENTION_OPTS: { value: RetentionDays; labelKey: string }[] = [
  { value: 30,  labelKey: 'retention.opt.days30'  },
  { value: 60,  labelKey: 'retention.opt.days60'  },
  { value: 90,  labelKey: 'retention.opt.days90'  },
  { value: 180, labelKey: 'retention.opt.days180' },
  { value: 365, labelKey: 'retention.opt.year1'   },
  { value: 730, labelKey: 'retention.opt.years2'  },
  { value: -1,  labelKey: 'retention.opt.forever' },
];

const INITIAL_DEFAULT = 365;

export default function RetentionPolicyPage() {
  const { t } = useTranslation('org');
  const [defaultDays, setDefaultDays] = useState<number>(INITIAL_DEFAULT);
  const [classes, setClasses] = useState<DataClass[]>(INITIAL_CLASSES);
  const [holds, setHolds] = useState<LegalHold[]>(INITIAL_HOLDS);
  const [archive, setArchive] = useState(true);
  const [bucket, setBucket] = useState('s3://acme-se-archive');
  const [roleArn, setRoleArn] = useState('arn:aws:iam::904123456789:role/acme-se-archiver');
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [confirmRelease, setConfirmRelease] = useState<LegalHold | null>(null);

  const dirty = !shallowEqual(
    { defaultDays, classes, holds, archive, bucket, roleArn },
    {
      defaultDays: INITIAL_DEFAULT, classes: INITIAL_CLASSES, holds: INITIAL_HOLDS,
      archive: true, bucket: 's3://acme-se-archive', roleArn: 'arn:aws:iam::904123456789:role/acme-se-archiver',
    },
  );

  const setRet = (id: ClassId, v: DataClass['retention']) => {
    setClasses((cs) => cs.map((c) => (c.id === id ? { ...c, retention: v } : c)));
  };

  const save = () => {
    setSavingState('saving');
    setTimeout(() => {
      setSavingState('saved');
      setTimeout(() => { setSavingState('idle'); }, 1200);
    }, 600);
  };

  return (
    <OrgShell
      orgName="ACME, Inc."
      orgSlug="acme"
      title={t('retention.title')}
      subtitle={t('retention.subtitle')}
    >
      <Section title={t('retention.default.title')} hint={t('retention.default.hint')}>
        <Row label={t('retention.default.global')} sub={t('retention.default.globalSub')}>
          <div
            className="flex items-center h-9 rounded-md"
            style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)' }}
          >
            <input
              type="number"
              min={1}
              max={3650}
              value={defaultDays}
              onChange={(e) => { setDefaultDays(Number(e.target.value) || 0); }}
              className="w-20 h-full bg-transparent outline-none px-3 text-base tabular-nums text-right"
              style={{ color: 'var(--fg-strong)' }}
            />
            <span className="px-3 text-sm" style={{ color: 'var(--fg-subtle)' }}>{t('retention.default.days')}</span>
          </div>
        </Row>
      </Section>

      <Section title={t('retention.perClass.title')} hint={t('retention.perClass.hint')}>
        <div className="rounded-md overflow-hidden" style={{ border: '1px solid var(--border-muted)' }}>
          <div
            className="grid items-center px-3 h-9 text-xs uppercase tracking-eyebrow font-semibold"
            style={{
              gridTemplateColumns: '1fr 160px 80px',
              gap: 12,
              background: 'var(--bg-surface-muted)',
              color: 'var(--fg-subtle)',
              borderBottom: '1px solid var(--border-muted)',
            }}
          >
            <span>{t('retention.perClass.dataClass')}</span>
            <span>{t('retention.perClass.retention')}</span>
            <span className="text-right">{t('retention.perClass.inherits')}</span>
          </div>
          {classes.map((c) => {
            const inh = c.retention === 'inherit';
            return (
              <div
                key={c.id}
                className="grid items-center px-3 h-14 text-base [&:not(:first-child)]:border-t"
                style={{
                  gridTemplateColumns: '1fr 160px 80px',
                  gap: 12,
                  borderColor: 'var(--border-muted)',
                }}
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-medium" style={{ color: 'var(--fg-strong)' }}>{t(c.labelKey)}</span>
                  <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>{t(c.hintKey)}</span>
                </div>
                <select
                  value={inh ? 'inherit' : String(c.retention)}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === 'inherit') setRet(c.id, 'inherit');
                    else setRet(c.id, Number(v) as RetentionDays);
                  }}
                  className="h-8 rounded-md px-2.5 text-base outline-none cursor-pointer"
                  style={{
                    background: 'var(--bg-surface-muted)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--fg-strong)',
                  }}
                >
                  <option value="inherit">{t('retention.perClass.inheritOption', { days: defaultDays })}</option>
                  {RETENTION_OPTS.map((o) => (
                    <option key={o.value} value={String(o.value)}>{t(o.labelKey)}</option>
                  ))}
                </select>
                <span
                  className="text-xs uppercase tracking-eyebrow font-semibold px-1.5 py-0.5 rounded w-fit ml-auto"
                  style={{
                    background: inh ? 'var(--bg-surface-muted)' : 'color-mix(in srgb, var(--fg-accent) 14%, transparent)',
                    color: inh ? 'var(--fg-subtle)' : 'var(--fg-accent)',
                    border: `1px solid ${inh ? 'var(--border-muted)' : 'var(--fg-accent)'}`,
                  }}
                >
                  {inh ? t('retention.perClass.inherit') : t('retention.perClass.override')}
                </span>
              </div>
            );
          })}
        </div>
      </Section>

      <Section
        title={t('retention.legalHolds.title')}
        hint={t('retention.legalHolds.hint')}
      >
        {holds.length === 0 ? (
          <div
            className="text-center py-8 text-base rounded-md"
            style={{ color: 'var(--fg-subtle)', border: '1px dashed var(--border-muted)' }}
          >
            {t('retention.legalHolds.none')}
          </div>
        ) : (
          <div className="rounded-md overflow-hidden" style={{ border: '1px solid var(--border-muted)' }}>
            {holds.map((h) => (
              <div
                key={h.id}
                className="flex items-start gap-3 px-3 py-3 [&:not(:first-child)]:border-t"
                style={{ borderColor: 'var(--border-muted)' }}
              >
                <Gavel className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--fg-subtle)' }} />
                <div className="flex-1 flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-semibold" style={{ color: 'var(--fg-strong)' }}>
                      {h.ref}
                    </span>
                    <span
                      className="text-xs uppercase tracking-eyebrow font-semibold px-1.5 py-0.5 rounded"
                      style={{
                        background: 'var(--intent-warn-bg)',
                        color: 'var(--intent-warn-fg)',
                        border: '1px solid var(--intent-warn-fg)',
                      }}
                    >
                      {t('retention.legalHolds.active')}
                    </span>
                  </div>
                  <span className="text-sm" style={{ color: 'var(--fg-default)' }}>{h.scope}</span>
                  <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>
                    {t('retention.legalHolds.createdBy', { creator: h.creator, date: h.createdAt })}
                  </span>
                </div>
                <Button variant="ghost" onClick={() => { setConfirmRelease(h); }}>{t('retention.legalHolds.release')}</Button>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title={t('retention.archive.title')} hint={t('retention.archive.hint')}>
        <Row label={t('retention.archive.toggle')} sub={t('retention.archive.toggleSub')}>
          <Toggle checked={archive} onChange={setArchive} />
        </Row>
        <div className="grid gap-3 pt-1" style={{ gridTemplateColumns: '1fr 1fr', opacity: archive ? 1 : 0.5, pointerEvents: archive ? 'auto' : 'none' }}>
          <Field
            label={t('retention.archive.bucket')}
            value={bucket}
            onChange={(e) => { setBucket(e.target.value); }}
            placeholder={t('retention.archive.bucketPlaceholder')}
          />
          <Field
            label={t('retention.archive.roleArn')}
            value={roleArn}
            onChange={(e) => { setRoleArn(e.target.value); }}
            placeholder={t('retention.archive.roleArnPlaceholder')}
          />
        </div>
      </Section>

      <SaveBar
        visible={dirty || savingState !== 'idle'}
        dirty={dirty}
        savingState={savingState}
        onSave={save}
        onDiscard={() => {
          setDefaultDays(INITIAL_DEFAULT); setClasses(INITIAL_CLASSES); setHolds(INITIAL_HOLDS);
          setArchive(true); setBucket('s3://acme-se-archive'); setRoleArn('arn:aws:iam::904123456789:role/acme-se-archiver');
        }}
      />

      <p className="text-sm mt-6 px-1 flex items-start gap-1.5" style={{ color: 'var(--fg-subtle)' }}>
        <Archive className="w-3 h-3 mt-0.5 shrink-0" />
        {t('retention.notes.archive')}
      </p>
      <p className="text-sm mt-1 px-1 flex items-start gap-1.5" style={{ color: 'var(--fg-subtle)' }}>
        <Clock className="w-3 h-3 mt-0.5 shrink-0" />
        {t('retention.notes.apply')}
      </p>

      {confirmRelease && (
        <ConfirmRelease
          hold={confirmRelease}
          onCancel={() => { setConfirmRelease(null); }}
          onConfirm={() => {
            setHolds((all) => all.filter((x) => x.id !== confirmRelease.id));
            setConfirmRelease(null);
          }}
        />
      )}
    </OrgShell>
  );
}

function ConfirmRelease({
  hold, onCancel, onConfirm,
}: { hold: LegalHold; onCancel: () => void; onConfirm: () => void }) {
  const { t } = useTranslation('org');
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogA11y(dialogRef, true, onCancel);
  return (
    <>
      <ModalBackdrop onClick={onCancel} z="z-40" alpha={0.45} label={t('common.closeDialog')} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('retention.releaseDialog.ariaLabel', { ref: hold.ref })}
        tabIndex={-1}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[440px] rounded-lg overflow-hidden outline-none"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-md)' }}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-muted)' }}>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" style={{ color: 'var(--intent-danger-fg)' }} />
            <span className="text-base font-semibold" style={{ color: 'var(--fg-strong)' }}>
              {t('retention.releaseDialog.title', { ref: hold.ref })}
            </span>
          </div>
          <button type="button" onClick={onCancel} aria-label={t('common.close')} className="w-7 h-7 inline-flex items-center justify-center" style={{ color: 'var(--fg-muted)' }}>
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
        <div className="p-5 flex flex-col gap-2">
          <p className="text-base leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
            {t('retention.releaseDialog.body')}
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 px-4 py-3" style={{ borderTop: '1px solid var(--border-muted)', background: 'var(--bg-surface-muted)' }}>
          <Button variant="ghost" onClick={onCancel}>{t('retention.releaseDialog.cancel')}</Button>
          <Button variant="danger" size="md" onClick={onConfirm}>{t('retention.releaseDialog.confirm')}</Button>
        </div>
      </div>
    </>
  );
}
