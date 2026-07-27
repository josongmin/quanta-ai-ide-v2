import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { getSurfaceMeta } from '@shared/config/surfaces';

// Localized display title for a surfaceId. The `surfaces` namespace holds the
// per-surface titles (nested under `core.*`); the host-neutral metadata title
// (surfaces.ts) is the fallback default, so an untranslated/unknown surface
// still shows a sensible name.
export function useSurfaceTitle(): (surfaceId: string) => string {
  const { t } = useTranslation('surfaces');
  return useCallback(
    (surfaceId: string) => t(surfaceId, { defaultValue: getSurfaceMeta(surfaceId)?.title ?? surfaceId }),
    [t],
  );
}
