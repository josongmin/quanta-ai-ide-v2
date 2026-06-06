import type { TFunction } from 'i18next';
import type { useOverlay } from '../../model/OverlayContext';
import { DetailHeader, ToggleButton } from './shared';

type Overlay = ReturnType<typeof useOverlay>;

// Public-API ring overlay — copy, a mini ring preview, and an on/off toggle.
export function ApiDetail({
  t, ov,
}: {
  t: TFunction;
  ov: Overlay;
}) {
  const on = ov.apiRing;
  return (
    <div>
      <DetailHeader
        title={t('panel.tile.api')}
        onClear={on ? () => { ov.setApiRing(false); } : undefined}
      />
      <div className="text-[11px] leading-relaxed mb-3 text-[var(--fg-muted)]">
        {t('panel.detail.apiBody')}
      </div>

      {/* Mini preview — a dot inside a thin outer ring matches what the
          overlay actually renders on the stage, so the user knows what
          they're enabling without flipping the toggle. */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="relative inline-block w-5 h-5">
          <span className="absolute inset-0 rounded-full" style={{
            border: '1px solid var(--fg-link)',
            boxShadow: '0 0 6px color-mix(in srgb, var(--fg-link) 50%, transparent)',
          }} />
          <span className="absolute left-1/2 top-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--fg-link)]" />
        </span>
        <span className="text-xs text-[var(--fg-muted)]">
          {t('panel.detail.apiPreview')}
        </span>
      </div>

      <ToggleButton
        on={on}
        onClick={() => { ov.setApiRing(!on); }}
        label={on ? t('panel.disable') : t('panel.enable')}
      />
    </div>
  );
}
