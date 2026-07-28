import { useEffect, useMemo, useRef } from 'react';
import type { RepoData } from '@entities/repo';
import { useTranslation, formatNumber } from '@shared/i18n';

// Squarified treemap (Bruls/Huijsmans/van Wijk 2000). Same algorithm
// WinDirStat, Disk Inventory X, and GitHub's code-volume widget use:
// rectangles tile the canvas without gaps, sized by file LOC, colored
// by the top-level group they belong to. Aspect ratios stay close to 1
// so labels remain readable instead of degenerating into long thin
// strips. The dominant question this answers: "where is the weight of
// the codebase actually sitting?"

type Props = {
  repo: RepoData;
  isDark: boolean;
  size?: number;
};

const PALETTE_DARK = [
  '#7aa9d9', '#d97a9c', '#9cd97a', '#d9b87a',
  '#a37af7', '#7ad9c8', '#d9967a', '#b3bcca',
];
const PALETTE_LIGHT = [
  '#3d7aae', '#a8466b', '#5fa83e', '#a88a3e',
  '#7d4dc9', '#3ea89c', '#a85a3e', '#677584',
];

type Node = {
  bucket: string;
  name: string;
  value: number;
  bucketIdx: number;
};

type Cell = Node & { x: number; y: number; w: number; h: number };

export default function Treemap({ repo, isDark, size = 280 }: Props) {
  const { t } = useTranslation('inspect');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { cells, buckets, totalLoc } = useMemo(() => {
    const bucketKey = (folderPath: string) => {
      const parts = folderPath.split('.').filter(Boolean);
      if (parts.length === 0) return 'root';
      const top = parts[0];
      if (top === 'src' && parts.length >= 2) return parts[1];
      return top;
    };

    const bucketSet = new Map<string, number>();
    const orderedBuckets: string[] = [];
    const nodes: Node[] = [];
    let totalLoc = 0;

    for (const f of repo.files) {
      const b = bucketKey(f.folderPath);
      if (!bucketSet.has(b)) {
        bucketSet.set(b, orderedBuckets.length);
        orderedBuckets.push(b);
      }
      const v = Math.max(1, f.metrics.loc);
      totalLoc += v;
      nodes.push({
        bucket: b,
        name: f.name,
        value: v,
        // Invariant: `b` was just inserted into bucketSet above when missing,
        // so this lookup is always defined here.
        bucketIdx: bucketSet.get(b)!,
      });
    }

    nodes.sort((a, b) => b.value - a.value);

    const W = size;
    const H = size;
    const layout = squarify(nodes, 0, 0, W, H, totalLoc);

    return { cells: layout, buckets: orderedBuckets, totalLoc };
  }, [repo, size]);

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

    const palette = isDark ? PALETTE_DARK : PALETTE_LIGHT;
    const stroke = isDark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.85)';

    for (const c of cells) {
      const baseHex = palette[c.bucketIdx % palette.length];
      const { r, g, b } = hexToRgb(baseHex);
      // larger files (lower in the sort) read slightly more saturated
      ctx.fillStyle = `rgba(${r},${g},${b},0.55)`;
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 0.6;
      ctx.strokeRect(c.x + 0.3, c.y + 0.3, c.w - 0.6, c.h - 0.6);
    }

    // Label only the largest cells where the text actually fits
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.82)';
    ctx.font = '700 9px Inter, ui-sans-serif';
    ctx.textBaseline = 'top';
    for (const c of cells) {
      if (c.w < 38 || c.h < 18) continue;
      const name = c.name.replace(/\.(ts|tsx|js|jsx|css|md)$/, '');
      const trimmed = name.length > 14 ? `${name.slice(0, 13)}…` : name;
      ctx.fillText(trimmed, c.x + 4, c.y + 3);
      if (c.h >= 30) {
        ctx.fillStyle = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.50)';
        ctx.font = '600 8px ui-monospace, SFMono-Regular, monospace';
        ctx.fillText(String(c.value), c.x + 4, c.y + 14);
        ctx.font = '700 9px Inter, ui-sans-serif';
        ctx.fillStyle = isDark ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.82)';
      }
    }
  }, [cells, isDark, size]);

  const palette = isDark ? PALETTE_DARK : PALETTE_LIGHT;

  return (
    <div className="flex flex-col items-center w-full">
      <canvas ref={canvasRef} />

      <div
        className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 w-full px-1"
        style={{ maxWidth: size }}
      >
        {buckets.slice(0, 6).map((b, i) => (
          <div key={b} className="flex items-center gap-1.5 text-xs">
            <span
              className="w-2 h-2 rounded-sm shrink-0"
              style={{ background: palette[i % palette.length] }}
            />
            <span
              className="font-bold uppercase tracking-eyebrow truncate"
              style={{ color: 'var(--fg-default)' }}
            >
              {b}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-2 text-2xs uppercase tracking-eyebrow text-[var(--fg-subtle)]">
        {t('deps.treemapSummary', {
          n: cells.length,
          loc: formatNumber(totalLoc),
          defaultValue: `${cells.length} files · ${formatNumber(totalLoc)} LOC sized by weight`,
        })}
      </div>
    </div>
  );
}

// ── Squarified treemap (recursive strip) ───────────────────────────────
// Compact implementation: at each step we accumulate nodes into a row
// along the shorter side until adding another would worsen the worst
// aspect ratio in the row. We then commit that row as a strip and
// recurse on the remaining rectangle.

function squarify(nodes: Node[], x: number, y: number, w: number, h: number, valueSum: number): Cell[] {
  const result: Cell[] = [];
  const queue = [...nodes];
  let area = w * h;
  const scale = area / Math.max(1, valueSum);
  let rx = x; let ry = y; let rw = w; let rh = h;
  let row: Node[] = [];
  let rowSum = 0;

  const worst = (row: Node[], rowSum: number, side: number) => {
    if (row.length === 0) return Infinity;
    const sideArea = rowSum * scale;
    let max = -Infinity;
    let min = Infinity;
    for (const n of row) {
      const a = n.value * scale;
      max = Math.max(max, a);
      min = Math.min(min, a);
    }
    const maxR = Math.max((side * side * max) / (sideArea * sideArea), (sideArea * sideArea) / (side * side * min));
    return maxR;
  };

  while (queue.length > 0) {
    const side = Math.min(rw, rh);
    const next = queue[0];
    const trial = [...row, next];
    const trialSum = rowSum + next.value;
    if (row.length === 0 || worst(trial, trialSum, side) <= worst(row, rowSum, side)) {
      row.push(next);
      rowSum = trialSum;
      queue.shift();
    } else {
      // Commit row
      commit(row, rowSum, scale, rx, ry, rw, rh, result);
      const sideArea = rowSum * scale;
      if (rw <= rh) {
        const stripH = sideArea / rw;
        ry += stripH; rh -= stripH;
      } else {
        const stripW = sideArea / rh;
        rx += stripW; rw -= stripW;
      }
      row = [];
      rowSum = 0;
      area = rw * rh;
      // scale stays the same (fixed by total)
    }
  }
  if (row.length > 0) commit(row, rowSum, scale, rx, ry, rw, rh, result);
  return result;
}

function commit(row: Node[], rowSum: number, scale: number, rx: number, ry: number, rw: number, rh: number, out: Cell[]) {
  const sideArea = rowSum * scale;
  if (rw <= rh) {
    const stripH = sideArea / rw;
    let cx = rx;
    for (const n of row) {
      const cw = (n.value * scale) / stripH;
      out.push({ ...n, x: cx, y: ry, w: cw, h: stripH });
      cx += cw;
    }
  } else {
    const stripW = sideArea / rh;
    let cy = ry;
    for (const n of row) {
      const ch = (n.value * scale) / stripW;
      out.push({ ...n, x: rx, y: cy, w: stripW, h: ch });
      cy += ch;
    }
  }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}
