import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('me');
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
      title={t('notifications.title')}
      subtitle={t('notifications.subtitle')}
      topRight={
        <Button
          leading={draft.globalMute ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          onClick={() => { setDraft({ ...draft, globalMute: !draft.globalMute }); }}
        >
          {draft.globalMute ? t('notifications.muted') : t('notifications.muteEverything')}
        </Button>
      }
    >
      {draft.globalMute && <MuteBanner />}

      <Section
        title={t('notifications.channels.title')}
        hint={t('notifications.channels.hint')}
      >
        <ChannelCards />
      </Section>

      <Section
        title={t('notifications.matrix.title')}
        hint={t('notifications.matrix.hint')}
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
        title={t('notifications.cadence.title')}
        hint={t('notifications.cadence.hint')}
      >
        <Row label={t('notifications.cadence.digest')} sub={t('notifications.cadence.digestSub')}>
          <Select
            value={draft.digest}
            onChange={(v) => { setDraft({ ...draft, digest: v }); }}
            options={[
              { id: 'realtime',     label: t('notifications.cadence.realtime'), sub: t('notifications.cadence.realtimeSub') },
              { id: 'hourly',       label: t('notifications.cadence.hourly'),   sub: t('notifications.cadence.hourlySub') },
              { id: 'daily-9am',    label: t('notifications.cadence.daily'),    sub: t('notifications.cadence.dailySub') },
              { id: 'weekly-monday',label: t('notifications.cadence.weekly'),   sub: t('notifications.cadence.weeklySub') },
            ]}
          />
        </Row>
      </Section>

      <Section
        title={t('notifications.quiet.title')}
        hint={t('notifications.quiet.hint')}
      >
        <Row
          label={t('notifications.quiet.enable')}
          sub={<span>{t('notifications.quiet.enableSub')}</span>}
        >
          <Toggle
            checked={draft.quietHours.enabled}
            onChange={(v) => { setDraft({ ...draft, quietHours: { ...draft.quietHours, enabled: v } }); }}
            label={t('notifications.quiet.toggle')}
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
                label={t('notifications.quiet.from')}
                value={draft.quietHours.from}
                onChange={(v) => { setDraft({ ...draft, quietHours: { ...draft.quietHours, from: v } }); }}
              />
              <TimeField
                label={t('notifications.quiet.to')}
                value={draft.quietHours.to}
                onChange={(v) => { setDraft({ ...draft, quietHours: { ...draft.quietHours, to: v } }); }}
              />
              <label className="flex flex-col gap-1.5">
                <span className="text-xs uppercase tracking-eyebrow font-medium" style={{ color: 'var(--fg-subtle)' }}>
                  {t('notifications.quiet.timezone')}
                </span>
                <select
                  value={draft.quietHours.timezone}
                  onChange={(e) => { setDraft({ ...draft, quietHours: { ...draft.quietHours, timezone: e.target.value } }); }}
                  className="h-8 rounded-md px-2.5 text-base outline-none"
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
          label={t('notifications.quiet.dnd')}
          sub={t('notifications.quiet.dndSub')}
        >
          <Toggle
            checked={draft.doNotDisturb}
            onChange={(v) => { setDraft({ ...draft, doNotDisturb: v }); }}
            label={t('notifications.quiet.dndToggle')}
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
