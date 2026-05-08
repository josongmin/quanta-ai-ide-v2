// ─────────────────────────────────────────────────────────────────────────
// Section title strip used by Overview / Checks / Activity scenes. Three
// pieces: leading icon, uppercase title, optional right-aligned hint.
// ─────────────────────────────────────────────────────────────────────────

import type { LucideIcon } from 'lucide-react';

export default function SceneHeader({
  icon: Icon, title, hint,
}: { icon: LucideIcon; title: string; hint?: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-3.5 h-3.5 text-white/55" />
      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">
        {title}
      </span>
      {hint !== undefined && (
        <span className="text-[10px] font-mono text-white/40 ml-auto">{hint}</span>
      )}
    </div>
  );
}
