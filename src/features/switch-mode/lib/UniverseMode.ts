import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  computeBlast,
  findShortestPath,
  topRiskLens,
  simulateBranchDiff,
  publicApiRing,
  computeSCCs,
  cycleSCCs,
} from '@entities/repo';
import type {
  BlastResult,
  FilterState,
  PathWitness,
  PRDiff,
  RepoData,
  RiskLensHit,
  RiskLensKey,
  SCC,
} from '@entities/repo';
import type { FilterSnapshot, ViewMode, ViewModeContext } from '@entities/viz-mode';

const HEIGHT_GAP = 90;

const _v3 = new THREE.Vector3();

const vertexShader = `
  attribute float size;
  attribute float alpha;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vColor = color;
    vAlpha = alpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;
const fragmentShader = `
  uniform sampler2D pointTexture;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vec4 t = texture2D(pointTexture, gl_PointCoord);
    gl_FragColor = vec4(vColor, vAlpha) * t;
  }
`;

// --- Line-polygon shader (light theme) ---
// Each star becomes a small wireframe tetrahedron. Per-vertex color + alpha
// so dimmed (filter-mismatched) stars fade out without rebuilding geometry.
const lineVertexShader = `
  attribute float alpha;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vColor = color;
    vAlpha = alpha;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const lineFragmentShader = `
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    gl_FragColor = vec4(vColor, vAlpha);
  }
`;

// Unit tetrahedron (4 verts, 6 edges) — small line-segment template that
// renders the same regardless of viewing angle, so every "star" reads as a
// polygon outline rather than a flat shape that disappears edge-on.
const TETRA_V: readonly (readonly [number, number, number])[] = [
  [ 1,  1,  1],
  [-1, -1,  1],
  [-1,  1, -1],
  [ 1, -1, -1],
];
const TETRA_EDGES: readonly (readonly [number, number])[] = [
  [0,1], [0,2], [0,3], [1,2], [1,3], [2,3],
];
// Per-star line size (world units). The point-sprite size attribute is
// in screen-space pixels and isn't directly comparable; this is tuned by eye
// to match perceived star magnitude in the dark mode.
const STAR_LINE_BASE = 2.2;

// `inkRgb` is the disc color: '255,255,255' for dark mode (luminous star),
// '31,35,40' for light mode (negative-plate ink — Primer fg-default).
function createStarTexture(inkRgb: string, haloAlpha: number): THREE.CanvasTexture {
  const SIZE = 256;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE; canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;
  const c = SIZE / 2;
  ctx.clearRect(0, 0, SIZE, SIZE);

  // Sharp core — most of the visible disc.
  const core = ctx.createRadialGradient(c, c, 0, c, c, SIZE * 0.28);
  core.addColorStop(0.00, `rgba(${inkRgb},1)`);
  core.addColorStop(0.55, `rgba(${inkRgb},1)`);
  core.addColorStop(0.85, `rgba(${inkRgb},0.55)`);
  core.addColorStop(1.00, `rgba(${inkRgb},0)`);
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Soft halo. Lower in light mode — additive→normal blending can't pile halos
  // on top of each other, and a strong halo prints as muddy gray smears.
  const halo = ctx.createRadialGradient(c, c, 0, c, c, c);
  halo.addColorStop(0.30, `rgba(${inkRgb},0)`);
  halo.addColorStop(0.55, `rgba(${inkRgb},${haloAlpha})`);
  halo.addColorStop(0.85, `rgba(${inkRgb},${haloAlpha * 0.22})`);
  halo.addColorStop(1.00, `rgba(${inkRgb},0)`);
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, SIZE, SIZE);

  const tex = new THREE.CanvasTexture(canvas);
  // No mipmaps: tiny stars get blurry/dim under trilinear filtering.
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// --- Universe palettes ---
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
type UniversePalette = {
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
  blending: THREE.Blending;
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

const UNIVERSE_DARK: UniversePalette = {
  bg: 0x020202,
  pillar: 0xffffff,
  pillarOpacity: 0.08,
  baseStar:       [1.00, 1.00, 1.00],
  glowStar:       [0.22, 0.83, 0.32],   // #4f9a5c
  vulnerableStar: [1.00, 0.48, 0.45],   // ~#ff7a73
  lineBaseAlpha: 1,
  blending: THREE.AdditiveBlending,
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

const UNIVERSE_LIGHT: UniversePalette = {
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
  blending: THREE.NormalBlending,
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

function universePalette(theme: 'dark' | 'light'): UniversePalette {
  return theme === 'light' ? UNIVERSE_LIGHT : UNIVERSE_DARK;
}

export function createUniverseMode(): ViewMode {
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let renderer: THREE.WebGLRenderer;
  let controls: OrbitControls;
  let raycaster: THREE.Raycaster;
  const mouse = new THREE.Vector2();
  let points: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  // Light-theme wireframe-polygon stars. Built lazily on first switch so dark
  // sessions don't pay the geometry cost. Owns its own attribute buffers.
  let lines: THREE.LineSegments<THREE.BufferGeometry, THREE.ShaderMaterial> | null = null;
  let pillarMesh: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshBasicMaterial> | null = null;
  let starsGroup: THREE.Group | null = null;
  // Drafting grid — a pair of GridHelpers (floor + ceiling) that bracket the
  // star field and reinforce the "engineering paper" read in light mode.
  let gridFloor: THREE.GridHelper | null = null;
  let gridCeiling: THREE.GridHelper | null = null;
  let folderLabels: { div: HTMLDivElement; folderPath: string; y: number }[] = [];
  let starPositions: Float32Array;
  let starTexture: THREE.CanvasTexture | null = null;
  let rafId = 0;
  let ctx: ViewModeContext | null = null;
  let depthRange: [number, number] = [0, 1];
  let lastTheme: 'dark' | 'light' | null = null;

  // ── Overlay state (shared with Dot Field via OverlaySnapshot) ──
  // Each feature owns its own closure cache + dispose helper. New decorative
  // meshes/lines live on `overlayGroup` so they ride the same rotation as the
  // stars (otherwise they'd visibly drift over the slowly-rotating field).
  let overlayGroup: THREE.Group | null = null;

  // Risk lens — recolors the existing color/alpha attributes; no extra meshes.
  let cachedRiskLens: RiskLensKey | null = null;
  let cachedRiskRepo: RepoData | null = null;
  let cachedRiskHits: RiskLensHit[] = [];
  const RISK_LENS_RGB: Record<RiskLensKey, readonly [number, number, number]> = {
    security:  [0.97, 0.32, 0.29],
    testGaps:  [0.82, 0.60, 0.13],
    busFactor: [0.64, 0.44, 0.97],
    techDebt:  [1.00, 0.65, 0.34],
  };

  // Blast radius
  let cachedBlastSeed = -1;
  let cachedBlastRepo: RepoData | null = null;
  let cachedBlast: BlastResult | null = null;
  let blastSeedMesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial> | null = null;
  let blastHopMeshes: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>[] = [];
  let blastEdgeLines: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>[] = [];
  const BLAST_COLOR = 0xffa657;
  const BLAST_EDGE_COLOR = 0x39d0ff;

  // Path witness
  let cachedPathFrom: number | null = null;
  let cachedPathTo: number | null = null;
  let cachedPathRepo: RepoData | null = null;
  let cachedPath: PathWitness | null = null;
  let pathLineSegments: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial> | null = null;
  let pathWaypointMeshes: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>[] = [];
  const PATH_LINE_COLOR = 0x39d0ff;
  const PATH_FROM_COLOR = 0x39d353;
  const PATH_TO_COLOR = 0xffa657;

  // Public-API ring
  let apiRingActive = false;
  let cachedApiRingTheme: 'dark' | 'light' | null = null;
  let cachedApiRingRepo: RepoData | null = null;
  // Universe re-metaphor: orbital satellite points instead of a billboarded
  // ring (see buildApiRingVisuals). Type covers the new `THREE.Points` form.
  let apiRingMeshes: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>[] = [];

  // PR diff
  let cachedPrSeed: number | null = null;
  let cachedPrRepo: RepoData | null = null;
  let cachedPrDiff: PRDiff | null = null;
  let prChangeMeshes: {
    mesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
    kind: 'added' | 'modified' | 'deleted';
  }[] = [];
  let prAffectedMeshes: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>[] = [];
  const PR_COLORS = {
    added: 0x3fb950,
    modified: 0xd29922,
    deleted: 0xf85149,
    affected: 0x6e7681,
  } as const;

  // SCC cycles
  let cachedCyclesRepo: RepoData | null = null;
  let cycleHulls: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>[] = [];
  let cycleEdges: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>[] = [];
  const CYCLE_COLOR = 0xff7b72;
  const CYCLE_HULL_OPACITY = 0.55;
  const CYCLE_EDGE_OPACITY = 0.6;

  function isFilterActive(state: FilterState, repo: ViewModeContext['repo']): boolean {
    if (state.statuses.size > 0) return true;
    if (state.selectedFolders.size > 0) return true;
    if (state.search.trim() !== '') return true;
    const r = repo.ranges;
    if (state.complexity[0] !== r.complexity[0] || state.complexity[1] !== r.complexity[1]) return true;
    if (state.loc[0] !== r.loc[0] || state.loc[1] !== r.loc[1]) return true;
    if (state.fanIn[0] !== r.fanIn[0] || state.fanIn[1] !== r.fanIn[1]) return true;
    if (state.churn[0] !== r.churn[0] || state.churn[1] !== r.churn[1]) return true;
    return false;
  }

  function getRect() { return ctx!.mountEl.getBoundingClientRect(); }
  function inViewport(e: MouseEvent): boolean {
    if (!ctx) return false;
    const t = e.target as Node | null;
    if (t && ctx.mountEl.contains(t)) return true;
    return false;
  }

  function onMouseMove(e: MouseEvent) {
    if (!ctx) return;
    if (!inViewport(e)) { ctx.onHover(null); return; }
    const rect = getRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    raycaster.params.Points = { threshold: 4 };
    const hits = raycaster.intersectObject(points);
    if (hits.length > 0) {
      const id = hits[0].index ?? -1;
      if (id >= 0) {
        const snap = ctx.getFilter();
        const isMatched = !isFilterActive(snap.state, ctx.repo) || snap.matched[id] === 1;
        if (isMatched) { ctx.onHover(id, e.clientX, e.clientY); return; }
      }
    }
    ctx.onHover(null);
  }
  function onClick(e: MouseEvent) {
    if (!ctx) return;
    if (!inViewport(e)) return;
    const rect = getRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    raycaster.params.Points = { threshold: 4 };
    const hits = raycaster.intersectObject(points);
    if (hits.length > 0) {
      const id = hits[0].index ?? -1;
      if (id >= 0) {
        const snap = ctx.getFilter();
        const isMatched = !isFilterActive(snap.state, ctx.repo) || snap.matched[id] === 1;
        if (isMatched) { ctx.onSelect(id); return; }
      }
    }
    ctx.onSelect(null);
  }

  // Build the wireframe-tetrahedron geometry that represents stars in light
  // mode. Position is baked once (per-star scaled by complexity/fanIn); color
  // and alpha are written each frame in the same loop as the point sprites.
  function buildLineStars(nStars: number) {
    if (!ctx) return;
    const repo = ctx.repo;
    const VERTS_PER_STAR = TETRA_EDGES.length * 2; // 6 edges × 2 endpoints
    const total = nStars * VERTS_PER_STAR;
    const pos = new Float32Array(total * 3);
    const col = new Float32Array(total * 3);
    const alp = new Float32Array(total);

    for (let id = 0; id < nStars; id++) {
      const f = repo.files[id];
      // Match the magnitude curve used by point sprites, but in world units.
      const sz = STAR_LINE_BASE
        + (f.metrics.fanIn / Math.max(1, repo.ranges.fanIn[1])) * 2.4
        + (f.metrics.complexity / 50) * 1.6;
      const cx = starPositions[id * 3];
      const cy = starPositions[id * 3 + 1];
      const cz = starPositions[id * 3 + 2];
      // Per-star deterministic rotation so the polygons aren't all aligned —
      // gives the field a more natural, less grid-like read.
      const ry = ((id * 9301) % 1000) / 1000 * Math.PI * 2;
      const sinR = Math.sin(ry), cosR = Math.cos(ry);

      for (let e = 0; e < TETRA_EDGES.length; e++) {
        const [a, b] = TETRA_EDGES[e];
        const va = TETRA_V[a];
        const vb = TETRA_V[b];
        for (let k = 0; k < 2; k++) {
          const v = k === 0 ? va : vb;
          // Apply Y-rotation then translate to star center.
          const x0 = v[0] * sz, y0 = v[1] * sz, z0 = v[2] * sz;
          const xr = x0 * cosR + z0 * sinR;
          const zr = -x0 * sinR + z0 * cosR;
          const idx = (id * VERTS_PER_STAR + e * 2 + k) * 3;
          pos[idx]     = cx + xr;
          pos[idx + 1] = cy + y0;
          pos[idx + 2] = cz + zr;
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(col, 3));
    geo.setAttribute('alpha',    new THREE.BufferAttribute(alp, 1));

    const mat = new THREE.ShaderMaterial({
      vertexShader: lineVertexShader,
      fragmentShader: lineFragmentShader,
      transparent: true,
      depthTest: false,
      vertexColors: true,
    });
    lines = new THREE.LineSegments(geo, mat);
    lines.visible = false;
  }

  // Write per-star tint/alpha into the LineSegments buffer. Called once per
  // frame *only when light theme is active* — dark mode skips the work.
  function updateLineStars(
    repo: ViewModeContext['repo'],
    snap: FilterSnapshot,
    pal: UniversePalette,
    filterActive: boolean,
    topN: number,
  ) {
    if (!lines) return;
    const VERTS_PER_STAR = TETRA_EDGES.length * 2;
    const colors = lines.geometry.attributes.color as THREE.BufferAttribute;
    const alphas = lines.geometry.attributes.alpha as THREE.BufferAttribute;
    const colArr = colors.array as Float32Array;
    const alpArr = alphas.array as Float32Array;

    for (let id = 0; id < repo.files.length; id++) {
      const f = repo.files[id];
      const isMatched = !filterActive || snap.matched[id] === 1;
      const rank = snap.rankByFileId[id];
      const isGlow = topN > 0 && rank >= 0 && rank < topN;

      const tint = isGlow ? pal.glowStar : f.metrics.security ? pal.vulnerableStar : pal.baseStar;
      // Magnitude is encoded by line opacity (and base size, baked at build).
      // Drafted strokes ride at pal.lineBaseAlpha, glows at full ink, mismatches
      // fade to a barely-visible "old print" trace.
      let a = pal.lineBaseAlpha;
      if (filterActive) a = isMatched ? pal.lineBaseAlpha : 0.06;
      if (isGlow) a = 1;

      const base = id * VERTS_PER_STAR;
      for (let v = 0; v < VERTS_PER_STAR; v++) {
        const off3 = (base + v) * 3;
        colArr[off3]     = tint[0];
        colArr[off3 + 1] = tint[1];
        colArr[off3 + 2] = tint[2];
        alpArr[base + v] = a;
      }
    }
    colors.needsUpdate = true;
    alphas.needsUpdate = true;
  }

  function applyThemeStatics(pal: UniversePalette) {
    scene.background = new THREE.Color(pal.bg);
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.color.setHex(pal.bg);
    }
    if (pillarMesh) {
      pillarMesh.material.color.setHex(pal.pillar);
      pillarMesh.material.opacity = pal.pillarOpacity;
    }
    // Swap star texture (luminous white ↔ photographic-negative ink) and the
    // matching blend mode. Additive disappears on bright bg, normal disappears
    // on black-on-black — they're not interchangeable.
    if (points && starTexture) {
      starTexture.dispose();
      starTexture = createStarTexture(pal.inkRgb, pal.haloAlpha);
      points.material.uniforms.pointTexture.value = starTexture;
      points.material.blending = pal.blending;
      points.material.needsUpdate = true;
    }
    // Renderer mode: dark = sprite stars, light = wireframe-polygon stars.
    // The sprite layer stays alive in light mode purely to keep raycasting
    // working (its alpha attribute is forced to 0 in the animate loop).
    if (lines) lines.visible = pal.blending === THREE.NormalBlending;

    // Drafting grid (light mode only). When pal.grid is null we hide both
    // helpers; otherwise we paint them with the palette grid color/opacity.
    const setGrid = (g: THREE.GridHelper | null) => {
      if (!g) return;
      if (!pal.grid) { g.visible = false; return; }
      g.visible = true;
      const mat = g.material as THREE.LineBasicMaterial | THREE.LineBasicMaterial[];
      const apply = (m: THREE.LineBasicMaterial) => {
        m.color.setHex(pal.grid!.color);
        m.opacity = pal.grid!.opacity;
      };
      Array.isArray(mat) ? mat.forEach(apply) : apply(mat);
    };
    setGrid(gridFloor);
    setGrid(gridCeiling);
    // Folder pill / stem CSS
    folderLabels.forEach(({ div }) => {
      const pill = div.querySelector<HTMLElement>('.universe-folder-pill');
      const stem = div.querySelector<HTMLElement>('.universe-folder-stem');
      if (pill) {
        pill.style.background = pal.pillBg;
        pill.style.borderColor = pal.pillBorder;
        pill.style.color = pal.pillColor;
      }
      if (stem) {
        stem.style.background = pal.stemGrad;
      }
    });
  }

  // ── Overlay helpers ──────────────────────────────────────────────────
  // Pull a star's world position out of the per-file Float32 buffer. Returns
  // null when the id is out of range so callers can skip cleanly.
  function starPos(id: number): THREE.Vector3 | null {
    const i = id * 3;
    if (i < 0 || i + 2 >= starPositions.length) return null;
    return new THREE.Vector3(starPositions[i], starPositions[i + 1], starPositions[i + 2]);
  }

  function attachOverlay(obj: THREE.Object3D) {
    obj.raycast = () => null;
    if (overlayGroup) overlayGroup.add(obj);
    else if (starsGroup) starsGroup.add(obj);
    else scene.add(obj);
  }

  // ── Risk lens (recolor existing color/alpha attribs in-place) ──
  function recomputeRiskLensHits(repo: RepoData, lens: RiskLensKey) {
    cachedRiskHits = topRiskLens(repo, lens, 30);
  }

  function applyRiskLensTint(lens: RiskLensKey, isLight: boolean) {
    if (!points) return;
    const colors = points.geometry.attributes.color as THREE.BufferAttribute;
    const alphas = points.geometry.attributes.alpha as THREE.BufferAttribute;
    const colArr = colors.array as Float32Array;
    const alpArr = alphas.array as Float32Array;
    const [r, g, b] = RISK_LENS_RGB[lens];
    for (const hit of cachedRiskHits) {
      const id = hit.id;
      const off3 = id * 3;
      colArr[off3]     = r;
      colArr[off3 + 1] = g;
      colArr[off3 + 2] = b;
      // Sprite layer is invisible in light mode (kept alive for raycasting),
      // so don't fight that; only bump alpha when the sprite is actually drawn.
      if (!isLight) alpArr[id] = 1;
    }
    colors.needsUpdate = true;
    alphas.needsUpdate = true;

    // Also tint the wireframe-tetrahedron stars used in light mode.
    if (lines) {
      const lineColors = lines.geometry.attributes.color as THREE.BufferAttribute;
      const lineAlphas = lines.geometry.attributes.alpha as THREE.BufferAttribute;
      const lcArr = lineColors.array as Float32Array;
      const laArr = lineAlphas.array as Float32Array;
      const VERTS_PER_STAR = TETRA_EDGES.length * 2;
      for (const hit of cachedRiskHits) {
        const base = hit.id * VERTS_PER_STAR;
        for (let v = 0; v < VERTS_PER_STAR; v++) {
          const off3 = (base + v) * 3;
          lcArr[off3]     = r;
          lcArr[off3 + 1] = g;
          lcArr[off3 + 2] = b;
          laArr[base + v] = 1;
        }
      }
      lineColors.needsUpdate = true;
      lineAlphas.needsUpdate = true;
    }
  }

  function disposeRiskLensVisuals() {
    cachedRiskHits = [];
  }

  // ── Blast radius ──
  function disposeBlastVisuals() {
    if (blastSeedMesh) {
      if (overlayGroup) overlayGroup.remove(blastSeedMesh);
      blastSeedMesh.geometry.dispose();
      blastSeedMesh.material.dispose();
      blastSeedMesh = null;
    }
    for (const m of blastHopMeshes) {
      if (overlayGroup) overlayGroup.remove(m);
      m.geometry.dispose();
      m.material.dispose();
    }
    blastHopMeshes = [];
    for (const l of blastEdgeLines) {
      if (overlayGroup) overlayGroup.remove(l);
      l.geometry.dispose();
      l.material.dispose();
    }
    blastEdgeLines = [];
  }

  function buildBlastVisuals(blast: BlastResult, seedId: number) {
    disposeBlastVisuals();
    const seedP = starPos(seedId);
    if (!seedP) return;

    // Seed core — small additive amber sphere at the star.
    const seedGeo = new THREE.SphereGeometry(6, 16, 12);
    const seedMat = new THREE.MeshBasicMaterial({
      color: BLAST_COLOR,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const seedMesh = new THREE.Mesh(seedGeo, seedMat);
    seedMesh.position.copy(seedP);
    attachOverlay(seedMesh);
    blastSeedMesh = seedMesh;

    // Hop halos — alpha fades from 0.6 (hop 1) to 0.15 (hop 4).
    const maxHop = 4;
    for (const id of blast.transitive) {
      const hop = blast.hopOf.get(id);
      if (hop === undefined) continue;
      const p = starPos(id);
      if (!p) continue;
      const t = 1 - (hop - 1) / Math.max(1, maxHop - 1);
      const opacity = 0.15 + (0.6 - 0.15) * t;
      const radius = 4 - (hop - 1) * 0.6;
      const geo = new THREE.SphereGeometry(Math.max(1.5, radius), 12, 10);
      const mat = new THREE.MeshBasicMaterial({
        color: BLAST_COLOR,
        transparent: true,
        opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(p);
      attachOverlay(mesh);
      blastHopMeshes.push(mesh);
    }

    // Direct (hop-1) cyan thread lines from seed → dependent.
    const segPoints: THREE.Vector3[] = [];
    for (const id of blast.direct) {
      const p = starPos(id);
      if (!p) continue;
      segPoints.push(seedP.clone());
      segPoints.push(p);
    }
    if (segPoints.length >= 2) {
      const geo = new THREE.BufferGeometry().setFromPoints(segPoints);
      const mat = new THREE.LineBasicMaterial({
        color: BLAST_EDGE_COLOR,
        transparent: true,
        opacity: 0.5,
      });
      const line = new THREE.LineSegments(geo, mat);
      attachOverlay(line);
      blastEdgeLines.push(line);
    }
  }

  // ── Path witness ──
  function disposePathVisuals() {
    if (pathLineSegments) {
      if (overlayGroup) overlayGroup.remove(pathLineSegments);
      pathLineSegments.geometry.dispose();
      pathLineSegments.material.dispose();
      pathLineSegments = null;
    }
    for (const m of pathWaypointMeshes) {
      if (overlayGroup) overlayGroup.remove(m);
      m.geometry.dispose();
      m.material.dispose();
    }
    pathWaypointMeshes = [];
  }

  function buildPathVisuals(path: PathWitness) {
    disposePathVisuals();
    const ids = path.fileIds;
    if (ids.length < 1) return;

    // Bright cyan polyline through consecutive star positions.
    if (ids.length >= 2) {
      const segPoints: THREE.Vector3[] = [];
      for (let i = 0; i < ids.length - 1; i++) {
        const a = starPos(ids[i]);
        const b = starPos(ids[i + 1]);
        if (!a || !b) continue;
        segPoints.push(a, b);
      }
      if (segPoints.length >= 2) {
        const geo = new THREE.BufferGeometry().setFromPoints(segPoints);
        const mat = new THREE.LineBasicMaterial({
          color: PATH_LINE_COLOR,
          transparent: true,
          opacity: 0.85,
        });
        const seg = new THREE.LineSegments(geo, mat);
        attachOverlay(seg);
        pathLineSegments = seg;
      }
    }

    const lastIdx = ids.length - 1;
    for (let i = 0; i < ids.length; i++) {
      const p = starPos(ids[i]);
      if (!p) continue;
      const color = i === 0
        ? PATH_FROM_COLOR
        : i === lastIdx
          ? PATH_TO_COLOR
          : PATH_LINE_COLOR;
      const radius = i === 0 || i === lastIdx ? 5 : 3.5;
      const geo = new THREE.SphereGeometry(radius, 14, 10);
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(p);
      attachOverlay(mesh);
      pathWaypointMeshes.push(mesh);
    }
  }

  // ── Public-API ring ──
  function disposeApiRingVisuals() {
    for (const r of apiRingMeshes) {
      if (overlayGroup) overlayGroup.remove(r);
      r.geometry.dispose();
      r.material.dispose();
    }
    apiRingMeshes = [];
  }

  function buildApiRingVisuals(repo: RepoData, theme: 'dark' | 'light') {
    disposeApiRingVisuals();
    // Universe re-metaphor: a flat ring billboarded at the camera reads as a
    // floating disc and breaks the depth read. Public API on a starfield is
    // better expressed as a small *orbital* — a ring of tiny satellites
    // circling the star, weight controlling satellite count and orbit
    // brightness. The intent (this star is widely consumed) survives; the
    // form fits the metaphor.
    const color = theme === 'light' ? 0xbcd9f0 : 0xffffff;
    for (const f of repo.files) {
      const w = publicApiRing(f, repo);
      if (w <= 0.1) continue;
      const p = starPos(f.id);
      if (!p) continue;
      const orbitRadius = 9 + w * 4;          // 9..13 — a hair outside the star
      const satCount = 4 + Math.round(w * 6); // 4..10
      const positions = new Float32Array(satCount * 3);
      // Tilt the orbit plane deterministically per file so different stars
      // don't all rotate in the same plane (would look like a flat disc again).
      const tilt = ((f.id * 37) % 100) / 100 * Math.PI;
      const cosT = Math.cos(tilt);
      const sinT = Math.sin(tilt);
      for (let i = 0; i < satCount; i++) {
        const a = (i / satCount) * Math.PI * 2;
        const ox = Math.cos(a) * orbitRadius;
        const oy = Math.sin(a) * orbitRadius * 0.3 * sinT;
        const oz = Math.sin(a) * orbitRadius * cosT;
        positions[i * 3]     = p.x + ox;
        positions[i * 3 + 1] = p.y + oy;
        positions[i * 3 + 2] = p.z + oz;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({
        color,
        size: 1.6,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.45 + 0.4 * w,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const orbital = new THREE.Points(geo, mat);
      attachOverlay(orbital);
      apiRingMeshes.push(orbital);
    }
  }

  // ── PR diff ──
  function disposePrDiffVisuals() {
    for (const c of prChangeMeshes) {
      if (overlayGroup) overlayGroup.remove(c.mesh);
      c.mesh.geometry.dispose();
      c.mesh.material.dispose();
    }
    prChangeMeshes = [];
    for (const m of prAffectedMeshes) {
      if (overlayGroup) overlayGroup.remove(m);
      m.geometry.dispose();
      m.material.dispose();
    }
    prAffectedMeshes = [];
  }

  function buildPrDiffVisuals(diff: PRDiff) {
    disposePrDiffVisuals();
    for (const change of diff.changes) {
      const p = starPos(change.id);
      if (!p) continue;
      const geo = new THREE.SphereGeometry(5.5, 14, 10);
      const mat = new THREE.MeshBasicMaterial({
        color: PR_COLORS[change.kind],
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(p);
      attachOverlay(mesh);
      prChangeMeshes.push({ mesh, kind: change.kind });
    }
    for (const id of diff.affected) {
      const p = starPos(id);
      if (!p) continue;
      const geo = new THREE.SphereGeometry(3.5, 12, 10);
      const mat = new THREE.MeshBasicMaterial({
        color: PR_COLORS.affected,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(p);
      attachOverlay(mesh);
      prAffectedMeshes.push(mesh);
    }
  }

  // ── SCC cycles ──
  function disposeCycleVisuals() {
    for (const l of cycleHulls) {
      if (overlayGroup) overlayGroup.remove(l);
      l.geometry.dispose();
      l.material.dispose();
    }
    cycleHulls = [];
    for (const l of cycleEdges) {
      if (overlayGroup) overlayGroup.remove(l);
      l.geometry.dispose();
      l.material.dispose();
    }
    cycleEdges = [];
  }

  function buildCycleVisuals(repo: RepoData) {
    disposeCycleVisuals();
    const all = computeSCCs(repo.files);
    const cycles: SCC[] = cycleSCCs(repo.files, all);

    // Universe re-metaphor: a flat polygon hull through scattered 3D stars
    // reads as a tilted slab — wrong for a starfield. Replace it with a
    // circular *orbit ring* sitting on the centroid plane (plus a small
    // vertical wobble to imply 3D), so a cycle reads like a constellation
    // bound by a shared orbit. The bezier arcs between members are kept —
    // they already feel like inter-star light paths and don't need changing.
    const orbitRing = (
      cx: number, cy: number, cz: number, r: number, tilt: number,
    ): THREE.Vector3[] => {
      const out: THREE.Vector3[] = [];
      const seg = 64;
      const cosT = Math.cos(tilt);
      const sinT = Math.sin(tilt);
      for (let i = 0; i <= seg; i++) {
        const a = (i / seg) * Math.PI * 2;
        const rx = Math.cos(a) * r;
        const rz = Math.sin(a) * r;
        // Tilt the ring around the X axis so it isn't a flat XZ disc.
        out.push(new THREE.Vector3(cx + rx, cy + rz * sinT * 0.35, cz + rz * cosT));
      }
      return out;
    };

    for (const c of cycles) {
      const points: THREE.Vector3[] = [];
      for (const id of c) {
        const p = starPos(id);
        if (p) points.push(p);
      }
      if (points.length === 0) continue;

      let cx = 0, cy = 0, cz = 0;
      for (const p of points) { cx += p.x; cy += p.y; cz += p.z; }
      cx /= points.length; cy /= points.length; cz /= points.length;

      // Average member distance from centroid → orbit radius. Pad a little
      // so the ring sits just outside the outer members.
      let avgR = 0;
      for (const p of points) avgR += Math.hypot(p.x - cx, p.z - cz);
      avgR = points.length > 0 ? avgR / points.length : 0;
      const radius = Math.max(8, avgR + 6);

      // Deterministic per-cycle tilt so different cycles aren't all coplanar.
      const tilt = ((c[0] * 23) % 100) / 100 * Math.PI * 0.6;

      const ringPts = orbitRing(cx, cy, cz, radius, tilt);
      const geo = new THREE.BufferGeometry().setFromPoints(ringPts);
      const line = new THREE.Line(
        geo,
        new THREE.LineBasicMaterial({
          color: CYCLE_COLOR,
          transparent: true,
          opacity: CYCLE_HULL_OPACITY,
        }),
      );
      attachOverlay(line);
      cycleHulls.push(line);

      // Bezier arcs between consecutive cycle members — kept from the Dot
      // Field metaphor; they read here as light paths between bound stars.
      if (c.length > 1) {
        for (let i = 0; i < c.length; i++) {
          const a = starPos(c[i]);
          const b = starPos(c[(i + 1) % c.length]);
          if (!a || !b) continue;
          const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
          mid.y += Math.min(a.distanceTo(b) * 0.25, 30);
          const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
          const edge = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(curve.getPoints(20)),
            new THREE.LineBasicMaterial({
              color: CYCLE_COLOR,
              transparent: true,
              opacity: CYCLE_EDGE_OPACITY,
            }),
          );
          attachOverlay(edge);
          cycleEdges.push(edge);
        }
      }
    }
  }

  function animate() {
    rafId = requestAnimationFrame(animate);
    if (!ctx) return;

    const theme = ctx.getTheme();
    const pal = universePalette(theme);
    if (theme !== lastTheme) {
      applyThemeStatics(pal);
      lastTheme = theme;
    }

    const repo = ctx.repo;
    const snap: FilterSnapshot = ctx.getFilter();
    const filterActive = isFilterActive(snap.state, repo);
    const topN = snap.state.topNHighlight;

    if (starsGroup) starsGroup.rotation.y += 0.0001;

    const colors = points.geometry.attributes.color as THREE.BufferAttribute;
    const sizes = points.geometry.attributes.size as THREE.BufferAttribute;
    const alphas = points.geometry.attributes.alpha as THREE.BufferAttribute;
    const isLight = theme === 'light';

    for (let id = 0; id < repo.files.length; id++) {
      const f = repo.files[id];
      const isMatched = !filterActive || snap.matched[id] === 1;
      const rank = snap.rankByFileId[id];
      const isGlow = topN > 0 && rank >= 0 && rank < topN;

      // Base / glow / vulnerable colors come from the active palette.
      const tint = isGlow ? pal.glowStar : f.metrics.security ? pal.vulnerableStar : pal.baseStar;

      let baseSize = 4.0 + (f.metrics.fanIn / Math.max(1, repo.ranges.fanIn[1])) * 5.5 + (f.metrics.complexity / 50) * 3.5;
      let alpha = 1.0;
      if (filterActive) {
        if (isMatched) { baseSize *= 1.55; alpha = 1; }
        else { baseSize *= 0.45; alpha = 0.08; }
      }
      if (isGlow) baseSize *= 1.6;

      colors.setXYZ(id, tint[0], tint[1], tint[2]);
      sizes.setX(id, baseSize);
      // In light mode the sprite is rendered invisibly (alpha 0) but kept
      // alive so the raycaster has hit-test geometry.
      alphas.setX(id, isLight ? 0 : alpha);
    }
    colors.needsUpdate = true;
    sizes.needsUpdate = true;
    alphas.needsUpdate = true;

    // Wireframe stars (only when light theme is on screen).
    if (isLight) updateLineStars(repo, snap, pal, filterActive, topN);

    // ── Overlay snapshot (shared with Dot Field) ──
    const ov = ctx.getOverlay();

    // Risk lens — recompute hits only on (lens, repo) change, but reapply the
    // tint each frame so the per-file color loop above doesn't overwrite it.
    const lens = ov.riskLens;
    if (lens === null) {
      if (cachedRiskLens !== null) {
        cachedRiskLens = null;
        cachedRiskRepo = null;
        disposeRiskLensVisuals();
      }
    } else {
      if (lens !== cachedRiskLens || cachedRiskRepo !== repo) {
        cachedRiskLens = lens;
        cachedRiskRepo = repo;
        recomputeRiskLensHits(repo, lens);
      }
      applyRiskLensTint(lens, isLight);
    }

    // Blast radius — rebuild only when seed or repo changes; dispose on unset.
    const seed = ov.blastSeed;
    if (seed === null) {
      if (cachedBlastSeed !== -1) {
        cachedBlastSeed = -1;
        cachedBlastRepo = null;
        cachedBlast = null;
        disposeBlastVisuals();
      }
    } else if (seed !== cachedBlastSeed || cachedBlastRepo !== repo) {
      cachedBlastSeed = seed;
      cachedBlastRepo = repo;
      cachedBlast = computeBlast(repo, seed, 4);
      buildBlastVisuals(cachedBlast, seed);
    }

    // Path witness.
    const pFrom = ov.pathFrom;
    const pTo = ov.pathTo;
    if (pFrom === null || pTo === null) {
      if (cachedPathFrom !== null || cachedPathTo !== null) {
        cachedPathFrom = null;
        cachedPathTo = null;
        cachedPathRepo = null;
        cachedPath = null;
        disposePathVisuals();
      }
    } else if (
      pFrom !== cachedPathFrom ||
      pTo !== cachedPathTo ||
      cachedPathRepo !== repo
    ) {
      cachedPathFrom = pFrom;
      cachedPathTo = pTo;
      cachedPathRepo = repo;
      cachedPath = findShortestPath(repo, pFrom, pTo);
      if (cachedPath) buildPathVisuals(cachedPath);
      else disposePathVisuals();
    }

    // Public-API ring — rebuild on toggle, theme change, or repo change.
    if (!ov.apiRing) {
      if (apiRingActive) {
        apiRingActive = false;
        cachedApiRingTheme = null;
        cachedApiRingRepo = null;
        disposeApiRingVisuals();
      }
    } else if (
      !apiRingActive ||
      cachedApiRingTheme !== theme ||
      cachedApiRingRepo !== repo
    ) {
      apiRingActive = true;
      cachedApiRingTheme = theme;
      cachedApiRingRepo = repo;
      buildApiRingVisuals(repo, theme);
    }
    // Re-metaphor: orbital satellite points are static — no per-frame
    // billboarding needed (and `THREE.Points.lookAt` would warp the cloud).

    // PR diff.
    const prSeed = ov.prSeed;
    if (prSeed === null) {
      if (cachedPrSeed !== null) {
        cachedPrSeed = null;
        cachedPrRepo = null;
        cachedPrDiff = null;
        disposePrDiffVisuals();
      }
    } else if (prSeed !== cachedPrSeed || cachedPrRepo !== repo) {
      cachedPrSeed = prSeed;
      cachedPrRepo = repo;
      cachedPrDiff = simulateBranchDiff(repo, prSeed);
      buildPrDiffVisuals(cachedPrDiff);
    }
    // Universe re-metaphor: a `deleted` file in a starfield reads as a star
    // *going out*. Use a slow, low-mean flicker (≈ 1.4 s period, mean 0.32)
    // so the eye registers it as fading away, not as an active alarm. The
    // ripple keeps a brisker pulse — small surrounding stars catching news.
    if (prChangeMeshes.length > 0 || prAffectedMeshes.length > 0) {
      const now = performance.now();
      const slow  = 0.5 + 0.5 * Math.sin(now * 0.0011);
      const brisk = 0.5 + 0.5 * Math.sin(now * 0.003);
      for (const c of prChangeMeshes) {
        if (c.kind === 'deleted') {
          c.mesh.material.opacity = 0.10 + 0.45 * slow;
        }
      }
      for (const r of prAffectedMeshes) {
        r.material.opacity = 0.2 + 0.35 * brisk;
      }
    }

    // SCC cycles — only rebuild on metric switch / repo swap.
    if (ov.metric === 'cycles') {
      if (cachedCyclesRepo !== repo) {
        buildCycleVisuals(repo);
        cachedCyclesRepo = repo;
      }
    } else if (cachedCyclesRepo !== null) {
      disposeCycleVisuals();
      cachedCyclesRepo = null;
    }

    // Folder layer labels
    const rect = getRect();
    folderLabels.forEach(({ div, y }) => {
      const v = _v3.set(0, y, 0).project(camera);
      div.style.left = `${(v.x * 0.5 + 0.5) * rect.width + rect.left}px`;
      div.style.top = `${(v.y * -0.5 + 0.5) * rect.height + rect.top}px`;
      div.style.display = v.z > 1 ? 'none' : 'flex';
    });

    controls.update();
    renderer.render(scene, camera);
  }

  return {
    id: 'universe',
    label: 'Universe',
    worldToScreen(fileId) {
      // Universe doesn't have per-file meshes — stars are point sprites whose
      // positions live in `starPositions` (Float32Array of [x,y,z] triples).
      // The whole field rides on `starsGroup`, which rotates each frame, so
      // we apply the group's world matrix before projecting.
      if (!ctx || !camera || !renderer || !starPositions || !starsGroup) return null;
      const i = fileId * 3;
      if (i < 0 || i + 2 >= starPositions.length) return null;
      const rect = ctx.mountEl.getBoundingClientRect();
      _v3.set(starPositions[i], starPositions[i + 1], starPositions[i + 2]);
      _v3.applyMatrix4(starsGroup.matrixWorld);
      _v3.project(camera);
      if (_v3.z > 1 || _v3.z < -1) return null;
      const x = (_v3.x * 0.5 + 0.5) * rect.width;
      const y = (1 - (_v3.y * 0.5 + 0.5)) * rect.height;
      return { x, y };
    },
    init(c) {
      ctx = c;
      const initialTheme = c.getTheme();
      const pal = universePalette(initialTheme);
      lastTheme = initialTheme;

      const rect = c.mountEl.getBoundingClientRect();

      scene = new THREE.Scene();
      scene.background = new THREE.Color(pal.bg);
      scene.fog = new THREE.FogExp2(pal.bg, 0.0007);

      camera = new THREE.PerspectiveCamera(60, rect.width / rect.height, 1, 6000);
      camera.position.set(450, 250, 1100);

      renderer = new THREE.WebGLRenderer({
        antialias: true, alpha: true, powerPreference: 'high-performance',
      });
      renderer.setSize(rect.width, rect.height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      c.mountEl.appendChild(renderer.domElement);

      raycaster = new THREE.Raycaster();

      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;

      // Drafting grid — built unconditionally; visibility/color is driven
      // by applyThemeStatics so toggling the theme doesn't tear scene state.
      // The 1600-unit footprint matches the pillar height, so floor and
      // ceiling sit at the natural extents of the star field.
      gridFloor = new THREE.GridHelper(2400, 24, 0xffffff, 0xffffff);
      gridFloor.position.y = -550;
      const floorMat = gridFloor.material;
      floorMat.transparent = true;
      floorMat.depthWrite = false;
      scene.add(gridFloor);

      gridCeiling = new THREE.GridHelper(2400, 24, 0xffffff, 0xffffff);
      gridCeiling.position.y = 550;
      const ceilMat = gridCeiling.material;
      ceilMat.transparent = true;
      ceilMat.depthWrite = false;
      scene.add(gridCeiling);

      // Sacred Pillar
      pillarMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(1, 1, 1600, 32),
        new THREE.MeshBasicMaterial({ color: pal.pillar, transparent: true, opacity: pal.pillarOpacity }),
      );
      scene.add(pillarMesh);

      // Map folder depths to star Y. Compute depth range once.
      let maxDepth = 0;
      for (const folder of c.repo.folders) if (folder.depth > maxDepth) maxDepth = folder.depth;
      depthRange = [0, Math.max(1, maxDepth)];
      const yForDepth = (d: number) => ((depthRange[1] - d) * HEIGHT_GAP) - (depthRange[1] * HEIGHT_GAP / 2);

      // Build star positions: each file orbits its folder
      const N = c.repo.files.length;
      starPositions = new Float32Array(N * 3);
      const colors = new Float32Array(N * 3);
      const sizes = new Float32Array(N);
      const alphas = new Float32Array(N);
      // Deterministic-ish: use file id as seed for angle
      for (const f of c.repo.files) {
        const folder = c.repo.foldersByPath.get(f.folderPath)!;
        const y = yForDepth(folder.depth) + ((f.id * 13) % 30 - 15);
        // Place around per-folder ring whose radius depends on folder size
        const ringRadius = 60 + Math.min(folder.fileIds.length / 2, 80);
        const idx = folder.fileIds.indexOf(f.id);
        const angle = (idx / Math.max(folder.fileIds.length, 1)) * Math.PI * 2 + (folder.depth * 0.7);
        const jitter = (((f.id * 7919) % 1000) / 1000 - 0.5) * 24;
        const r = ringRadius + jitter;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        starPositions[f.id * 3] = x;
        starPositions[f.id * 3 + 1] = y;
        starPositions[f.id * 3 + 2] = z;
        colors[f.id * 3] = 1; colors[f.id * 3 + 1] = 1; colors[f.id * 3 + 2] = 1;
        sizes[f.id] = 4;
        alphas[f.id] = 0.85;
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
      geo.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

      starTexture = createStarTexture(pal.inkRgb, pal.haloAlpha);
      const material = new THREE.ShaderMaterial({
        uniforms: { pointTexture: { value: starTexture } },
        vertexShader, fragmentShader,
        blending: pal.blending,
        depthTest: false,
        transparent: true,
        vertexColors: true,
      });

      points = new THREE.Points(geo, material);
      starsGroup = new THREE.Group();
      starsGroup.add(points);
      scene.add(starsGroup);

      // Light-theme line-polygon stars (built once, hidden until needed).
      buildLineStars(c.repo.files.length);
      if (lines) starsGroup.add(lines);
      // Visibility is set by applyThemeStatics below.

      // Overlay decorations (blast / path / api ring / pr diff / cycles)
      // sit on a child of the stars group so they share the same slow
      // rotation as the field — otherwise they'd visibly drift.
      overlayGroup = new THREE.Group();
      starsGroup.add(overlayGroup);

      // Folder layer labels (top-level folders + first-level subfolders)
      const seenY = new Set<number>();
      for (const folder of c.repo.folders) {
        if (folder.depth === 0) continue;
        const y = yForDepth(folder.depth);
        const div = document.createElement('div');
        div.className = 'universe-folder-label';
        const pill = document.createElement('span');
        pill.className = 'universe-folder-pill';
        pill.textContent = folder.name;
        const stem = document.createElement('span');
        stem.className = 'universe-folder-stem';
        div.appendChild(pill);
        div.appendChild(stem);
        c.labelsEl.appendChild(div);
        folderLabels.push({ div, folderPath: folder.path, y });
        seenY.add(y);
      }

      // Apply pill / stem CSS once before first frame (init seeds the rest above).
      applyThemeStatics(pal);

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('click', onClick);
      animate();
    },
    onResize(w, h) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    },
    dispose() {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('click', onClick);
      // Tear down overlay visuals before the parent group goes away. Each
      // helper removes from `overlayGroup` and disposes its own geometry +
      // material, so order matters: overlay → group → points/lines.
      disposeBlastVisuals();
      cachedBlastSeed = -1;
      cachedBlastRepo = null;
      cachedBlast = null;
      disposePathVisuals();
      cachedPathFrom = null;
      cachedPathTo = null;
      cachedPathRepo = null;
      cachedPath = null;
      disposeRiskLensVisuals();
      cachedRiskLens = null;
      cachedRiskRepo = null;
      disposeApiRingVisuals();
      apiRingActive = false;
      cachedApiRingTheme = null;
      cachedApiRingRepo = null;
      disposePrDiffVisuals();
      cachedPrSeed = null;
      cachedPrRepo = null;
      cachedPrDiff = null;
      disposeCycleVisuals();
      cachedCyclesRepo = null;
      if (overlayGroup) {
        if (starsGroup) starsGroup.remove(overlayGroup);
        overlayGroup = null;
      }
      points.geometry.dispose();
      (points.material as THREE.Material).dispose();
      if (lines) {
        lines.geometry.dispose();
        lines.material.dispose();
        lines = null;
      }
      if (starsGroup) {
        scene.remove(starsGroup);
        starsGroup = null;
      }
      if (starTexture) { starTexture.dispose(); starTexture = null; }
      if (pillarMesh) {
        pillarMesh.geometry.dispose();
        pillarMesh.material.dispose();
        pillarMesh = null;
      }
      const disposeGrid = (g: THREE.GridHelper | null) => {
        if (!g) return;
        g.geometry.dispose();
        const m = g.material as THREE.Material | THREE.Material[];
        Array.isArray(m) ? m.forEach((x) => { x.dispose(); }) : m.dispose();
      };
      disposeGrid(gridFloor); gridFloor = null;
      disposeGrid(gridCeiling); gridCeiling = null;
      controls.dispose();
      folderLabels.forEach((f) => { f.div.remove(); });
      folderLabels = [];
      renderer.dispose();
      if (renderer.domElement.parentNode === ctx?.mountEl) {
        ctx.mountEl.removeChild(renderer.domElement);
      }
      lastTheme = null;
      ctx = null;
    },
  };
}
