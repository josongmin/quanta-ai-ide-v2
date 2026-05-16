import { useState } from 'react';
import { Gavel, X, Archive, Clock, ShieldAlert } from 'lucide-react';
import { OrgShell } from '../parts/OrgShell';
import { Section, Row, Field, Toggle, Button, SaveBar } from '@shared/ui/forms';
import { shallowEqual } from '@shared/lib';

type RetentionDays = 30 | 60 | 90 | 180 | 365 | 730 | -1;

type ClassId =
  | 'audit_log' | 'agent_runs' | 'webhook_deliveries' | 'investigation_chats'
  | 'code_review_threads' | 'inactive_sessions' | 'deleted_user_pii' | 'telemetry';

type DataClass = {
  id: ClassId;
  label: string;
  hint: string;
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
  { id: 'audit_log',           label: 'Audit log',             hint: 'Privileged actions across the org',     retention: 730    },
  { id: 'agent_runs',          label: 'Agent runs',            hint: 'Inputs, outputs, and step traces',      retention: 'inherit' },
  { id: 'webhook_deliveries',  label: 'Webhook deliveries',    hint: 'Outgoing payloads and HTTP responses',  retention: 90     },
  { id: 'investigation_chats', label: 'Investigation chats',   hint: 'Chat threads in the Intelligence stage', retention: 'inherit' },
  { id: 'code_review_threads', label: 'Code review threads',   hint: 'Reviewer comments on diffs',             retention: 365    },
  { id: 'inactive_sessions',   label: 'Inactive sessions',     hint: 'Browser sessions with no activity',      retention: 30     },
  { id: 'deleted_user_pii',    label: 'Deleted-user PII',      hint: 'Email, name after account deletion',     retention: 60     },
  { id: 'telemetry',           label: 'Telemetry events',      hint: 'Anonymized usage analytics',             retention: 'inherit' },
];

const INITIAL_HOLDS: LegalHold[] = [
  { id: 'h1', ref: 'INV-2026-0042', scope: 'All artifacts touching the auth service',          creator: 'Sora Kim',    createdAt: '2026-04-21' },
  { id: 'h2', ref: 'LH-2025-11',    scope: 'Agent runs + audit log for diego.ramos@acme.com', creator: 'Legal Ops',   createdAt: '2025-11-03' },
];

const RETENTION_OPTS: { value: RetentionDays; label: string }[] = [
  { value: 30,  label: '30 days'  },
  { value: 60,  label: '60 days'  },
  { value: 90,  label: '90 days'  },
  { value: 180, label: '180 days' },
  { value: 365, label: '1 year'   },
  { value: 730, label: '2 years'  },
  { value: -1,  label: 'Forever'  },
];

const INITIAL_DEFAULT = 365;

export default function RetentionPolicyPage() {
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
      title="Retention policy"
      subtitle="How long ACME keeps each class of data before automatic deletion."
    >
      <Section title="Default retention" hint="Applied to any data class set to “inherit default”.">
        <Row label="Global default" sub="Number of days to retain by default. Class-level overrides take priority.">
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
              className="w-20 h-full bg-transparent outline-none px-3 text-[12px] tabular-nums text-right"
              style={{ color: 'var(--fg-strong)' }}
            />
            <span className="px-3 text-[11px]" style={{ color: 'var(--fg-subtle)' }}>days</span>
          </div>
        </Row>
      </Section>

      <Section title="Per-class overrides" hint="Tighten retention for sensitive classes; loosen for compliance-required ones.">
        <div className="rounded-md overflow-hidden" style={{ border: '1px solid var(--border-muted)' }}>
          <div
            className="grid items-center px-3 h-9 text-[10px] uppercase tracking-[0.14em] font-semibold"
            style={{
              gridTemplateColumns: '1fr 160px 80px',
              gap: 12,
              background: 'var(--bg-surface-muted)',
              color: 'var(--fg-subtle)',
              borderBottom: '1px solid var(--border-muted)',
            }}
          >
            <span>Data class</span>
            <span>Retention</span>
            <span className="text-right">Inherits?</span>
          </div>
          {classes.map((c) => {
            const inh = c.retention === 'inherit';
            return (
              <div
                key={c.id}
                className="grid items-center px-3 h-14 text-[12px] [&:not(:first-child)]:border-t"
                style={{
                  gridTemplateColumns: '1fr 160px 80px',
                  gap: 12,
                  borderColor: 'var(--border-muted)',
                }}
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-medium" style={{ color: 'var(--fg-strong)' }}>{c.label}</span>
                  <span className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>{c.hint}</span>
                </div>
                <select
                  value={inh ? 'inherit' : String(c.retention)}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === 'inherit') setRet(c.id, 'inherit');
                    else setRet(c.id, Number(v) as RetentionDays);
                  }}
                  className="h-8 rounded-md px-2.5 text-[12px] outline-none cursor-pointer"
                  style={{
                    background: 'var(--bg-surface-muted)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--fg-strong)',
                  }}
                >
                  <option value="inherit">Inherit ({defaultDays}d)</option>
                  {RETENTION_OPTS.map((o) => (
                    <option key={o.value} value={String(o.value)}>{o.label}</option>
                  ))}
                </select>
                <span
                  className="text-[10px] uppercase tracking-[0.14em] font-semibold px-1.5 py-0.5 rounded w-fit ml-auto"
                  style={{
                    background: inh ? 'var(--bg-surface-muted)' : 'var(--brand-bg)',
                    color: inh ? 'var(--fg-subtle)' : 'var(--brand-fg)',
                    border: `1px solid ${inh ? 'var(--border-muted)' : 'var(--brand-vivid)'}`,
                  }}
                >
                  {inh ? 'inherit' : 'override'}
                </span>
              </div>
            );
          })}
        </div>
      </Section>

      <Section
        title="Legal holds"
        hint="Suspend deletion for specific scopes while litigation or investigations are open."
      >
        {holds.length === 0 ? (
          <div
            className="text-center py-8 text-[12px] rounded-md"
            style={{ color: 'var(--fg-subtle)', border: '1px dashed var(--border-muted)' }}
          >
            No active holds.
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
                    <span className="font-mono text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>
                      {h.ref}
                    </span>
                    <span
                      className="text-[10px] uppercase tracking-[0.14em] font-semibold px-1.5 py-0.5 rounded"
                      style={{
                        background: 'var(--intent-warn-bg)',
                        color: 'var(--intent-warn-fg)',
                        border: '1px solid var(--intent-warn-fg)',
                      }}
                    >
                      active
                    </span>
                  </div>
                  <span className="text-[11px]" style={{ color: 'var(--fg-default)' }}>{h.scope}</span>
                  <span className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
                    Created by {h.creator} · {h.createdAt}
                  </span>
                </div>
                <Button variant="ghost" onClick={() => { setConfirmRelease(h); }}>Release hold</Button>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Archive destination" hint="Optionally archive data to your own S3 bucket before the retention deadline triggers deletion.">
        <Row label="Archive to S3 before deletion" sub="Writes a one-time JSONL dump per data class to your bucket.">
          <Toggle checked={archive} onChange={setArchive} />
        </Row>
        <div className="grid gap-3 pt-1" style={{ gridTemplateColumns: '1fr 1fr', opacity: archive ? 1 : 0.5, pointerEvents: archive ? 'auto' : 'none' }}>
          <Field
            label="Bucket name"
            value={bucket}
            onChange={(e) => { setBucket(e.target.value); }}
            placeholder="s3://my-archive-bucket"
          />
          <Field
            label="AWS Role ARN"
            value={roleArn}
            onChange={(e) => { setRoleArn(e.target.value); }}
            placeholder="arn:aws:iam::123:role/archiver"
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

      <p className="text-[11px] mt-6 px-1 flex items-start gap-1.5" style={{ color: 'var(--fg-subtle)' }}>
        <Archive className="w-3 h-3 mt-0.5 shrink-0" />
        Deletions are soft for 7 days, then cryptographically shredded. Archive writes happen the night before deletion.
      </p>
      <p className="text-[11px] mt-1 px-1 flex items-start gap-1.5" style={{ color: 'var(--fg-subtle)' }}>
        <Clock className="w-3 h-3 mt-0.5 shrink-0" />
        Retention changes apply to new data. Existing records inherit their original policy until next compaction.
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
  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={onCancel} />
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[440px] rounded-lg overflow-hidden"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-md)' }}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-muted)' }}>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" style={{ color: 'var(--intent-danger-fg)' }} />
            <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>
              Release hold {hold.ref}?
            </span>
          </div>
          <button type="button" onClick={onCancel} className="w-7 h-7 inline-flex items-center justify-center" style={{ color: 'var(--fg-muted)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 flex flex-col gap-2">
          <p className="text-[12px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
            Records covered by this hold will become eligible for retention-driven deletion at the next compaction window.
            This action is logged and notifies legal-ops.
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 px-4 py-3" style={{ borderTop: '1px solid var(--border-muted)', background: 'var(--bg-surface-muted)' }}>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" size="md" onClick={onConfirm}>Release hold</Button>
        </div>
      </div>
    </>
  );
}
