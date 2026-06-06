import { useEffect, useState } from 'react';
import type { WizardData } from '../wizard';
import { ModeToggle } from './org/ModeToggle';
import { CreateOrg } from './org/CreateOrg';
import { JoinOrg } from './org/JoinOrg';

type Props = {
  value: WizardData['org'];
  onChange: (v: WizardData['org']) => void;
};

export function StepOrg({ value, onChange }: Props) {
  // Auto-derive slug from name (live), unless touched.
  const [slugTouched, setSlugTouched] = useState(false);
  useEffect(() => {
    if (slugTouched || value.mode !== 'create') return;
    const guess = value.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32);
    if (guess && guess !== value.slug) onChange({ ...value, slug: guess });
  }, [value.name, slugTouched, value, onChange]);

  return (
    <div className="flex flex-col gap-6">
      <ModeToggle mode={value.mode} onChange={(mode) => { onChange({ ...value, mode }); }} />

      {value.mode === 'create' ? (
        <CreateOrg
          value={value}
          onChange={onChange}
          onSlugTouch={() => { setSlugTouched(true); }}
        />
      ) : (
        <JoinOrg value={value} onChange={onChange} />
      )}
    </div>
  );
}
