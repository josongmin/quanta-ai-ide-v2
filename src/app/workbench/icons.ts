// Surface icon registry (WB-401/404).
//
// Maps a manifest's icon NAME (a serialisable string) to a lucide component.
// Keyed by string (open), NOT by the closed TabKind union — this is not a
// central surface switch.
import { Bot, Brain, Code2, GitPullRequest, Inbox, Layers, ShieldCheck, Wand2, Wrench, type LucideProps } from 'lucide-react';
import type { ComponentType } from 'react';

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
