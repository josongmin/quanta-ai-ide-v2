import type { AgentBlock } from '../types';
import { TextBlockView } from './blocks/TextBlockView';
import { ThinkingBlockView } from './blocks/ThinkingBlockView';
import { PlanBlockView } from './blocks/PlanBlockView';
import { ToolBlockView } from './blocks/ToolBlockView';
import { DiffBlockView } from './blocks/DiffBlockView';
import { DiffPreviewBlockView } from './blocks/DiffPreviewBlockView';

// Dispatch barrel: each block knows how to render itself in its own
// file under ./blocks/. This wrapper just routes by `kind`. Per-block
// components are wrapped in React.memo so unrelated block updates in
// the same turn don't re-render every sibling.
export function BlockView({ block, isDark }: { block: AgentBlock; isDark: boolean }) {
  if (block.kind === 'text') return <TextBlockView block={block} isDark={isDark} />;
  if (block.kind === 'thinking') return <ThinkingBlockView block={block} isDark={isDark} />;
  if (block.kind === 'plan') return <PlanBlockView block={block} isDark={isDark} />;
  if (block.kind === 'tool') return <ToolBlockView block={block} isDark={isDark} />;
  if (block.kind === 'diff-preview') return <DiffPreviewBlockView block={block} isDark={isDark} />;
  return <DiffBlockView block={block} isDark={isDark} />;
}

// Re-export the per-block views so callers that want to skip the
// dispatcher can import them directly.
export {
  TextBlockView,
  ThinkingBlockView,
  PlanBlockView,
  ToolBlockView,
  DiffBlockView,
  DiffPreviewBlockView,
};
