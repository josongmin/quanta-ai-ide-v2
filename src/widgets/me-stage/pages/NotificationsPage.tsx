import { useMemo } from 'react';
import { Bell, Mail, Smartphone, Moon, Volume2, VolumeX } from 'lucide-react';
import { SlackIcon } from '@shared/ui/brand-icons';
import { MeShell } from '../parts/MeShell';
import { Section, Row, Toggle, Select, Checkbox, Button, Divider, SaveBar } from '@shared/ui/forms';
import { useDirtyState } from '../lib/useDirtyState';

type Channel = 'inApp' | 'email' | 'slack' | 'mobile';
type EventId =
  | 'mention' | 'review.requested' | 'review.commented'
  | 'review.approved' | 'review.changes-requested'
  | 'admission.failed' | 'admission.passed'
  | 'fix.completed' | 'fix.rolled-back'
  | 'agent.completed' | 'agent.failed'
  | 'inv.evidence' | 'inv.handoff'
  | 'security.signin' | 'security.token'
  | 'billing.invoice' | 'billing.usage';

type EventMeta = {
  id: EventId;
  label: string;
  sub: string;
  group: string;
};

const EVENTS: EventMeta[] = [
  { id: 'mention',                   label: '@mentions',                  sub: 'Someone mentions you in a comment, review, or chat',  group: 'You & teammates' },
  { id: 'review.requested',          label: 'Review requested',           sub: 'A teammate adds you as a reviewer',                   group: 'Reviews' },
  { id: 'review.commented',          label: 'New comment on your PR',     sub: 'Someone comments on a PR you authored',               group: 'Reviews' },
  { id: 'review.approved',           label: 'PR approved',                sub: 'Your PR receives an approval',                        group: 'Reviews' },
  { id: 'review.changes-requested',  label: 'Changes requested',          sub: 'Reviewer requested changes on your PR',               group: 'Reviews' },
  { id: 'admission.failed',          label: 'Admission gate failed',      sub: 'A change you authored failed the admission policy',   group: 'Admission & fixes' },
  { id: 'admission.passed',          label: 'Admission gate passed',      sub: 'A change you authored passed gate (low priority)',    group: 'Admission & fixes' },
  { id: 'fix.completed',             label: 'Fix pipeline completed',     sub: 'A fix run you started finished',                      group: 'Admission & fixes' },
  { id: 'fix.rolled-back',           label: 'Fix rolled back',            sub: 'A fix you applied was rolled back',                   group: 'Admission & fixes' },
  { id: 'agent.completed',           label: 'Agent completed',            sub: 'An agent run finished its task',                      group: 'Agents' },
  { id: 'agent.failed',              label: 'Agent failed',               sub: 'An agent crashed or hit a hard limit',                group: 'Agents' },
  { id: 'inv.evidence',              label: 'New evidence',               sub: 'New evidence linked to an investigation you watch',   group: 'Investigations' },
  { id: 'inv.handoff',               label: 'Investigation handoff',      sub: 'An investigation was handed off to you',              group: 'Investigations' },
  { id: 'security.signin',           label: 'New sign-in',                sub: 'New device or location signed into your account',     group: 'Security' },
  { id: 'security.token',            label: 'Token created or revoked',   sub: 'PAT was generated or revoked on your account',        group: 'Security' },
  { id: 'billing.invoice',           label: 'Invoice issued',             sub: 'Monthly invoice ready for your org',                  group: 'Billing' },
  { id: 'billing.usage',             label: 'Usage limit warning',        sub: 'Org is approaching a usage cap',                      group: 'Billing' },
];

const CHANNELS: { id: Channel; label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; sub?: string }[] = [
  { id: 'inApp', label: 'In-app',  icon: Bell,        sub: 'Inbox bell' },
  { id: 'email', label: 'Email',   icon: Mail,        sub: 'sora@acme.com' },
  { id: 'slack', label: 'Slack',   icon: SlackIcon,   sub: 'acme · @sora' },
  { id: 'mobile',label: 'Mobile',  icon: Smartphone,  sub: 'Push to iOS app' },
];

type Settings = {
  matrix: Record<EventId, Record<Channel, boolean>>;
  digest: 'realtime' | 'hourly' | 'daily-9am' | 'weekly-monday';
  quietHours: { enabled: boolean; from: string; to: string; timezone: string };
  doNotDisturb: boolean;
  globalMute: boolean;
};

const INITIAL: Settings = {
  matrix: makeInitialMatrix(),
  digest: 'realtime',
  quietHours: { enabled: true, from: '22:00', to: '08:00', timezone: 'Asia/Seoul' },
  doNotDisturb: false,
  globalMute: false,
};

function makeInitialMatrix(): Record<EventId, Record<Channel, boolean>> {
  const out: Record<string, Record<Channel, boolean>> = {};
  for (const e of EVENTS) {
    out[e.id] = {
      inApp:  true,
      email:  e.id === 'mention' || e.id.startsWith('security.') || e.id.startsWith('billing.'),
      slack:  e.id === 'mention' || e.id === 'review.requested',
      mobile: e.id === 'mention' || e.id.startsWith('security.'),
    };
  }
  return out;
}

export default function NotificationsPage() {
  const { draft, setDraft, dirty, savingState, save, discard } = useDirtyState(INITIAL);

  const groups = useMemo(() => {
    const m = new Map<string, EventMeta[]>();
    for (const e of EVENTS) {
      const arr = m.get(e.group) ?? [];
      arr.push(e);
      m.set(e.group, arr);
    }
    return Array.from(m.entries());
  }, []);

  const setCell = (event: EventId, channel: Channel, value: boolean) => {
    setDraft({
      ...draft,
      matrix: { ...draft.matrix, [event]: { ...draft.matrix[event], [channel]: value } },
    });
  };

  const setRowAll = (event: EventId, value: boolean) => {
    setDraft({
      ...draft,
      matrix: {
        ...draft.matrix,
        [event]: { inApp: value, email: value, slack: value, mobile: value },
      },
    });
  };

  return (
    <MeShell
      title="Notifications"
      subtitle="Choose what you get notified about and where. Quiet hours and digest mode apply across all channels."
      topRight={
        <Button
          leading={draft.globalMute ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          onClick={() => { setDraft({ ...draft, globalMute: !draft.globalMute }); }}
        >
          {draft.globalMute ? 'All notifications muted' : 'Mute everything'}
        </Button>
      }
    >
      {draft.globalMute && (
        <div
          className="flex items-start gap-2 px-3 py-2 rounded-md mb-4 onb-stagger"
          style={{
            background: 'var(--intent-warn-bg)',
            border: '1px solid var(--intent-warn-fg)',
          }}
        >
          <VolumeX className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'var(--intent-warn-fg)' }} />
          <span className="text-[11px]" style={{ color: 'var(--fg-strong)' }}>
            All notifications are paused. Critical security alerts will still come through.
          </span>
        </div>
      )}

      <Section
        title="Delivery channels"
        hint="Each channel has its own delivery destination. The matrix below picks which events go where."
      >
        <div className="grid grid-cols-4 gap-2">
          {CHANNELS.map((c) => {
            const Icon = c.icon;
            return (
              <div
                key={c.id}
                className="flex flex-col gap-1 p-3 rounded-md"
                style={{
                  background: 'var(--bg-surface-muted)',
                  border: '1px solid var(--border-muted)',
                }}
              >
                <div className="flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5" style={{ color: 'var(--fg-strong)' }} />
                  <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>
                    {c.label}
                  </span>
                </div>
                <span className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
                  {c.sub}
                </span>
              </div>
            );
          })}
        </div>
      </Section>

      <Section
        title="Matrix"
        hint="Toggle each cell to control which events go to which channels. Click a label to copy a row."
      >
        <Matrix
          groups={groups}
          matrix={draft.matrix}
          disabled={draft.globalMute}
          onCell={setCell}
          onRowAll={setRowAll}
        />
      </Section>

      <Section
        title="Delivery cadence"
        hint="Bundle notifications to reduce noise. Real-time means each event fires as it happens."
      >
        <Row label="Digest mode" sub="Affects email and Slack. In-app is always real-time.">
          <Select
            value={draft.digest}
            onChange={(v) => { setDraft({ ...draft, digest: v }); }}
            options={[
              { id: 'realtime',     label: 'Real-time',                   sub: 'Send each event as it happens' },
              { id: 'hourly',       label: 'Hourly digest',               sub: 'Bundle into a once-an-hour roundup' },
              { id: 'daily-9am',    label: 'Daily digest at 9 AM',        sub: 'One email per day' },
              { id: 'weekly-monday',label: 'Weekly digest, Mondays',      sub: 'Quiet during the week' },
            ]}
          />
        </Row>
      </Section>

      <Section
        title="Quiet hours"
        hint="Mute non-critical channels during specific hours. Security alerts always come through."
      >
        <Row
          label="Enable quiet hours"
          sub={<span>Mutes Slack and mobile push between the times below. Email is queued for the digest.</span>}
        >
          <Toggle
            checked={draft.quietHours.enabled}
            onChange={(v) => { setDraft({ ...draft, quietHours: { ...draft.quietHours, enabled: v } }); }}
            label="Quiet hours"
          />
        </Row>
        {draft.quietHours.enabled && (
          <div
            className="flex flex-col gap-3 px-3 py-3 rounded-md onb-stagger"
            style={{
              background: 'var(--bg-surface-muted)',
              border: '1px solid var(--border-muted)',
            }}
          >
            <div className="grid grid-cols-3 gap-3">
              <TimeField
                label="From"
                value={draft.quietHours.from}
                onChange={(v) => { setDraft({ ...draft, quietHours: { ...draft.quietHours, from: v } }); }}
              />
              <TimeField
                label="To"
                value={draft.quietHours.to}
                onChange={(v) => { setDraft({ ...draft, quietHours: { ...draft.quietHours, to: v } }); }}
              />
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] uppercase tracking-[0.14em] font-medium" style={{ color: 'var(--fg-subtle)' }}>
                  Time zone
                </span>
                <select
                  value={draft.quietHours.timezone}
                  onChange={(e) => { setDraft({ ...draft, quietHours: { ...draft.quietHours, timezone: e.target.value } }); }}
                  className="h-8 rounded-md px-2.5 text-[12px] outline-none"
                  style={{
                    background: 'var(--bg-canvas)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--fg-strong)',
                  }}
                >
                  <option value="Asia/Seoul">Seoul · UTC+9</option>
                  <option value="America/Los_Angeles">Los Angeles · UTC−8</option>
                  <option value="Europe/Berlin">Berlin · UTC+1</option>
                </select>
              </label>
            </div>
            <ClockPreview from={draft.quietHours.from} to={draft.quietHours.to} />
          </div>
        )}
        <Row
          label="Do not disturb"
          sub="One-shot mute for the next 4 hours. Resets automatically."
        >
          <Toggle
            checked={draft.doNotDisturb}
            onChange={(v) => { setDraft({ ...draft, doNotDisturb: v }); }}
            label="Do not disturb"
          />
        </Row>
      </Section>

      <Divider />

      <SaveBar
        visible={true}
        dirty={dirty}
        savingState={savingState}
        onSave={save}
        onDiscard={discard}
      />
    </MeShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Matrix grid

function Matrix({
  groups, matrix, disabled, onCell, onRowAll,
}: {
  groups: [string, EventMeta[]][];
  matrix: Settings['matrix'];
  disabled: boolean;
  onCell: (event: EventId, channel: Channel, value: boolean) => void;
  onRowAll: (event: EventId, value: boolean) => void;
}) {
  return (
    <div
      className="rounded-md overflow-hidden"
      style={{ border: '1px solid var(--border-muted)' }}
    >
      <div
        className="grid items-center gap-2 px-3 py-2 text-[9px] uppercase tracking-[0.14em] font-semibold"
        style={{
          gridTemplateColumns: '1fr 80px 80px 80px 80px',
          background: 'var(--bg-surface-muted)',
          color: 'var(--fg-subtle)',
          borderBottom: '1px solid var(--border-muted)',
        }}
      >
        <span>Event</span>
        {CHANNELS.map((c) => {
          const Icon = c.icon;
          return (
            <span key={c.id} className="inline-flex items-center justify-center gap-1">
              <Icon className="w-3 h-3" />
              {c.label}
            </span>
          );
        })}
      </div>

      {groups.map(([groupTitle, events], gi) => (
        <div key={groupTitle}>
          <div
            className="px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] font-semibold"
            style={{
              color: 'var(--fg-muted)',
              background: 'var(--bg-canvas)',
              borderTop: gi === 0 ? 'none' : '1px solid var(--border-muted)',
            }}
          >
            {groupTitle}
          </div>
          {events.map((e) => {
            const row = matrix[e.id];
            const allOn = Object.values(row).every(Boolean);
            return (
              <div
                key={e.id}
                className="grid items-center gap-2 px-3 py-2"
                style={{
                  gridTemplateColumns: '1fr 80px 80px 80px 80px',
                  borderTop: '1px solid var(--border-muted)',
                  opacity: disabled ? 0.5 : 1,
                  pointerEvents: disabled ? 'none' : 'auto',
                }}
              >
                <button
                  type="button"
                  onClick={() => { onRowAll(e.id, !allOn); }}
                  className="flex flex-col gap-0.5 text-left transition-colors"
                  title={allOn ? 'Disable all channels for this event' : 'Enable all channels for this event'}
                >
                  <span className="text-[12px] font-medium" style={{ color: 'var(--fg-strong)' }}>
                    {e.label}
                  </span>
                  <span className="text-[10px] leading-snug" style={{ color: 'var(--fg-subtle)' }}>
                    {e.sub}
                  </span>
                </button>
                {CHANNELS.map((c) => (
                  <div key={c.id} className="flex justify-center">
                    <Checkbox
                      checked={row[c.id]}
                      onChange={(v) => { onCell(e.id, c.id, v); }}
                      label={`${e.label} → ${c.label}`}
                    />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Time field (HH:MM input with arrows)

function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] uppercase tracking-[0.14em] font-medium" style={{ color: 'var(--fg-subtle)' }}>
        {label}
      </span>
      <input
        type="time"
        value={value}
        onChange={(e) => { onChange(e.target.value); }}
        className="h-8 px-2.5 rounded-md text-[12px] outline-none"
        style={{
          background: 'var(--bg-canvas)',
          border: '1px solid var(--border-default)',
          color: 'var(--fg-strong)',
        }}
      />
    </label>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Clock preview — visualises the muted span

function ClockPreview({ from, to }: { from: string; to: string }) {
  const fromMin = toMinutes(from);
  const toMin = toMinutes(to);
  // Wraps midnight: e.g. 22:00 → 08:00. Treat as two arcs if so.
  const dayMin = 24 * 60;
  const arcs = fromMin < toMin
    ? [{ start: fromMin, end: toMin }]
    : [{ start: fromMin, end: dayMin }, { start: 0, end: toMin }];
  return (
    <div className="flex items-center gap-3">
      <svg width="56" height="56" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r="24" fill="none" stroke="var(--border-muted)" strokeWidth="2" />
        {arcs.map((a, i) => (
          <path
            key={i}
            d={describeArc(28, 28, 24, a.start / dayMin * 360, a.end / dayMin * 360)}
            stroke="var(--brand-vivid)"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
        ))}
        <Moon
          x="22" y="22" width="12" height="12"
          color="var(--brand-fg)"
        />
      </svg>
      <div className="flex flex-col text-[11px]" style={{ color: 'var(--fg-muted)' }}>
        <span>
          Mute window: <span className="font-mono tabular-nums" style={{ color: 'var(--fg-default)' }}>
            {from} → {to}
          </span>
        </span>
        <span className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
          {durationLabel(fromMin, toMin)}
        </span>
      </div>
    </div>
  );
}

function toMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}
function durationLabel(from: number, to: number) {
  const total = from < to ? to - from : 24 * 60 - from + to;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}h ${m}m of quiet time`;
}
function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  // SVG arc helper — handles arcs starting from "12 o'clock" (top).
  const toRad = (d: number) => ((d - 90) * Math.PI) / 180;
  const start = { x: cx + r * Math.cos(toRad(startDeg)), y: cy + r * Math.sin(toRad(startDeg)) };
  const end   = { x: cx + r * Math.cos(toRad(endDeg)),   y: cy + r * Math.sin(toRad(endDeg))   };
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
}
