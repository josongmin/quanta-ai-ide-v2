// ─────────────────────────────────────────────────────────────────────────
// StackChip — surfaces Graphite/Sapling-style stacked-PR position
// ("2/4 in stack"). Hover/focus reveals the full ladder so a reviewer
// can decide "is this branch self-contained or should I read the
// parent first?" before clicking in.
//
// We render the chip only when `info.stackKey !== null`; standalone PRs
// don't advertise a stack of one.
// ─────────────────────────────────────────────────────────────────────────

import { Layers } from 'lucide-react';
import type { StackInfo } from '../lib/insights2026';

export default function StackChip({ info, dense = false }: { info: StackInfo; dense?: boolean }) {
  if (info.stackKey === null || info.position === null) return null;

  const tooltip = info.siblings
    .map((s) => `${s.merged ? '✓' : '·'} #${String(s.number)} ${s.title}`)
    .join('\n');

  return (
    <span
      className="inline-flex items-center gap-1 font-mono tabular-nums text-[#9583b8]"
      style={{ fontSize: dense ? 10 : 11 }}
      title={`${info.stackKey} · ${String(info.position)} of ${String(info.total)}\n${tooltip}`}
    >
      <Layers className="w-2.5 h-2.5" strokeWidth={2.25} />
      {info.position}/{info.total}
    </span>
  );
}
