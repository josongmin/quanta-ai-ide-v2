import { useEffect, useMemo, useRef } from 'react';
import type { RepoData, FolderRecord } from '@entities/repo';
import { useTranslation } from '@shared/i18n';

// Radial folder hierarchy (a.k.a. sunburst). The codebase tree wraps around
// itself: depth 1 folders fill the inner ring, depth 2 the next ring out,
// and so on, with each arc's angular width proportional to its file count.
// This is the same chart that observability and storage tools (Datadog,
// Grafana, GoogleCloud, krew, FlameGraph, etc.) reach for when "what's
// taking up space here?" is the question. It answers two things at once:
//   - which subtrees dominate the codebase (the wide arcs)
//   - how deep the folder structure goes (how many rings there are)

type Props = {
  repo: RepoData;
  isDark: boolean;
  size?: number;
};

type Arc = {
  path: string;
  depth: number;
  start: number;
  end: number;
  name: string;
  color: string;
  textPath?: string;
  showLabel: boolean;
};

export default function SunburstHierarchy({ repo, isDark, size = 280 }: Props) {
  const { t } = useTranslation('inspect');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const data = useMemo(() => {
    const root = repo.folders.find((f) => f.depth === 0);
    if (!root) return { arcs: [] as Arc[], total: 0, maxDepth: 0 };

    const cx = size / 2;
    const cy = size / 2;
    const ringWidth = Math.min(28, (size / 2 - 24) / 4);
    const innerR = 22;

    const arcs: Arc[] = [];
    let maxDepth = 0;

    const fileCount = (folder: FolderRecord): number => {
      let n = folder.fileIds.length;
      for (const cp of folder.childPaths) {
        const child = repo.foldersByPath.get(cp);
        if (child) n += fileCount(child);
      }
      return n;
    };

    const totalFiles = fileCount(root);

    const recurse = (folder: FolderRecord, start: number, end: number) => {
      if (folder.depth > maxDepth) maxDepth = folder.depth;
      if (folder.depth > 0) {
        const r0 = innerR + (folder.depth - 1) * ringWidth;
        const r1 = r0 + ringWidth;
        const path = arcPath(cx, cy, r0, r1, start, end);
        const span = Math.abs(end - start);
        const colorIdx = topLevelIndex(folder, repo);
        const color = paletteAt(colorIdx, folder.depth, isDark);
        const showLabel = folder.depth === 1 && span > 0.18;
        const textPath = showLabel
          ? labelArcPath(cx, cy, (r0 + r1) / 2, start + 0.02, end - 0.02)
          : undefined;
        arcs.push({
          path,
          depth: folder.depth,
          start, end,
          name: folder.name,
          color,
          textPath,
          showLabel,
        });
      }

      const childCounts = folder.childPaths.map((cp) => {
        const child = repo.foldersByPath.get(cp);
        return { cp, child, n: child ? fileCount(child) : 0 };
      });
      const ownN = folder.fileIds.length;
      const childTotal = childCounts.reduce((a, c) => a + c.n, 0);
      const total = ownN + childTotal || 1;

      let cursor = start;
      for (const { child, n } of childCounts) {
        if (!child || n === 0) continue;
        const slice = ((end - start) * n) / total;
        recurse(child, cursor, cursor + slice);
        cursor += slice;
      }
    };

    recurse(root, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2);

    return { arcs, total: totalFiles, maxDepth };
  }, [repo, size, isDark]);

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

    const cx = size / 2;
    const cy = size / 2;

    // background hub
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)';
    ctx.font = '700 8px Inter, ui-sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t('deps.rootLabel', { defaultValue: 'root' }).toUpperCase(), cx, cy - 4);
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.40)';
    ctx.font = '600 9px ui-monospace, SFMono-Regular, monospace';
    ctx.fillText(`${data.total}`, cx, cy + 6);

    for (const arc of data.arcs) {
      ctx.fillStyle = arc.color;
      const path = new Path2D(arc.path);
      ctx.fill(path);
      ctx.strokeStyle = isDark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 0.7;
      ctx.stroke(path);
    }

    // depth-1 labels along the arc
    ctx.font = '700 8.5px Inter, ui-sans-serif';
    ctx.fillStyle = isDark ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.95)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const arc of data.arcs) {
      if (!arc.showLabel) continue;
      const cxa = (arc.start + arc.end) / 2;
      const r = 22 + (arc.depth - 0.5) * Math.min(28, (size / 2 - 24) / 4);
      const tx = size / 2 + Math.cos(cxa) * r;
      const ty = size / 2 + Math.sin(cxa) * r;
      ctx.save();
      ctx.translate(tx, ty);
      const rot = cxa + Math.PI / 2;
      ctx.rotate(rot > Math.PI / 2 && rot < (3 * Math.PI) / 2 ? rot + Math.PI : rot);
      ctx.fillText(arc.name.toUpperCase().slice(0, 8), 0, 0);
      ctx.restore();
    }
  }, [data, isDark, size, t]);

  return (
    <div className="flex flex-col items-center w-full">
      <canvas ref={canvasRef} />
      <div className={`mt-1 text-[9px] uppercase tracking-[0.18em] ${
        isDark ? 'text-white/40' : 'text-black/40'
      }`}>
        {t('deps.sunburstSummary', {
          n: data.total,
          depth: data.maxDepth,
          defaultValue: `${data.total} files · ${data.maxDepth} levels deep`,
        })}
      </div>
    </div>
  );
}

function arcPath(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number): string {
  const large = Math.abs(a1 - a0) > Math.PI ? 1 : 0;
  const x0a = cx + Math.cos(a0) * r0;
  const y0a = cy + Math.sin(a0) * r0;
  const x1a = cx + Math.cos(a1) * r0;
  const y1a = cy + Math.sin(a1) * r0;
  const x0b = cx + Math.cos(a0) * r1;
  const y0b = cy + Math.sin(a0) * r1;
  const x1b = cx + Math.cos(a1) * r1;
  const y1b = cy + Math.sin(a1) * r1;
  return [
    `M ${x0b} ${y0b}`,
    `A ${r1} ${r1} 0 ${large} 1 ${x1b} ${y1b}`,
    `L ${x1a} ${y1a}`,
    `A ${r0} ${r0} 0 ${large} 0 ${x0a} ${y0a}`,
    'Z',
  ].join(' ');
}

function labelArcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const large = Math.abs(a1 - a0) > Math.PI ? 1 : 0;
  const x0 = cx + Math.cos(a0) * r;
  const y0 = cy + Math.sin(a0) * r;
  const x1 = cx + Math.cos(a1) * r;
  const y1 = cy + Math.sin(a1) * r;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
}

// Stable color per top-level subtree, slightly desaturated as depth grows
const HUES_DARK  = ['#7a9fc9', '#c97a8e', '#9ec97a', '#c9b27a', '#a37af7', '#7ac9c0', '#c9967a', '#a8b3c4'];
const HUES_LIGHT = ['#4d78a8', '#a85469', '#6ea84d', '#a88b4d', '#7d4dc9', '#4da89e', '#a86b4d', '#6f7c8c'];

function topLevelIndex(folder: FolderRecord, repo: RepoData): number {
  let cur: FolderRecord | undefined = folder;
  while (cur && cur.depth > 1) {
    const parent: FolderRecord | undefined = cur.parentPath
      ? repo.foldersByPath.get(cur.parentPath)
      : undefined;
    if (!parent) break;
    cur = parent;
  }
  if (cur?.depth !== 1) return 0;
  const root = repo.folders.find((f) => f.depth === 0);
  if (!root) return 0;
  const idx = root.childPaths.indexOf(cur.path);
  return Math.max(0, idx);
}

function paletteAt(idx: number, depth: number, isDark: boolean): string {
  const palette = isDark ? HUES_DARK : HUES_LIGHT;
  const base = palette[idx % palette.length];
  // Fade outer rings
  const alpha = Math.max(0.45, 1 - (depth - 1) * 0.15);
  const { r, g, b } = hexToRgb(base);
  return `rgba(${r},${g},${b},${alpha})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}
