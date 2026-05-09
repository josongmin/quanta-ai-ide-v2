import type { CSSProperties } from 'react';
import type { SourceTool } from '@entities/investigation';

type Props = {
  tool: SourceTool;
};

const SHORT: Record<SourceTool, string> = {
  taint_flow: 'taint',
  find_references: 'refs',
  change_impact: 'impact',
  function_summary: 'fnsum',
  semantic_search: 'sem',
  lexical_search: 'lex',
  hybrid_search: 'hybrid',
  go_to_definition: 'def',
  graph_path: 'graph',
  proof_analysis: 'proof',
  index_status: 'idx',
  incremental: 'inc',
  explain: 'expl',
};

// Provenance label so a viewer can immediately see which static-analysis
// tool produced the evidence.
export function SourceToolBadge({ tool }: Props) {
  const style: CSSProperties = {
    color: 'var(--fg-subtle)',
    fontSize: '9px',
    lineHeight: 1,
  };
  return (
    <span
      title={tool}
      style={style}
      className="inline-flex items-center font-mono uppercase tracking-wider"
    >
      {SHORT[tool]}
    </span>
  );
}
