import type { CouplingEdge, CouplingLevel, TemporalCouplingCluster } from '../model';

type Commit = { files: number[] };

export function computeCouplingClusters(
  commits: Commit[],
  threshold = 0.4,
  level: CouplingLevel = 'file',
): CouplingEdge[] {
  const individual = new Map<number, number>();
  const pair = new Map<string, number>();

  for (const commit of commits) {
    const unique = Array.from(new Set(commit.files));
    for (const f of unique) {
      individual.set(f, (individual.get(f) ?? 0) + 1);
    }
    for (let i = 0; i < unique.length; i++) {
      for (let j = i + 1; j < unique.length; j++) {
        const a = unique[i];
        const b = unique[j];
        const lo = a < b ? a : b;
        const hi = a < b ? b : a;
        const key = `${lo}:${hi}`;
        pair.set(key, (pair.get(key) ?? 0) + 1);
      }
    }
  }

  const edges: CouplingEdge[] = [];
  for (const [key, coChangeCount] of pair) {
    const [loStr, hiStr] = key.split(':');
    const lo = Number(loStr);
    const hi = Number(hiStr);
    const denom = Math.max(individual.get(lo) ?? 0, individual.get(hi) ?? 0, 1);
    const ratio = coChangeCount / denom;
    if (ratio >= threshold) {
      edges.push({
        fromFileId: lo,
        toFileId: hi,
        coChangeCount,
        coChangeRatio: ratio,
        level,
      });
    }
  }

  edges.sort((a, b) => b.coChangeRatio - a.coChangeRatio);
  return edges;
}

class UnionFind {
  private readonly parent = new Map<number, number>();

  find(x: number): number {
    if (!this.parent.has(x)) {
      this.parent.set(x, x);
      return x;
    }
    let root = x;
    while (this.parent.get(root) !== root) {
      root = this.parent.get(root)!;
    }
    let cur = x;
    while (this.parent.get(cur) !== root) {
      const next = this.parent.get(cur)!;
      this.parent.set(cur, root);
      cur = next;
    }
    return root;
  }

  union(a: number, b: number): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
}

export function groupClusters(edges: CouplingEdge[]): TemporalCouplingCluster[] {
  const uf = new UnionFind();
  for (const e of edges) {
    uf.union(e.fromFileId, e.toFileId);
  }

  const buckets = new Map<number, { files: Set<number>; edges: CouplingEdge[] }>();
  for (const e of edges) {
    const root = uf.find(e.fromFileId);
    let bucket = buckets.get(root);
    if (!bucket) {
      bucket = { files: new Set(), edges: [] };
      buckets.set(root, bucket);
    }
    bucket.files.add(e.fromFileId);
    bucket.files.add(e.toFileId);
    bucket.edges.push(e);
  }

  const clusters: TemporalCouplingCluster[] = [];
  for (const [root, bucket] of buckets) {
    if (bucket.edges.length === 0) continue;
    const sum = bucket.edges.reduce((s, e) => s + e.coChangeRatio, 0);
    const level = bucket.edges[0].level;
    clusters.push({
      id: `cluster:${root}`,
      fileIds: Array.from(bucket.files).sort((a, b) => a - b),
      edges: bucket.edges,
      level,
      averageRatio: sum / bucket.edges.length,
    });
  }

  clusters.sort((a, b) => b.averageRatio - a.averageRatio);
  return clusters;
}
