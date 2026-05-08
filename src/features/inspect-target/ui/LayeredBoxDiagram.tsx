import { useMemo } from 'react';
import type { RepoData, Layer } from '@entities/repo';
import { useTranslation } from '@shared/i18n';
import { formatNumber } from '@shared/lib';

// Layer compliance checklist. Two rounds of "Sankey-style" attempts kept
// hiding the only question that actually matters here: *which layer is
// breaking the rule, and how badly?* So we replaced the chart with a
// status list. One row per layer, a status dot on the left, the layer
// name, and a single violation count on the right. Clean layers fade
// into the background; broken layers light up red and get a "Top
// offender" caption naming the most-imported wrong direction. That's
// the entire vocabulary — no flow tracing required.

type Props = {
  repo: RepoData;
  isDark: boolean;
  size?: number;
};

const LAYER_ORDER: Layer[] = ['view', 'controller', 'service', 'repository', 'util', 'test', 'vendor'];

type RowStat = {
  layer: Layer;
  fileCount: number;
  violations: number;
  worstTarget: Layer | null;
  worstCount: number;
};

export default function LayeredBoxDiagram({ repo, isDark, size = 280 }: Props) {
  const { t } = useTranslation('inspect');

  const data = useMemo(() => {
    const fileLayer = new Map<number, Layer>();
    const count: Record<string, number> = {};
    for (const f of repo.files) {
      fileLayer.set(f.id, f.layer);
      count[f.layer] = (count[f.layer] ?? 0) + 1;
    }
    const present = LAYER_ORDER.filter((l) => (count[l] ?? 0) > 0);

    const violMap: Record<string, Record<string, number>> = {};
    for (const l of present) violMap[l] = {};

    let total = 0;
    let totalViolations = 0;
    for (const f of repo.files) {
      const a = fileLayer.get(f.id);
      if (!a) continue;
      const ai = LAYER_ORDER.indexOf(a);
      for (const tid of f.deps) {
        const b = fileLayer.get(tid);
        if (!b || a === b) continue;
        const bi = LAYER_ORDER.indexOf(b);
        total++;
        if (bi < ai && b !== 'vendor') {
          violMap[a][b] = (violMap[a][b] ?? 0) + 1;
          totalViolations++;
        }
      }
    }

    const rows: RowStat[] = present.map((l) => {
      const v = violMap[l];
      let worstTarget: Layer | null = null;
      let worstCount = 0;
      let total = 0;
      for (const k of Object.keys(v)) {
        const c = v[k];
        total += c;
        if (c > worstCount) {
          worstCount = c;
          worstTarget = k as Layer;
        }
      }
      return {
        layer: l,
        fileCount: count[l] ?? 0,
        violations: total,
        worstTarget,
        worstCount,
      };
    });

    return { rows, total, totalViolations };
  }, [repo]);

  const padding = 14;
  const innerW = size - padding * 2;
  const innerH = size - padding * 2;
  const n = data.rows.length;
  const rowGap = 4;
  const rowH = (innerH - rowGap * Math.max(0, n - 1)) / Math.max(1, n);

  const labelLayer = (l: Layer) => t(`layer.${l}`, { defaultValue: l });
  const labelFor = (target: Layer | null) => target ? labelLayer(target).toUpperCase() : '';

  // Color tokens — desaturated to keep the row reading typographic, not
  // emoji-like. Status is carried by *position* (left of label) and a
  // single hue shift on bad rows; clean rows are silent.
  const okDot = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.28)';
  const badDot = isDark ? '#d98a85' : '#a83a3f';
  const neutralDot = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.14)';
  const rowBgClean = isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.022)';
  const rowBgBad = isDark
    ? 'rgba(217,138,133,0.085)'
    : 'rgba(168,58,63,0.07)';
  const rowBgVendor = isDark ? 'rgba(255,255,255,0.012)' : 'rgba(0,0,0,0.012)';
  const rowBorderBad = isDark ? 'rgba(217,138,133,0.30)' : 'rgba(168,58,63,0.28)';
  const labelColor = isDark ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.84)';
  const labelMuted = isDark ? 'rgba(255,255,255,0.50)' : 'rgba(0,0,0,0.46)';
  const subColor = isDark ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.40)';
  const badText = isDark ? '#d98a85' : '#a83a3f';

  return (
    <div className="flex flex-col items-center w-full">
      <svg width={size} height={size} className="block">
        {data.rows.map((r, i) => {
          const y = padding + i * (rowH + rowGap);
          const isBad = r.violations > 0;
          const isVendor = r.layer === 'vendor';
          const bg = isBad ? rowBgBad : isVendor ? rowBgVendor : rowBgClean;
          const nameColor = isVendor ? labelMuted : labelColor;
          const labelX = padding + 18;

          return (
            <g key={r.layer}>
              <rect
                x={padding}
                y={y}
                width={innerW}
                height={rowH}
                rx={8}
                fill={bg}
                stroke={isBad ? rowBorderBad : 'transparent'}
                strokeWidth={isBad ? 0.7 : 0}
              />

              {/* Status mark — only present when something is wrong, kept
                  small and to the *right* of where eye scans for label.
                  Clean rows render with no dot; vendor rows get a hollow ring. */}
              {isBad ? (
                <circle
                  cx={padding + 9}
                  cy={y + rowH / 2}
                  r={2.5}
                  fill={badDot}
                />
              ) : isVendor ? (
                <circle
                  cx={padding + 9}
                  cy={y + rowH / 2}
                  r={2}
                  fill="none"
                  stroke={neutralDot}
                  strokeWidth={1}
                />
              ) : (
                <circle
                  cx={padding + 9}
                  cy={y + rowH / 2}
                  r={1.5}
                  fill={okDot}
                />
              )}

              {/* Layer name */}
              <text
                x={labelX}
                y={y + (isBad && r.worstTarget ? rowH / 2 - 5 : rowH / 2)}
                fontSize={11}
                fontWeight={800}
                fill={nameColor}
                style={{ letterSpacing: '0.20em' }}
                dominantBaseline="middle"
              >
                {labelLayer(r.layer).toUpperCase()}
              </text>

              {/* Sub-line: top offender (only for bad rows) */}
              {isBad && r.worstTarget && (
                <text
                  x={labelX}
                  y={y + rowH / 2 + 9}
                  fontSize={8.5}
                  fill={subColor}
                  fontFamily="ui-monospace, SFMono-Regular, monospace"
                  dominantBaseline="middle"
                >
                  {t('deps.topOffender', {
                    target: labelFor(r.worstTarget),
                    n: r.worstCount,
                    defaultValue: `→ ${labelFor(r.worstTarget)} (${String(r.worstCount)})`,
                  })}
                </text>
              )}

              {/* File count (right side, small + muted on every row) */}
              <text
                x={padding + innerW - 12}
                y={y + (isBad ? rowH / 2 - 5 : rowH / 2)}
                fontSize={9}
                textAnchor="end"
                fill={labelMuted}
                fontFamily="ui-monospace, SFMono-Regular, monospace"
                fontWeight={600}
                dominantBaseline="middle"
              >
                {r.fileCount}
              </text>

              {/* Violation count (right side, second line of bad row) */}
              {isBad && (
                <text
                  x={padding + innerW - 12}
                  y={y + rowH / 2 + 9}
                  fontSize={10}
                  textAnchor="end"
                  fill={badText}
                  fontWeight={800}
                  fontFamily="ui-monospace, SFMono-Regular, monospace"
                  dominantBaseline="middle"
                >
                  {r.violations}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div className={`mt-1 text-[9px] uppercase tracking-[0.18em] ${
        isDark ? 'text-white/40' : 'text-black/40'
      }`}>
        {t('deps.layeredSummary', {
          edges: formatNumber(data.total),
          violations: data.totalViolations,
          defaultValue: `${formatNumber(data.total)} cross-layer · ${data.totalViolations} violations`,
        })}
      </div>
    </div>
  );
}
