import { useMemo } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { MeShell } from '../parts/MeShell';
import { Section, Row, Toggle, Select, Button, Divider, SaveBar } from '@shared/ui/forms';
import { useDirtyState } from '../lib/useDirtyState';
import { EVENTS, INITIAL } from './parts/notifications/types';
import type { Channel, EventId, EventMeta } from './parts/notifications/types';
import { MuteBanner } from './parts/notifications/MuteBanner';
import { ChannelCards } from './parts/notifications/ChannelCards';
import { Matrix } from './parts/notifications/Matrix';
import { TimeField, ClockPreview } from './parts/notifications/QuietHours';

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
      {draft.globalMute && <MuteBanner />}

      <Section
        title="Delivery channels"
        hint="Each channel has its own delivery destination. The matrix below picks which events go where."
      >
        <ChannelCards />
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
