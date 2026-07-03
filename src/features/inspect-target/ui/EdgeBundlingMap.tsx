import { useEffect, useMemo, useRef } from 'react';
import type { RepoData, FileRecord, FolderRecord } from '@entities/repo';
import { C, formatNumber } from '@shared/lib';
import { useTranslation } from '@shared/i18n';

// Hierarchical Edge Bundling à la Holten 2006.
//
// Strategy (kept compact for an in-card visualization):
//   - Lay file leaves on a circle, ordered by their full folder path so
//     siblings land next to each other.
//   - For each dependency a→b, route a Bezier through the *path-sharing
//     ancestors* of a and b, expressed as a fraction of the radius. The
//     more shared ancestors, the deeper the curve dips toward the center.
//
// We don't run a real B-spline; a single quadratic curve through the
// shared-ancestor centroid is enough at this size and avoids a layout pass.

type Props = {
  repo: RepoData;
  isDark: boolean;
  size?: number;       // px (square)
  maxEdges?: number;   // safety cap
};

export default function EdgeBundlingMap({
  repo, isDark, size = 280, maxEdges = 400,
}: Props) {
  const { t } = useTranslation('inspect');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const layout = useMemo(() => buildLayout(repo, size), [repo, size]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    // ── 1. background ring (folder bands) ──
    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 14;

    // Folder arc backdrop — different folders separated by faint sectors.
    for (const seg of layout.folderArcs) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius + 4, seg.startAngle, seg.endAngle);
      ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
      ctx.lineWidth = 6;
      ctx.stroke();
    }

    // ── 2. edges (bundled) ──
    const edges = layout.edges.slice(0, maxEdges);
    ctx.lineWidth = 0.6;
    for (const e of edges) {
      const a = layout.leafByFileId[e.from];
      const b = layout.leafByFileId[e.to];
      if (!a || !b) continue;

      // Bend toward the shared-ancestor anchor on the radius, scaled by
      // ancestor depth. Same-folder pairs barely curve; cross-folder pairs
      // dive much deeper toward center.
      const sharedDepth = sharedPrefix(a.parts, b.parts);
      const totalDepth = Math.max(a.parts.length, b.parts.length, 1);
      const dip = 1 - sharedDepth / totalDepth;          // 0..1
      const ctrlR = radius * (0.95 - 0.85 * dip);

      // Anchor angle = midpoint between the two leaves on the unit circle.
      const aAng = a.angle;
      const bAng = b.angle;
      let mid = (aAng + bAng) / 2;
      // Take the short way around the circle (avoid 180° detours).
      if (Math.abs(aAng - bAng) > Math.PI) mid += Math.PI;
      const ctrlX = cx + Math.cos(mid) * ctrlR;
      const ctrlY = cy + Math.sin(mid) * ctrlR;

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(ctrlX, ctrlY, b.x, b.y);
      // Tone: vulnerable target → red, otherwise muted base.
      const target = repo.files[e.to];
      const isVuln = target.metrics.security || target.status === 'SECURITY_ALERT';
      ctx.strokeStyle = isVuln
        ? (isDark ? 'rgba(217,138,133,0.55)' : 'rgba(168,58,63,0.55)')
        : (isDark ? 'rgba(180,200,220,0.10)' : 'rgba(40,60,80,0.10)');
      ctx.stroke();
    }

    // ── 3. leaves ──
    for (const leaf of layout.leaves) {
      const f = repo.files[leaf.fileId];
      const dot = leaf.color(isDark, f);
      ctx.beginPath();
      ctx.arc(leaf.x, leaf.y, 1.4, 0, Math.PI * 2);
      ctx.fillStyle = dot;
      ctx.fill();
    }

    // ── 4. folder labels along the ring (only top-level folders, every nth) ──
    ctx.font = '700 8px Inter, ui-sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const f of layout.folderArcs) {
      if (f.depth !== 1) continue;
      const ang = (f.startAngle + f.endAngle) / 2;
      const tx = cx + Math.cos(ang) * (radius + 14);
      const ty = cy + Math.sin(ang) * (radius + 14);
      ctx.fillStyle = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)';
      ctx.fillText(f.name.toUpperCase(), tx, ty);
    }
  }, [layout, isDark, repo, size, maxEdges]);

  return (
    <div className="flex flex-col items-center">
      <canvas ref={canvasRef} />
      <div className="mt-1 text-2xs uppercase tracking-eyebrow text-[color:var(--fg-subtle)]">
        {t('deps.edgesSummary', { n: formatNumber(layout.edges.length) })}
      </div>
    </div>
  );
}

// ─── layout ─────────────────────────────────────────────────────────

type Leaf = {
  fileId: number;
  parts: string[];
  angle: number;
  x: number;
  y: number;
  color: (isDark: boolean, f: FileRecord) => string;
};
type FolderArc = {
  path: string;
  name: string;
  depth: number;
  startAngle: number;
  endAngle: number;
};
type Layout = {
  leaves: Leaf[];
  leafByFileId: Record<number, Leaf>;
  folderArcs: FolderArc[];
  edges: { from: number; to: number }[];
};

function buildLayout(repo: RepoData, size: number): Layout {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 14;

  // Order files by full path so siblings cluster, and gather file counts
  // per folder for arc spans.
  const files = repo.files
    .map((f) => ({ f, key: f.folderPath ? `${f.folderPath}.${f.name}` : f.name }))
    .sort((a, b) => a.key.localeCompare(b.key));

  const leaves: Leaf[] = [];
  const leafByFileId: Record<number, Leaf> = {};
  const total = files.length || 1;

  for (let i = 0; i < files.length; i++) {
    const { f } = files[i];
    const angle = (i / total) * Math.PI * 2 - Math.PI / 2; // start at top
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    const leaf: Leaf = {
      fileId: f.id,
      parts: [...f.folderParts, f.name],
      angle,
      x, y,
      color: dotColor(f),
    };
    leaves.push(leaf);
    leafByFileId[f.id] = leaf;
  }

  // Folder arcs: walk children in tree order, span = sum of leaf counts.
  const folderArcs: FolderArc[] = [];
  const root = repo.folders.find((f) => f.depth === 0);
  if (root) walkFolder(root, repo, leafByFileId, folderArcs);

  // Edges (deduped — only one direction)
  const edges: { from: number; to: number }[] = [];
  for (const f of repo.files) {
    for (const t of f.deps) {
      edges.push({ from: f.id, to: t });
    }
  }

  return { leaves, leafByFileId, folderArcs, edges };
}

function dotColor(_f: FileRecord) {
  return (isDark: boolean, file: FileRecord) => {
    if (file.metrics.security || file.status === 'SECURITY_ALERT') {
      return isDark ? '#d98a85' : '#a83a3f';
    }
    if (file.status === 'NEW' || file.status === 'MODIFIED') {
      return isDark ? C.ok : '#1a7f37';
    }
    if (file.isGenerated || file.layer === 'vendor') {
      return isDark ? 'rgba(163,113,247,0.85)' : '#6f5d99';
    }
    return isDark ? 'rgba(180,190,200,0.55)' : 'rgba(60,70,80,0.55)';
  };
  // (the closure ignores `f` itself; we re-read from the live FileRecord at draw time)
}

function walkFolder(
  folder: FolderRecord,
  repo: RepoData,
  leafByFileId: Record<number, Leaf>,
  out: FolderArc[],
) {
  // Collect angle range from descendant leaves
  const fileIds: number[] = [];
  collectFiles(folder, repo, fileIds);
  if (fileIds.length === 0) return;
  const angles = fileIds.map((id) => leafByFileId[id]?.angle ?? 0).filter((a) => Number.isFinite(a));
  if (angles.length === 0) return;
  const start = Math.min(...angles);
  const end = Math.max(...angles);
  if (folder.depth > 0) {
    out.push({
      path: folder.path,
      name: folder.name,
      depth: folder.depth,
      startAngle: start - 0.01,
      endAngle: end + 0.01,
    });
  }
  for (const childPath of folder.childPaths) {
    const child = repo.foldersByPath.get(childPath);
    if (child) walkFolder(child, repo, leafByFileId, out);
  }
}

function collectFiles(folder: FolderRecord, repo: RepoData, out: number[]) {
  for (const id of folder.fileIds) out.push(id);
  for (const childPath of folder.childPaths) {
    const child = repo.foldersByPath.get(childPath);
    if (child) collectFiles(child, repo, out);
  }
}

// Number of common ancestors at the front of two path arrays
function sharedPrefix(a: string[], b: string[]): number {
  let n = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    if (a[i] === b[i]) n++;
    else break;
  }
  return n;
}
