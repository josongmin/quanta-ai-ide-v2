import {
  Search, ArrowRight,
  Brain, Code2, Bot, GitPullRequest, ShieldCheck, Wand2, Sun, Moon,
  Undo2, Coins, Activity, HelpCircle, History, List, Palette,
  type LucideIcon,
} from 'lucide-react';
import type { Command } from '../../model/types';
import type { Skin } from '../../lib/paletteSkin';

const ICONS: Record<string, LucideIcon> = {
  brain:    Brain,
  search:   Search,
  code:     Code2,
  bot:      Bot,
  pr:       GitPullRequest,
  shield:   ShieldCheck,
  wand:     Wand2,
  sun:      Sun,
  moon:     Moon,
  undo:     Undo2,
  coins:    Coins,
  activity: Activity,
  help:     HelpCircle,
  history:  History,
  list:     List,
  palette:  Palette,
};

export function CommandRow({
  cmd, active, flatIndex, onHover, onRun, skin,
}: {
  cmd: Command;
  active: boolean;
  flatIndex: number;
  onHover: () => void;
  onRun: () => void;
  skin: Skin;
}) {
  const Icon = cmd.iconKey ? ICONS[cmd.iconKey] ?? null : null;
  const HistoryIcon = cmd.kind === 'recent' ? History : null;
  return (
    <div
      role="option"
      aria-selected={active}
      data-cursor={flatIndex}
      tabIndex={-1}
      onMouseEnter={onHover}
      onClick={onRun}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRun(); } }}
      className="flex items-center gap-2.5 mx-1.5 px-2.5 h-9 rounded-md cursor-pointer transition-colors"
      style={{
        background: active ? skin.rowActiveBg : 'transparent',
        color: active ? skin.rowActiveText : skin.rowText,
      }}
    >
      <span
        className="shrink-0 w-5 h-5 rounded flex items-center justify-center transition-colors"
        style={{
          background: active ? skin.iconWellActiveBg : skin.iconWellIdleBg,
          color: active ? skin.iconColorActive : skin.iconColorIdle,
        }}
      >
        {HistoryIcon ? <HistoryIcon className="w-3 h-3" />
          : Icon ? <Icon className="w-3.5 h-3.5" />
          : <ArrowRight className="w-3 h-3" />}
      </span>
      <span className="flex-1 min-w-0 text-base truncate">{cmd.label}</span>
      {cmd.hint !== undefined && (
        <span className="text-xs font-mono shrink-0" style={{ color: skin.chipText }}>
          {cmd.hint}
        </span>
      )}
      {cmd.shortcut !== undefined && (
        <span
          className="text-2xs font-mono px-1.5 py-0.5 rounded shrink-0"
          style={{
            background: skin.chipBg,
            color: skin.chipText,
            border: `1px solid ${skin.chipBorder}`,
          }}
        >
          {cmd.shortcut}
        </span>
      )}
    </div>
  );
}
