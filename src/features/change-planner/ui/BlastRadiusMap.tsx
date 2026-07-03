// BlastRadiusMap — list-based renderer for the impact graph.
//
// Three sections (L1 / L2 / L3), each listing the nodes in that ring and
// the edges that *terminate* in that ring. Edges are styled by confidence:
//   - solid  → opacity-100, solid border
//   - dashed → border-dashed, full opacity
//   - faded  → opacity-50
// SVG-free on purpose: the spec asks for a fast scannable list, not a
// pretty graph; force-directed layouts hide more than they show on real
// repos. No left-edge coloured stripes anywhere — confidence is encoded by
// border-style + opacity, ring is encoded by section header.

import { useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import type {
  ConfidenceState,
  ImpactEdge,
  ImpactGraph,
  ImpactNode,
  ImpactRing,
} from '../model/types';

type Props = {
  graph: ImpactGraph;
}

const RING_LABEL: Record<ImpactRing, string> = {
  L1: 'L1 · direct',
  L2: 'L2 · two-hop',
  L3: 'L3 · distant',
};

const RING_HINT: Record<ImpactRing, string> = {
  L1: 'Edges here are exact — the engine traced them directly.',
  L2: 'Two hops out. Some over-approximation; verify before assuming.',
  L3: 'Beyond two hops the call graph gets unreliable. Treat as suspects.',
};

const CONF_LABEL: Record<ConfidenceState, string> = {
  exact: 'exact',
  overapprox: 'overapprox',
  unknown: 'unknown',
};

// Edge wrapper styling per confidence. We use border-style + opacity rather
// than colour fills because the team has called out (3+ times) that left-
// edge / accent stripes are off-limits anywhere in the app.
type EdgeRowStyle = {
  className: string;
  borderColor: string;
  opacity: number;
};

const EDGE_ROW_STYLE: Record<ConfidenceState, EdgeRowStyle> = {
  exact: {
    className: 'border',
    borderColor: 'var(--border-default)',
    opacity: 1,
  },
  overapprox: {
    className: 'border border-dashed',
    borderColor: 'var(--border-default)',
    opacity: 1,
  },
  unknown: {
    className: 'border border-dashed',
    borderColor: 'var(--border-muted)',
    opacity: 0.5,
  },
};

function edgeRowStyle(conf: ConfidenceState): EdgeRowStyle {
  return EDGE_ROW_STYLE[conf];
}

function NodeChip({ node }: { node: ImpactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono"
      style={{
        background: 'var(--bg-elevated)',
        color: 'var(--fg-default)',
      }}
      title={node.reason}
    >
      <span>{node.label}</span>
      <span
        className="text-2xs uppercase tracking-eyebrow font-black"
        style={{ color: 'var(--fg-subtle)' }}
      >
        {node.layer}
      </span>
    </span>
  );
}

function EdgeRow({
  edge,
  fromNode,
  toNode,
}: {
  edge: ImpactEdge;
  fromNode: ImpactNode;
  toNode: ImpactNode;
}) {
  const style = edgeRowStyle(edge.confidence);
  return (
    <li
      className={`flex items-center gap-2 px-2 py-1.5 rounded-md ${style.className}`}
      style={{
        borderColor: style.borderColor,
        background: 'var(--bg-surface-muted)',
        opacity: style.opacity,
      }}
    >
      <NodeChip node={fromNode} />
      <ArrowRight
        className="w-2.5 h-2.5 shrink-0"
        style={{ color: 'var(--fg-subtle)' }}
      />
      <NodeChip node={toNode} />
      <span
        className="ml-auto text-2xs font-black uppercase tracking-[0.16em] shrink-0"
        style={{ color: 'var(--fg-subtle)' }}
      >
        {CONF_LABEL[edge.confidence]}
      </span>
    </li>
  );
}

export function BlastRadiusMap({ graph }: Props) {
  // `graph` is a stable prop, so the id→node index only needs to be rebuilt
  // when the node set actually changes. Keyed on `graph.nodes` to avoid the
  // per-render Map allocation + repopulation.
  const nodeById = useMemo(() => {
    const map = new Map<string, ImpactNode>();
    for (const n of graph.nodes) map.set(n.id, n);
    return map;
  }, [graph.nodes]);

  // Bucket edges by the ring of their downstream node — that's the ring the
  // edge "lives in" from a reviewer's POV, since L1 → L2 represents an L2
  // impact.
  const edgesByRing: Record<ImpactRing, ImpactEdge[]> = {
    L1: [],
    L2: [],
    L3: [],
  };
  for (const edge of graph.edges) {
    const to = nodeById.get(edge.to);
    if (!to) continue;
    edgesByRing[to.ring].push(edge);
  }

  const rings: ImpactRing[] = ['L1', 'L2', 'L3'];

  return (
    <div className="space-y-3">
      <div
        className="rounded-xl border px-3 py-2.5"
        style={{
          background: 'var(--bg-surface-muted)',
          borderColor: 'var(--border-default)',
        }}
      >
        <div
          className="text-2xs font-black uppercase tracking-eyebrow"
          style={{ color: 'var(--fg-subtle)' }}
        >
          Blast radius · seed
        </div>
        <div
          className="mt-1 text-sm font-mono"
          style={{ color: 'var(--fg-default)' }}
        >
          {graph.seed.label}
          <span
            className="ml-2 text-2xs uppercase tracking-[0.16em] font-black"
            style={{ color: 'var(--fg-subtle)' }}
          >
            {graph.seed.kind}
          </span>
        </div>
      </div>

      {rings.map((ring) => {
        const edges = edgesByRing[ring];
        const nodes = graph.nodes.filter((n) => n.ring === ring);
        if (edges.length === 0 && nodes.length === 0) return null;

        return (
          <section
            key={ring}
            className="rounded-xl border overflow-hidden"
            style={{
              background: 'var(--bg-surface-muted)',
              borderColor: 'var(--border-default)',
            }}
          >
            <header className="px-3 py-2 flex items-baseline gap-2">
              <span
                className="text-2xs font-black uppercase tracking-eyebrow"
                style={{ color: 'var(--fg-subtle)' }}
              >
                {RING_LABEL[ring]}
              </span>
              <span
                className="text-xs font-mono tabular-nums"
                style={{ color: 'var(--fg-subtle)' }}
              >
                {nodes.length} nodes · {edges.length} edges
              </span>
            </header>
            <p
              className="px-3 pb-2 text-xs leading-snug"
              style={{ color: 'var(--fg-muted)' }}
            >
              {RING_HINT[ring]}
            </p>

            {edges.length > 0 ? (
              <ul className="px-2 pb-2 space-y-1">
                {edges.map((edge, idx) => {
                  const fromNode = nodeById.get(edge.from);
                  const toNode = nodeById.get(edge.to);
                  if (!fromNode || !toNode) return null;
                  return (
                    <EdgeRow
                      key={`${edge.from}->${edge.to}-${idx.toString()}`}
                      edge={edge}
                      fromNode={fromNode}
                      toNode={toNode}
                    />
                  );
                })}
              </ul>
            ) : (
              <div
                className="px-3 pb-2 text-xs italic"
                style={{ color: 'var(--fg-subtle)', opacity: 0.7 }}
              >
                No edges in this ring.
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
