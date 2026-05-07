import type { FileRecord } from '../model';

// Tarjan's strongly-connected-component algorithm.
// Returns array of components; components of size > 1 (or self-loops) are
// real cycles. We only consider intra-graph edges that exist in `deps`.
//
// Iterative form because the call graph can be deep (we'd blow the stack
// on a recursive DFS for ~600 nodes with long chains).
export type SCC = number[];

export function computeSCCs(files: FileRecord[]): SCC[] {
  const n = files.length;
  const index = new Int32Array(n).fill(-1);
  const lowlink = new Int32Array(n);
  const onStack = new Uint8Array(n);
  const stack: number[] = [];
  const result: SCC[] = [];
  let idx = 0;

  type Frame = { v: number; iter: number };
  for (let start = 0; start < n; start++) {
    if (index[start] !== -1) continue;
    const callStack: Frame[] = [{ v: start, iter: 0 }];
    index[start] = idx;
    lowlink[start] = idx;
    idx++;
    stack.push(start);
    onStack[start] = 1;

    while (callStack.length) {
      const top = callStack[callStack.length - 1];
      const v = top.v;
      const deps = files[v].deps;
      if (top.iter < deps.length) {
        const w = deps[top.iter++];
        if (index[w] === -1) {
          index[w] = idx;
          lowlink[w] = idx;
          idx++;
          stack.push(w);
          onStack[w] = 1;
          callStack.push({ v: w, iter: 0 });
        } else if (onStack[w]) {
          lowlink[v] = Math.min(lowlink[v], index[w]);
        }
      } else {
        // post-order: emit SCC if root
        if (lowlink[v] === index[v]) {
          const comp: number[] = [];
          let w: number;
          do {
            w = stack.pop()!;
            onStack[w] = 0;
            comp.push(w);
          } while (w !== v);
          result.push(comp);
        }
        callStack.pop();
        if (callStack.length) {
          const parent = callStack[callStack.length - 1];
          lowlink[parent.v] = Math.min(lowlink[parent.v], lowlink[v]);
        }
      }
    }
  }
  return result;
}

// Components that actually form a cycle: size >= 2, or size 1 with self-edge.
export function cycleSCCs(files: FileRecord[], all: SCC[]): SCC[] {
  return all.filter((c) => {
    if (c.length > 1) return true;
    const id = c[0];
    return files[id].deps.includes(id);
  });
}
