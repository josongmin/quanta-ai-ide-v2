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
export function BlockView({ block }: { block: AgentBlock }) {
  if (block.kind === 'text') return <TextBlockView block={block} />;
  if (block.kind === 'thinking') return <ThinkingBlockView block={block} />;
  if (block.kind === 'plan') return <PlanBlockView block={block} />;
  if (block.kind === 'tool') return <ToolBlockView block={block} />;
  if (block.kind === 'diff-preview') return <DiffPreviewBlockView block={block} />;
  return <DiffBlockView block={block} />;
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
