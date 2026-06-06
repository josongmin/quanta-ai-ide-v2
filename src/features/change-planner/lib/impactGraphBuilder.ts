// BFS-based impact graph builder.
//
// Given a seed and an adjacency map (id -> ids it directly affects), we walk
// outward in breadth-first order and tag every reachable node with a ring
// (hop distance) and a layer (heuristic by id pattern). Confidence degrades
// with distance — direct dependents are exact, 2-hop is overapprox, and
// anything beyond is unknown. This matches how real static-analysis radii
// behave: the further you reach, the less honest the call-graph becomes.

import type {
  ChangeSeed,
  ConfidenceState,
  ImpactEdge,
  ImpactGraph,
  ImpactLayer,
  ImpactNode,
  ImpactRing,
} from '../model/types';
import { edgeStyle, inferEdgeConfidence } from './confidenceModel';

type BuildOpts = {
  // Cap how far the BFS expands. Default is L3 — anything past 3 hops is
  // noise, and trying to render it tanks the SVG renderer in real datasets.
  maxRing?: ImpactRing;
}

const RING_LIMIT: Record<ImpactRing, number> = {
  L1: 1,
  L2: 2,
  L3: 3,
};

function ringForHop(hop: number): ImpactRing {
  if (hop <= 1) return 'L1';
  if (hop === 2) return 'L2';
  return 'L3';
}

const CONFIDENCE_BY_RING: Record<ImpactRing, ConfidenceState> = {
  L1: 'exact',
  L2: 'overapprox',
  L3: 'unknown',
};

function confidenceForRing(ring: ImpactRing): ConfidenceState {
  return CONFIDENCE_BY_RING[ring];
}

// Heuristic layer assignment from the id alone — production wires this to a
// real classifier; for the demo we lean on the naming conventions repos
// already follow. Order matters: 'test' is checked first so a config-test
// file lands in verification, not delivery.
function inferLayer(id: string): ImpactLayer {
  const lower = id.toLowerCase();
  if (lower.includes('test') || lower.includes('spec')) return 'verification';
  if (lower.includes('config') || lower.includes('flag') || lower.includes('env')) return 'delivery';
  if (lower.includes('api') || lower.includes('route') || lower.includes('handler')) return 'behavioral';
  return 'structural';
}

function labelFromId(id: string): string {
  // Compact label for the demo — strip directory prefix so the renderer
  // doesn't need ellipsis logic.
  const parts = id.split('/');
  return parts[parts.length - 1] ?? id;
}

function reasonForHop(hop: number, parentLabel: string): string {
  if (hop === 1) return `Direct dependent of ${parentLabel}`;
  if (hop === 2) return `Reached via ${parentLabel} (2 hops)`;
  return `Distant fanout via ${parentLabel}`;
}

export function buildImpactGraph(
  seed: ChangeSeed,
  adjacency: Record<string, string[]>,
  opts?: BuildOpts,
): ImpactGraph {
  const maxHop = RING_LIMIT[opts?.maxRing ?? 'L3'];

  const nodes: ImpactNode[] = [];
  const edges: ImpactEdge[] = [];
  const visited = new Map<string, ImpactNode>();

  // The seed itself is rendered at L1 — it's the centre of the radar but the
  // user already accepted its inclusion by picking it, so confidence is
  // exact and reason is intrinsic.
  const seedNode: ImpactNode = {
    id: seed.targetId,
    label: seed.label,
    ring: 'L1',
    layer: inferLayer(seed.targetId),
    confidence: 'exact',
    reason: 'Change seed',
  };
  nodes.push(seedNode);
  visited.set(seed.targetId, seedNode);

  // Standard BFS frontier. We track hop distance per-id so a node reached via
  // two different paths still gets its shortest-distance ring.
  const queue: { id: string; hop: number; parent: ImpactNode }[] = [];
  for (const child of adjacency[seed.targetId] ?? []) {
    queue.push({ id: child, hop: 1, parent: seedNode });
  }

  while (queue.length > 0) {
    const head = queue.shift();
    if (!head) break;
    const { id, hop, parent } = head;
    if (hop > maxHop) continue;

    let node = visited.get(id);
    if (!node) {
      const ring = ringForHop(hop);
      node = {
        id,
        label: labelFromId(id),
        ring,
        layer: inferLayer(id),
        confidence: confidenceForRing(ring),
        reason: reasonForHop(hop, parent.label),
      };
      nodes.push(node);
      visited.set(id, node);

      // Only enqueue children of newly-discovered nodes; revisiting a node
      // can't shorten its hop distance in BFS.
      for (const child of adjacency[id] ?? []) {
        if (!visited.has(child)) {
          queue.push({ id: child, hop: hop + 1, parent: node });
        }
      }
    }

    const conf = inferEdgeConfidence(parent.confidence, node.confidence);
    edges.push({
      from: parent.id,
      to: node.id,
      ring: node.ring,
      confidence: conf,
      style: edgeStyle(conf),
    });
  }

  return { seed, nodes, edges };
}
