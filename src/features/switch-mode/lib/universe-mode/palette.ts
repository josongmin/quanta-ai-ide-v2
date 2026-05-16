// Theme palettes for UniverseMode.
//
// Dark = real night-sky look (additive blending, white luminous stars).
//
// Light = blueprint / cyanotype convention. Historical engineering drawings
// were *light-on-dark*: faint white ink (actually unreacted paper) on Prussian-
// blue cyanotype paper. We keep that authentic aesthetic — the "light theme"
// here is the blueprint's *paper tone*, not a generic bright background. Stars
// render as wireframe-tetrahedron line polygons (drafted strokes), with
// annotation-amber highlights and red-pencil danger marks, which are the two
// pencil colors actually used on real blueprints to mark callouts and risks.
// Additive blending is swapped for normal because additive turns drafted white
// ink into a pale blue-tinted smear on the cyan field.

import { AdditiveBlending, NormalBlending, type Blending } from 'three';

export type UniversePalette = {
  bg: number;                   // scene.background + fog
  pillar: number;               // sacred pillar mesh color
  pillarOpacity: number;
  // Per-vertex RGB written into the color attribute (0..1 floats):
  baseStar: [number, number, number];
  glowStar: [number, number, number];
  vulnerableStar: [number, number, number];
  // Per-frame opacity for the drafted line strokes. Light/blueprint mode keeps
  // this below 1 so the ink reads as a translucent drafting stroke, not a
  // solid bright fill.
  lineBaseAlpha: number;
  blending: Blending;
  // For createStarTexture
  inkRgb: string;
  haloAlpha: number;
  // Optional drafting grid (blueprint floor). Null = no grid (dark mode).
  grid: { color: number; opacity: number } | null;
  // CSS for folder pills
  pillBg: string;
  pillBorder: string;
  pillColor: string;
  stemGrad: string;
};

export const UNIVERSE_DARK: UniversePalette = {
  bg: 0x020202,
  pillar: 0xffffff,
  pillarOpacity: 0.08,
  baseStar:       [1.00, 1.00, 1.00],
  glowStar:       [0.22, 0.83, 0.32],   // #4f9a5c
  vulnerableStar: [1.00, 0.48, 0.45],   // ~#ff7a73
  lineBaseAlpha: 1,
  blending: AdditiveBlending,
  inkRgb: '255,255,255',
  haloAlpha: 0.18,
  // Faint blueprint-style grid behind the stars. Color sits well above the
  // near-black bg so fog (density 0.0007 over the 800-unit floor distance)
  // doesn't swallow it whole.
  grid: { color: 0x4a5568, opacity: 0.45 },
  pillBg: 'rgba(0,0,0,0.45)',
  pillBorder: 'rgba(255,255,255,0.10)',
  pillColor: '#ffffff',
  stemGrad: 'linear-gradient(to bottom, rgba(255,255,255,0.40), transparent)',
};

export const UNIVERSE_LIGHT: UniversePalette = {
  // Deeper Prussian blue — actual cyanotype paper is closer to navy than to
  // a pale "design system" blue. We push toward #0a2545 so the drafted ink
  // strokes have somewhere to read against without looking like a UI surface.
  bg: 0x0a2545,
  // Construction "paper unreacted by ferricyanide" — same family as the ink,
  // a touch brighter so the central pillar still reads as a structural axis.
  pillar: 0xbcd9f0,
  pillarOpacity: 0.06,
  // Faded blueprint ink: cool, slightly desaturated. Real blueprint strokes
  // age to a muted cyan-tinted off-white, never bright #fff.
  baseStar:       [0.74, 0.85, 0.94],   // ~#bcd9f0
  // Annotation amber — yellow grease-pencil callouts. Lower-saturation than a
  // UI yellow so it reads as pencil on paper, not as an alert badge.
  glowStar:       [0.95, 0.80, 0.42],   // ~#f3cc6b
  // Red china-marker — desaturated, warm. The hue is distinct from cyan and
  // amber so it survives over a saturated navy ground.
  vulnerableStar: [0.92, 0.50, 0.45],   // ~#eb8073
  // Drafted strokes are translucent. 0.78 was tuned to read as ink on paper
  // rather than a luminous emission against the navy field.
  lineBaseAlpha: 0.78,
  blending: NormalBlending,
  // Sprite layer is invisible in light mode (raycast only); halo color is
  // kept aligned with the ink in case of any leakage.
  inkRgb: '188,217,240',
  haloAlpha: 0.04,
  // Drafting grid — the engineering paper's substrate. Lower opacity than
  // the strokes so it recedes behind the polygon stars but is unmistakably
  // a printed grid, not a vignette or shading effect.
  grid: { color: 0xbcd9f0, opacity: 0.10 },
  // Folder labels: drafting-vellum tags, never solid pills.
  pillBg: 'rgba(188,217,240,0.08)',
  pillBorder: 'rgba(188,217,240,0.45)',
  pillColor: '#dceaf6',
  stemGrad: 'linear-gradient(to bottom, rgba(188,217,240,0.45), transparent)',
};

export function universePalette(theme: 'dark' | 'light'): UniversePalette {
  return theme === 'light' ? UNIVERSE_LIGHT : UNIVERSE_DARK;
}
