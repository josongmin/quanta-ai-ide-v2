import { type ComponentType } from 'react';
import { Heart, Target, ThumbsDown, ThumbsUp } from 'lucide-react';
import type { AgentTurn, ReactionKind } from '../types';

type TranslateFn = (k: string, opts?: Record<string, unknown>) => string;

export function ReactionBar({
  reactions,
  onReact,
  t,
}: {
  reactions: AgentTurn['reactions'];
  onReact: (kind: ReactionKind) => void;
  t: TranslateFn;
}) {
  const items: { kind: ReactionKind; Icon: ComponentType<{ className?: string; fill?: string }>; toneStyle: React.CSSProperties }[] = [
    { kind: 'thumbsUp', Icon: ThumbsUp, toneStyle: { color: 'var(--intent-success-fg)', background: 'color-mix(in srgb, var(--intent-success-vivid) 15%, transparent)' } },
    { kind: 'thumbsDown', Icon: ThumbsDown, toneStyle: { color: 'var(--intent-danger-fg)', background: 'color-mix(in srgb, var(--intent-danger-vivid) 15%, transparent)' } },
    { kind: 'heart', Icon: Heart, toneStyle: { color: 'var(--intent-danger-fg)', background: 'color-mix(in srgb, var(--intent-danger-vivid) 15%, transparent)' } },
    { kind: 'target', Icon: Target, toneStyle: { color: 'var(--intent-warn-fg)', background: 'color-mix(in srgb, var(--intent-warn-vivid) 15%, transparent)' } },
  ];
  const idle = 'text-[color:var(--fg-subtle)] hover:text-[color:var(--fg-default)] hover:bg-[color:var(--bg-hover)]';

  return (
    <div className="mt-2 flex items-center gap-0.5 opacity-60 hover:opacity-100 transition-opacity">
      {items.map(({ kind, Icon, toneStyle }) => {
        const active = reactions?.[kind];
        return (
          <button
            key={kind}
            type="button"
            onClick={() => { onReact(kind); }}
            title={t(`reactions.${kind}`)}
            aria-label={t(`reactions.${kind}`)}
            aria-pressed={!!active}
            style={active ? toneStyle : undefined}
            className={`p-1 rounded transition-colors ${active ? '' : idle}`}
          >
            <Icon className="w-3 h-3" fill={active ? 'currentColor' : 'none'} />
          </button>
        );
      })}
    </div>
  );
}
