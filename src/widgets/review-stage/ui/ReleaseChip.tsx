// ─────────────────────────────────────────────────────────────────────────
// ReleaseChip — flag PRs that target a release/hotfix branch or carry
// a release-bound label, so the reviewer knows to apply
// release-train conventions (cherry-picks, change-log entries,
// freeze-window respect) before reading the diff.
//
// We render this in the hero only when targetsRelease is true — for
// the 90% case (PR → main), the chip would just be visual noise.
// ─────────────────────────────────────────────────────────────────────────

import { GitCommitVertical } from 'lucide-react';
import type { ReleaseReadiness } from '../lib/sota';
import { OK, SEV } from '../lib/tones';

export default function ReleaseChip({ readiness }: { readiness: ReleaseReadiness }) {
  if (!readiness.targetsRelease) return null;
  const color = readiness.tone === 'block' ? SEV.blocker
    : readiness.tone === 'warn' ? SEV.medium
    : OK;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md"
      title={readiness.detail}
      style={{
        background: `color-mix(in srgb, ${color} 10%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 33%, transparent)`,
      }}
    >
      <GitCommitVertical className="w-3 h-3" style={{ color }} strokeWidth={2.25} />
      <span className="text-xs font-bold uppercase tracking-eyebrow" style={{ color }}>
        release-bound
      </span>
    </span>
  );
}
