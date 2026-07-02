import { Pill } from '@shared/ui';
import { type SuggestionKey } from '../../model/suggestions';
import { SUGGESTION_KEYS, type TFn } from './types';

export function ExternalSuggestions({
  onPick, t,
}: {
  onPick: (key: SuggestionKey, label: string) => void;
  t: TFn;
}) {
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {SUGGESTION_KEYS.map((k) => {
          const s = t(`suggestions.items.${k}`);
          return (
            <Pill key={k} onClick={() => { onPick(k, s); }}>
              {s}
            </Pill>
          );
        })}
      </div>
    </div>
  );
}
