import { useState, type ReactElement } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { RepoData } from '@entities/repo';
import { useTranslation } from '@shared/i18n';
import EdgeBundlingMap from './EdgeBundlingMap';
import LayeredBoxDiagram from './LayeredBoxDiagram';
import DependencyMatrix from './DependencyMatrix';
import SunburstHierarchy from './SunburstHierarchy';
import ChordDiagram from './ChordDiagram';
import Treemap from './Treemap';
import RiskHeatmap from './RiskHeatmap';
import CycleGraph from './CycleGraph';

// Slide deck for the Dependencies section. Eight views of the same graph,
// each tuned to a different question:
//   1. Edge bundling   — "what is the overall shape?"
//   2. Layer compliance— "are layer rules being respected?"
//   3. DSM matrix      — "where are the cycles hiding?"
//   4. Sunburst        — "what dominates the tree, and how deep?"
//   5. Top coupling    — "which module pairs are most strongly bound?"
//   6. Treemap         — "where is code weight actually sitting?"
//   7. Risk heatmap    — "which files are complex AND volatile?"
//   8. Cycles          — "what's caught in import cycles?"
// Kept as a small carousel so they share visual real-estate without
// stacking eight large vis blocks in the panel.

type Props = { repo: RepoData; isDark: boolean; size?: number };

type SlideId =
  | 'bundle' | 'layered' | 'matrix' | 'sunburst' | 'chord'
  | 'treemap' | 'heatmap' | 'cycles';

export default function DepsCarousel({ repo, isDark, size = 260 }: Props) {
  const { t } = useTranslation('inspect');
  const [idx, setIdx] = useState(0);

  const slides: { id: SlideId; label: string; hint: string; render: () => ReactElement }[] = [
    {
      id: 'bundle',
      label: t('deps.slide.bundle.label', { defaultValue: 'Edge bundling' }),
      hint: t('deps.slide.bundle.hint', { defaultValue: 'Holten 2006 · folder-grouped' }),
      render: () => <EdgeBundlingMap repo={repo} isDark={isDark} size={size} />,
    },
    {
      id: 'layered',
      label: t('deps.slide.layered.label', { defaultValue: 'Layered view' }),
      hint: t('deps.slide.layered.hint', { defaultValue: 'madge-style · layer flow' }),
      render: () => <LayeredBoxDiagram repo={repo} isDark={isDark} size={size} />,
    },
    {
      id: 'matrix',
      label: t('deps.slide.matrix.label', { defaultValue: 'DSM matrix' }),
      hint: t('deps.slide.matrix.hint', { defaultValue: 'folder × folder · cycles below diagonal' }),
      render: () => <DependencyMatrix repo={repo} isDark={isDark} size={size} />,
    },
    {
      id: 'sunburst',
      label: t('deps.slide.sunburst.label', { defaultValue: 'Sunburst' }),
      hint: t('deps.slide.sunburst.hint', { defaultValue: 'radial tree · arc ∝ file count' }),
      render: () => <SunburstHierarchy repo={repo} isDark={isDark} size={size} />,
    },
    {
      id: 'chord',
      label: t('deps.slide.chord.label', { defaultValue: 'Top coupling' }),
      hint: t('deps.slide.chord.hint', { defaultValue: 'heaviest module pairs first' }),
      render: () => <ChordDiagram repo={repo} isDark={isDark} size={size} />,
    },
    {
      id: 'treemap',
      label: t('deps.slide.treemap.label', { defaultValue: 'Treemap' }),
      hint: t('deps.slide.treemap.hint', { defaultValue: 'squarified · area ∝ LOC' }),
      render: () => <Treemap repo={repo} isDark={isDark} size={size} />,
    },
    {
      id: 'heatmap',
      label: t('deps.slide.heatmap.label', { defaultValue: 'Risk heatmap' }),
      hint: t('deps.slide.heatmap.hint', { defaultValue: 'complexity × churn · Feathers hotspot' }),
      render: () => <RiskHeatmap repo={repo} isDark={isDark} size={size} />,
    },
    {
      id: 'cycles',
      label: t('deps.slide.cycles.label', { defaultValue: 'Cycles' }),
      hint: t('deps.slide.cycles.hint', { defaultValue: 'circular imports · madge-style' }),
      render: () => <CycleGraph repo={repo} isDark={isDark} size={size} />,
    },
  ];

  const cur = slides[idx];
  const go = (delta: number) => { setIdx((i) => (i + delta + slides.length) % slides.length); };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex flex-col">
          <span
            className="text-2xs font-black uppercase tracking-eyebrow"
            style={{ color: 'var(--fg-default)' }}
          >
            {cur.label}
          </span>
          <span
            className="text-2xs"
            style={{ color: 'var(--fg-subtle)' }}
          >
            {cur.hint}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => { go(-1); }}
            aria-label="Previous"
            className="w-5 h-5 rounded-md grid place-items-center transition-colors"
            style={{ background: 'var(--bg-surface-muted)', color: 'var(--fg-muted)' }}
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          <span
            className="text-2xs font-mono tabular-nums px-1"
            style={{ color: 'var(--fg-subtle)' }}
          >
            {idx + 1}/{slides.length}
          </span>
          <button
            type="button"
            onClick={() => { go(1); }}
            aria-label="Next"
            className="w-5 h-5 rounded-md grid place-items-center transition-colors"
            style={{ background: 'var(--bg-surface-muted)', color: 'var(--fg-muted)' }}
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="flex justify-center">
        {cur.render()}
      </div>

      <div className="flex items-center justify-center gap-1.5 mt-2">
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            aria-label={s.label}
            onClick={() => { setIdx(i); }}
            className="h-1 rounded-full transition-all"
            style={{
              width: i === idx ? 16 : 6,
              background: i === idx ? 'var(--fg-default)' : 'var(--border-default)',
              opacity: i === idx ? 0.85 : 0.5,
            }}
          />
        ))}
      </div>
    </div>
  );
}
