import { useEffect, useMemo, useRef } from 'react';
import type { RepoData } from '@entities/repo';
import { useTranslation } from '@shared/i18n';

// Risk scatter — Michael Feathers' "Hotspot" map. X axis is complexity,
// Y axis is churn (change frequency). The danger zone is the *upper-
// right quadrant*: code that's both complicated and constantly changing.
// SonarQube, CodeClimate, and CodeScene all surface essentially this
// chart as the entry point to refactor planning.
//
// We add bubble size ∝ blast radius so a third dimension comes through:
// a small dot in the danger zone is risky for itself; a big dot there
// is risky for everything downstream of it.

type Props = {
  repo: RepoData;
  isDark: boolean;
  size?: number;
};

export default function RiskHeatmap({ repo, isDark, size = 280 }: Props) {
  const { t } = useTranslation('inspect');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const data = useMemo(() => {
    const points = repo.files
      .filter((f) => !f.isGenerated && f.layer !== 'vendor')
      .map((f) => ({
        x: Math.min(50, f.metrics.cyclomatic),
        y: f.metrics.churn,
        r: f.metrics.blastRadius,
        risk:
          (f.metrics.cyclomatic >= 25 ? 1 : 0) +
          (f.metrics.churn > 0.5 ? 1 : 0),
        critical: f.metrics.security || f.status === 'SECURITY_ALERT',
        name: f.name,
      }));

    const danger = points.filter((p) => p.x >= 25 && p.y > 0.5).length;
    const maxR = Math.max(1, ...points.map((p) => p.r));

    return { points, danger, maxR, total: points.length };
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

    const padL = 30;
    const padB = 24;
    const padT = 8;
    const padR = 10;
    const plotW = size - padL - padR;
    const plotH = size - padT - padB;
    const plotX = padL;
    const plotY = padT;

    // Quadrant tint — danger zone (upper right) gets a faint red wash.
    const dangerX = plotX + (25 / 50) * plotW;
    const dangerY = plotY; // upper half ↑ low y
    const dangerH = plotH * 0.5;
    ctx.fillStyle = isDark ? 'rgba(217,138,133,0.06)' : 'rgba(168,58,63,0.05)';
    ctx.fillRect(dangerX, dangerY, plotX + plotW - dangerX, dangerH);

    // Quadrant divider lines (subtle, dashed)
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)';
    ctx.setLineDash([2, 3]);
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(dangerX, plotY);
    ctx.lineTo(dangerX, plotY + plotH);
    ctx.moveTo(plotX, plotY + plotH * 0.5);
    ctx.lineTo(plotX + plotW, plotY + plotH * 0.5);
    ctx.stroke();
    ctx.setLineDash([]);

    // Axes
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(plotX, plotY);
    ctx.lineTo(plotX, plotY + plotH);
    ctx.lineTo(plotX + plotW, plotY + plotH);
    ctx.stroke();

    // Bubbles
    for (const p of data.points) {
      const px = plotX + (p.x / 50) * plotW;
      const py = plotY + plotH - p.y * plotH;
      const radius = 1.5 + (p.r / data.maxR) * 4.5;
      const inDanger = p.x >= 25 && p.y > 0.5;

      if (p.critical) {
        ctx.fillStyle = isDark ? 'rgba(217,138,133,0.85)' : 'rgba(168,58,63,0.85)';
      } else if (inDanger) {
        ctx.fillStyle = isDark ? 'rgba(217,138,133,0.55)' : 'rgba(168,58,63,0.50)';
      } else {
        ctx.fillStyle = isDark ? 'rgba(170,190,210,0.40)' : 'rgba(40,60,80,0.32)';
      }
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Axis labels
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.50)' : 'rgba(0,0,0,0.50)';
    ctx.font = '700 8px Inter, ui-sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(
      t('deps.heatmap.x', { defaultValue: 'COMPLEXITY' }).toUpperCase(),
      plotX + plotW / 2,
      plotY + plotH + 10,
    );
    ctx.save();
    ctx.translate(10, plotY + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(t('deps.heatmap.y', { defaultValue: 'CHURN' }).toUpperCase(), 0, 0);
    ctx.restore();

    // Danger label
    ctx.fillStyle = isDark ? 'rgba(217,138,133,0.85)' : 'rgba(168,58,63,0.85)';
    ctx.font = '700 7.5px Inter, ui-sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(
      t('deps.heatmap.danger', { defaultValue: 'DANGER ZONE' }).toUpperCase(),
      plotX + plotW - 4,
      plotY + 3,
    );

    // Tick marks
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.40)';
    ctx.font = '600 7.5px ui-monospace, SFMono-Regular, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    [0, 25, 50].forEach((v) => {
      const x = plotX + (v / 50) * plotW;
      ctx.fillText(String(v), x, plotY + plotH + 1);
    });
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    [0, 0.5, 1].forEach((v) => {
      const y = plotY + plotH - v * plotH;
      ctx.fillText(v.toFixed(1), plotX - 3, y);
    });
  }, [data, isDark, size, t]);

  return (
    <div className="flex flex-col items-center w-full">
      <canvas ref={canvasRef} />
      <div className="mt-1 text-2xs uppercase tracking-eyebrow text-[var(--fg-subtle)]">
        {t('deps.heatmapSummary', {
          n: data.total,
          danger: data.danger,
          defaultValue: `${data.total} files plotted · ${data.danger} in danger zone`,
        })}
      </div>
    </div>
  );
}
