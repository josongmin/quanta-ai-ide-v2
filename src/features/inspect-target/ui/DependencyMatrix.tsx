import { useEffect, useMemo, useRef } from 'react';
import type { RepoData } from '@entities/repo';
import { useTranslation } from '@shared/i18n';

// Dependency Structure Matrix (DSM) — the format every architect reaches for
// when the system is too big for a graph. Top-level folders form the rows
// and columns; each cell's intensity is the import count from row → col.
// Diagonal cells are intra-folder imports (always present, drawn faintly).
// Cells *below* the diagonal in a topologically-sorted DSM signal cycles —
// we sort by net out-degree so a clean architecture concentrates above.

type Props = {
  repo: RepoData;
  isDark: boolean;
  size?: number;
};

export default function DependencyMatrix({ repo, isDark, size = 280 }: Props) {
  const { t } = useTranslation('inspect');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const data = useMemo(() => {
    const topFolder = (folderPath: string) => folderPath.split('.')[0] || 'root';
    const fileTop = new Map<number, string>();
    const set = new Set<string>();
    for (const f of repo.files) {
      const top = topFolder(f.folderPath);
      fileTop.set(f.id, top);
      set.add(top);
    }

    const folders = Array.from(set);

    const matrix: Record<string, Record<string, number>> = {};
    for (const a of folders) {
      matrix[a] = {};
      for (const b of folders) matrix[a][b] = 0;
    }

    for (const f of repo.files) {
      // Invariant: fileTop was populated for every repo.files entry (keyed by
      // f.id) in the loop above, so this lookup is always defined.
      const a = fileTop.get(f.id)!;
      for (const tid of f.deps) {
        const b = fileTop.get(tid);
        if (!b) continue;
        matrix[a][b]++;
      }
    }

    const score: Record<string, number> = {};
    for (const a of folders) {
      let out = 0;
      let inn = 0;
      for (const b of folders) {
        if (a === b) continue;
        out += matrix[a][b];
        inn += matrix[b][a];
      }
      score[a] = out - inn;
    }
    folders.sort((x, y) => score[y] - score[x]);

    let max = 0;
    let cycleCells = 0;
    for (let i = 0; i < folders.length; i++) {
      for (let j = 0; j < folders.length; j++) {
        const v = matrix[folders[i]][folders[j]];
        if (i !== j && v > max) max = v;
        if (i !== j && j < i && v > 0) cycleCells++;
      }
    }

    return { folders, matrix, max: Math.max(1, max), cycleCells };
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

    const labelGutter = 56;
    const inner = size - labelGutter - 4;
    const n = data.folders.length;
    const cell = inner / Math.max(1, n);
    const ox = labelGutter;
    const oy = 4;

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const v = data.matrix[data.folders[i]][data.folders[j]];
        const x = ox + j * cell;
        const y = oy + i * cell;
        if (i === j) {
          ctx.fillStyle = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
          ctx.fillRect(x, y, cell - 1, cell - 1);
          continue;
        }
        if (v === 0) {
          ctx.fillStyle = isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.02)';
          ctx.fillRect(x, y, cell - 1, cell - 1);
          continue;
        }
        const intensity = Math.min(1, Math.sqrt(v / data.max));
        const inCycle = j < i;
        if (inCycle) {
          const a = 0.18 + intensity * 0.65;
          ctx.fillStyle = isDark
            ? `rgba(217,138,133,${a})`
            : `rgba(168,58,63,${a})`;
        } else {
          const a = 0.15 + intensity * 0.7;
          ctx.fillStyle = isDark
            ? `rgba(120,170,210,${a})`
            : `rgba(40,90,140,${a})`;
        }
        ctx.fillRect(x, y, cell - 1, cell - 1);
      }
    }

    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox, oy + n * cell);
    ctx.lineTo(ox + n * cell, oy + n * cell);
    ctx.stroke();

    ctx.font = '700 8px Inter, ui-sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)';
    ctx.textAlign = 'right';
    for (let i = 0; i < n; i++) {
      const y = oy + i * cell + cell / 2;
      const label = data.folders[i].toUpperCase().slice(0, 8);
      ctx.fillText(label, ox - 4, y);
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)';
    ctx.font = '600 7px Inter, ui-sans-serif';
    for (let j = 0; j < n; j++) {
      const x = ox + j * cell + cell / 2;
      const label = data.folders[j].toUpperCase().slice(0, 4);
      ctx.fillText(label, x, oy + n * cell + 7);
    }
  }, [data, isDark, size]);

  return (
    <div className="flex flex-col items-center w-full">
      <canvas ref={canvasRef} />
      <div className="mt-1 text-2xs uppercase tracking-eyebrow text-[var(--fg-subtle)]">
        {t('deps.matrixSummary', {
          n: data.folders.length,
          cycles: data.cycleCells,
          defaultValue: `${data.folders.length}×${data.folders.length} folder matrix · ${data.cycleCells} below-diagonal`,
        })}
      </div>
    </div>
  );
}
