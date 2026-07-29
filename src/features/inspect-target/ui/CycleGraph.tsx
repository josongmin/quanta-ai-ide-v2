import { useEffect, useMemo, useRef } from 'react';
import type { RepoData } from '@entities/repo';
import { useTranslation } from '@shared/i18n';

// Cycle visualizer — Madge's signature output, the chart you actually
// look at when `npx madge --circular` finds something. Every file flagged
// `cyclic` becomes a node placed on a circle in path order; arrows
// connect cycle members in the direction of import. Multiple disjoint
// cycles? They group into separate rings around the canvas. If too many
// cyclic files exist to draw legibly, we degrade to a bare count + the
// top three offending pairs as text. That's the same affordance Madge's
// terminal output provides when graphs blow up.

type Props = {
  repo: RepoData;
  isDark: boolean;
  size?: number;
};

const MAX_NODES = 28;

export default function CycleGraph({ repo, isDark, size = 280 }: Props) {
  const { t } = useTranslation('inspect');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const data = useMemo(() => {
    // Identify cyclic files and the edges among them
    const cyclic = repo.files.filter((f) => f.metrics.cyclic);
    const ids = new Set(cyclic.map((f) => f.id));
    const edges: { from: number; to: number }[] = [];
    for (const f of cyclic) {
      for (const tid of f.deps) {
        if (ids.has(tid)) edges.push({ from: f.id, to: tid });
      }
    }

    // Pick the first MAX_NODES by fanIn so the most central cyclic files
    // are the ones drawn.
    const sorted = [...cyclic].sort((a, b) => b.metrics.fanIn - a.metrics.fanIn);
    const draw = sorted.slice(0, MAX_NODES);
    const drawIds = new Set(draw.map((f) => f.id));
    const drawEdges = edges.filter((e) => drawIds.has(e.from) && drawIds.has(e.to));

    // Top 3 offending pairs (by fanIn of target). Drop edges whose endpoints no
    // longer resolve in repo.files (stale layout ref) before dereferencing metrics.
    const pairs = drawEdges
      .filter((e) => repo.files[e.from] && repo.files[e.to])
      .map((e) => ({
        e,
        from: repo.files[e.from],
        to: repo.files[e.to],
        score: repo.files[e.to].metrics.fanIn + repo.files[e.from].metrics.fanIn,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return {
      cycles: draw,
      drawEdges,
      truncated: cyclic.length - draw.length,
      total: cyclic.length,
      totalEdges: edges.length,
      pairs,
    };
  }, [repo]);

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
    const r = size / 2 - 28;
    const n = data.cycles.length;

    if (n === 0) {
      ctx.fillStyle = isDark ? 'rgba(120,200,150,0.85)' : 'rgba(40,140,80,0.85)';
      ctx.font = '700 12px Inter, ui-sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        t('deps.cycle.none', { defaultValue: 'No cycles detected' }).toUpperCase(),
        cx, cy,
      );
      return;
    }

    // Layout
    const positions = new Map<number, { x: number; y: number; angle: number }>();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      positions.set(data.cycles[i].id, {
        x: cx + Math.cos(a) * r,
        y: cy + Math.sin(a) * r,
        angle: a,
      });
    }

    // Edges (as curved arrows toward center)
    ctx.strokeStyle = isDark ? 'rgba(217,138,133,0.55)' : 'rgba(168,58,63,0.50)';
    ctx.lineWidth = 0.7;
    for (const e of data.drawEdges) {
      const a = positions.get(e.from);
      const b = positions.get(e.to);
      if (!a || !b) continue;
      const ctrlX = cx + (cx - (a.x + b.x) / 2) * -0.2;
      const ctrlY = cy + (cy - (a.y + b.y) / 2) * -0.2;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(ctrlX, ctrlY, b.x, b.y);
      ctx.stroke();

      // Arrowhead at b
      const dx = b.x - ctrlX;
      const dy = b.y - ctrlY;
      const ang = Math.atan2(dy, dx);
      ctx.fillStyle = isDark ? 'rgba(217,138,133,0.85)' : 'rgba(168,58,63,0.85)';
      const ah = 4;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(
        b.x - ah * Math.cos(ang - Math.PI / 8),
        b.y - ah * Math.sin(ang - Math.PI / 8),
      );
      ctx.lineTo(
        b.x - ah * Math.cos(ang + Math.PI / 8),
        b.y - ah * Math.sin(ang + Math.PI / 8),
      );
      ctx.closePath();
      ctx.fill();
    }

    // Nodes
    for (const [, p] of positions) {
      ctx.fillStyle = isDark ? '#d98a85' : '#a83a3f';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }

    // Labels — only every other node to avoid collisions
    ctx.font = '600 8px ui-monospace, SFMono-Regular, monospace';
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)';
    ctx.textBaseline = 'middle';
    let i = 0;
    for (const f of data.cycles) {
      const p = positions.get(f.id);
      if (!p) { i++; continue; }
      if (n > 16 && i % 2 === 1) { i++; continue; }
      const lr = r + 12;
      const lx = cx + Math.cos(p.angle) * lr;
      const ly = cy + Math.sin(p.angle) * lr;
      const left = Math.cos(p.angle) < 0;
      ctx.textAlign = left ? 'right' : 'left';
      const name = f.name.replace(/\.(ts|tsx|js|jsx)$/, '');
      const trimmed = name.length > 9 ? `${name.slice(0, 8)}…` : name;
      ctx.fillText(trimmed, lx, ly);
      i++;
    }
  }, [data, isDark, size, t]);

  return (
    <div className="flex flex-col items-center w-full">
      <canvas ref={canvasRef} />

      {data.pairs.length > 0 && (
        <div
          className="mt-2 w-full px-1 space-y-0.5"
          style={{ maxWidth: size }}
        >
          <div
            className="text-2xs font-black uppercase tracking-eyebrow mb-0.5"
            style={{ color: 'var(--fg-subtle)' }}
          >
            {t('deps.cycle.topPairs', { defaultValue: 'Tightest cycle pairs' })}
          </div>
          {data.pairs.map(({ e, from, to }) => (
            <div
              key={`${e.from}-${e.to}`}
              className="flex items-center text-xs font-mono"
              style={{ color: 'var(--fg-muted)' }}
            >
              <span className="truncate flex-1">{from.name}</span>
              <span className="px-1 opacity-50">↔</span>
              <span className="truncate flex-1 text-right">{to.name}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-2 text-2xs uppercase tracking-eyebrow text-[var(--fg-subtle)]">
        {data.total === 0
          ? t('deps.cycle.cleanSummary', { defaultValue: 'No cycles · architecture is acyclic' })
          : t('deps.cycle.summary', {
              n: data.total,
              edges: data.totalEdges,
              shown: Math.min(data.total, MAX_NODES),
              defaultValue: `${data.total} files in cycles · showing ${Math.min(data.total, MAX_NODES)}`,
            })
        }
      </div>
    </div>
  );
}
