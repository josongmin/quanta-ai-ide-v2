import { useEffect, useMemo, useRef, useState } from 'react';
import { AuthField as Field } from '@shared/ui/forms';
import { useAvailability } from '../../lib/availability';
import { detectBrowserTimezone, detectBrowserLocale } from '../../lib/timezones';
import type { WizardData } from '../wizard';
import { AvatarBlock } from './profile/AvatarBlock';
import { HandleField } from './profile/HandleField';
import { TimezoneSelect, LocaleSelect, DetectionBanner } from './profile/selects';

type Props = {
  value: WizardData['profile'];
  onChange: (v: WizardData['profile']) => void;
};

export function StepProfile({ value, onChange }: Props) {
  // Auto-fill timezone + locale from browser the first time the step mounts,
  // unless the user has already touched them.
  const detectedTz = useMemo(() => detectBrowserTimezone(), []);
  const detectedLoc = useMemo(() => detectBrowserLocale(), []);
  const detectedRef = useRef(false);
  useEffect(() => {
    if (detectedRef.current) return;
    detectedRef.current = true;
    if (value.timezone === 'America/Los_Angeles' && detectedTz !== 'America/Los_Angeles') {
      onChange({ ...value, timezone: detectedTz, locale: detectedLoc });
    }
  }, [detectedTz, detectedLoc, value, onChange]);

  // Auto-derive handle from name; `handleTouched` stops the autofill once the
  // user starts typing in the handle field directly.
  const [handleTouched, setHandleTouched] = useState(false);
  useEffect(() => {
    if (handleTouched) return;
    const guess = value.name.trim().toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 32);
    if (guess && guess !== value.handle) {
      onChange({ ...value, handle: guess });
    }
  }, [value.name, handleTouched, value, onChange]);

  const handleCheck = useAvailability(value.handle, 'handle');

  return (
    <div className="flex flex-col gap-6">
      <AvatarBlock value={value} onChange={onChange} />

      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Full name"
          value={value.name}
          onChange={(e) => { onChange({ ...value, name: e.target.value }); }}
          placeholder="Sora Kim"
          autoFocus
          required
        />
        <HandleField
          value={value.handle}
          onChange={(h) => { setHandleTouched(true); onChange({ ...value, handle: h }); }}
          check={handleCheck}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <TimezoneSelect
          value={value.timezone}
          onChange={(tz) => { onChange({ ...value, timezone: tz }); }}
          detected={detectedTz}
        />
        <LocaleSelect
          value={value.locale}
          onChange={(l) => { onChange({ ...value, locale: l }); }}
        />
      </div>

      <DetectionBanner detectedTz={detectedTz} detectedLoc={detectedLoc} />
    </div>
  );
}
