// Surface icon registry (WB-401/404).
//
// Maps a manifest's icon NAME (a serialisable string) to a lucide component.
// Keyed by string (open), NOT by the closed TabKind union — this is not a
// central surface switch.
import { Bot, Brain, Code2, GitPullRequest, Inbox, Layers, ShieldCheck, Wand2, Wrench, type LucideProps } from 'lucide-react';
import type { ComponentType } from 'react';
import { SURFACE_IDS_ORDERED, getSurfaceMeta } from '@shared/config/surfaces';

export const SURFACE_ICONS: Record<string, ComponentType<LucideProps>> = {
  Brain,
  Code2,
  Bot,
  GitPullRequest,
  ShieldCheck,
  Wand2,
  Wrench,
  Layers,
  Inbox,
};

// Fail-closed: every icon name referenced by the surface metadata SoT must
// resolve to a component here. A missing entry would render `undefined` (a
// blank icon) silently — throw at module load instead so the drift is a hard
// programming error, not a cosmetic bug shipped to users.
(function assertIconsResolveForAllSurfaces(): void {
  const missing = SURFACE_IDS_ORDERED.filter((id) => {
    const meta = getSurfaceMeta(id);
    return meta === undefined || !(meta.icon in SURFACE_ICONS);
  });
  if (missing.length > 0) {
    throw new Error(
      `surface icon registry is missing components for: ` +
        missing.map((id) => `${id} (${getSurfaceMeta(id)?.icon ?? '?'})`).join(', '),
    );
  }
})();
