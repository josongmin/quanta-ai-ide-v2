import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Section, Row, Toggle, Select } from '@shared/ui/forms';
import { EVENTS, type Channel, type EventId, type EventMeta, type Settings } from './types';
import { ChannelCards } from './ChannelCards';
import { Matrix } from './Matrix';
import { TimeField, ClockPreview } from './QuietHours';

// Shared notification-settings form body (channels / matrix / cadence / quiet hours), driven
// by (draft, setDraft) so the demo page (useDirtyState + fake save) and the real page (backend
// save) render identical controls. The global-mute button + banner + SaveBar stay in the page.
export function NotificationsForm({
  draft, setDraft,
}: {
  draft: Settings;
  setDraft: (next: Settings) => void;
}) {
  const { t } = useTranslation('me');

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
      matrix: { ...draft.matrix, [event]: { inApp: value, email: value, slack: value, mobile: value } },
    });
  };

  return (
    <>
      <Section title={t('notifications.channels.title')} hint={t('notifications.channels.hint')}>
        <ChannelCards />
      </Section>

      <Section title={t('notifications.matrix.title')} hint={t('notifications.matrix.hint')}>
        <Matrix groups={groups} matrix={draft.matrix} disabled={draft.globalMute} onCell={setCell} onRowAll={setRowAll} />
      </Section>

      <Section title={t('notifications.cadence.title')} hint={t('notifications.cadence.hint')}>
        <Row label={t('notifications.cadence.digest')} sub={t('notifications.cadence.digestSub')}>
          <Select
            value={draft.digest}
            onChange={(v) => { setDraft({ ...draft, digest: v }); }}
            options={[
              { id: 'realtime', label: t('notifications.cadence.realtime'), sub: t('notifications.cadence.realtimeSub') },
              { id: 'hourly', label: t('notifications.cadence.hourly'), sub: t('notifications.cadence.hourlySub') },
              { id: 'daily-9am', label: t('notifications.cadence.daily'), sub: t('notifications.cadence.dailySub') },
              { id: 'weekly-monday', label: t('notifications.cadence.weekly'), sub: t('notifications.cadence.weeklySub') },
            ]}
          />
        </Row>
      </Section>

      <Section title={t('notifications.quiet.title')} hint={t('notifications.quiet.hint')}>
        <Row label={t('notifications.quiet.enable')} sub={<span>{t('notifications.quiet.enableSub')}</span>}>
          <Toggle
            checked={draft.quietHours.enabled}
            onChange={(v) => { setDraft({ ...draft, quietHours: { ...draft.quietHours, enabled: v } }); }}
            label={t('notifications.quiet.toggle')}
          />
        </Row>
        {draft.quietHours.enabled && (
          <div
            className="flex flex-col gap-3 px-3 py-3 rounded-md onb-stagger"
            style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-muted)' }}
          >
            <div className="grid grid-cols-3 gap-3">
              <TimeField label={t('notifications.quiet.from')} value={draft.quietHours.from} onChange={(v) => { setDraft({ ...draft, quietHours: { ...draft.quietHours, from: v } }); }} />
              <TimeField label={t('notifications.quiet.to')} value={draft.quietHours.to} onChange={(v) => { setDraft({ ...draft, quietHours: { ...draft.quietHours, to: v } }); }} />
              <label className="flex flex-col gap-1.5">
                <span className="text-xs uppercase tracking-eyebrow font-medium" style={{ color: 'var(--fg-subtle)' }}>
                  {t('notifications.quiet.timezone')}
                </span>
                <select
                  value={draft.quietHours.timezone}
                  onChange={(e) => { setDraft({ ...draft, quietHours: { ...draft.quietHours, timezone: e.target.value } }); }}
                  className="h-8 rounded-md px-2.5 text-base outline-none"
                  style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-default)', color: 'var(--fg-strong)' }}
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
        <Row label={t('notifications.quiet.dnd')} sub={t('notifications.quiet.dndSub')}>
          <Toggle checked={draft.doNotDisturb} onChange={(v) => { setDraft({ ...draft, doNotDisturb: v }); }} label={t('notifications.quiet.dndToggle')} />
        </Row>
      </Section>
    </>
  );
}
