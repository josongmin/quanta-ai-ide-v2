// DotFieldMode — orthogonal top-down dot grid backed by Three.js.
//
// The closure holds ~30 mutable visual-state references (scene, file meshes,
// halo planes, blast cache, path cache, risk-lens halos, boundary glyphs,
// pan/zoom/rotation targets, etc.). Splitting helpers out of the closure
// would require threading every mutable through a `this`-style parameter
// object, which is a much larger refactor than this split aims for.
// We keep the closure intact here and pull only stateless prelude
// (palette, constants, box shading) into sibling modules.

import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  Color,
  DoubleSide,
  GridHelper,
  Line,
  LineBasicMaterial,
  LineSegments,
  type Material,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  QuadraticBezierCurve3,
  Raycaster,
  RingGeometry,
  Scene,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import {
  CELL_SIZE,
  GRID_COUNT,
  computeBlast,
  timeWindowHeat,
  findShortestPath,
  topRiskLens,
  simulateBranchDiff,
  publicApiRing,
  computeSCCs,
  cycleSCCs,
} from '@entities/repo';
import type {
  BlastResult,
  EgressProtocol,
  FilterState,
  IngressProtocol,
  PathWitness,
  PRDiff,
  RepoData,
  RiskLensHit,
  RiskLensKey,
  SCC,
} from '@entities/repo';
import { findMetric } from '@entities/metric';
import type { FilterSnapshot, ViewMode, ViewModeContext } from '@entities/viz-mode';
import { paletteFor, type Palette } from './palette';
import {
  UNIFORM_HEIGHT,
  MAX_PILLAR_HEIGHT,
  LABEL_THRESHOLD,
  applyBoxFaceShading,
  FLAT,
  SIDE,
  _v3,
  _v3a,
  _v3b,
  _v3c,
  _color,
} from './constants';

export function createDotFieldMode(): ViewMode {
  let scene: Scene;
  let camera: PerspectiveCamera;
  let renderer: WebGLRenderer;
  let raycaster: Raycaster;
  const mouse = new Vector2();

  let fileMeshes: Mesh<BoxGeometry, MeshBasicMaterial>[] = [];
  let fileLabels: HTMLDivElement[] = [];
  // Heat overlay halos. One plane per file, sitting just below the box. Off
  // (opacity 0) by default; animate() raises opacity/scale per chosen metric.
  let haloMeshes: Mesh<PlaneGeometry, MeshBasicMaterial>[] = [];
  // Cached per-file scores so we don't recompute every frame on the same metric.
  let cachedHeatKey: string | null = null;
  let cachedScores: Float32Array = new Float32Array(0);
  let folderZones: { div: HTMLDivElement; xStart: number; zStart: number; line: Line }[] = [];
  let gridHelper: GridHelper | null = null;
  let lineObjects: Line[] = [];
  // ── Blast radius preview state ──
  // Cached so we recompute only when (seedId, repo) changes; the animate
  // loop just looks up `cachedBlast` per frame.
  let cachedBlastSeed = -1;
  let cachedBlastRepo: RepoData | null = null;
  let cachedBlast: BlastResult | null = null;
  // Decorative overlays — never raycastable. Disposed in `disposeBlastVisuals`.
  let blastSeedHalo: Mesh<PlaneGeometry, MeshBasicMaterial> | null = null;
  let blastHopHalos: Mesh<PlaneGeometry, MeshBasicMaterial>[] = [];
  let blastEdgeLines: Line[] = [];
  const BLAST_SEED_COLOR = 0xffa657;

  // ── Path witness state ──
  // Cached on (pathFrom, pathTo, repo). Lines + halos disposed in
  // `disposePathVisuals`.
  let cachedPathFrom: number | null = null;
  let cachedPathTo: number | null = null;
  let cachedPathRepo: RepoData | null = null;
  let cachedPath: PathWitness | null = null;
  let pathLineSegments: LineSegments | null = null;
  let pathWaypointHalos: Mesh<PlaneGeometry, MeshBasicMaterial>[] = [];
  const PATH_LINE_COLOR = 0x39d0ff;
  const PATH_FROM_COLOR = 0x39d353;
  const PATH_TO_COLOR = 0xffa657;

  // ── Risk lens state ──
  // Cached on (lens, repo). Halos disposed in `disposeRiskLensVisuals`.
  let cachedRiskLens: RiskLensKey | null = null;
  let cachedRiskRepo: RepoData | null = null;
  let cachedRiskHits: RiskLensHit[] = [];
  let riskLensHalos: Mesh<PlaneGeometry, MeshBasicMaterial>[] = [];
  const RISK_LENS_COLORS: Record<RiskLensKey, number> = {
    security: 0xf85149,
    testGaps: 0xd29922,
    busFactor: 0xa371f7,
    techDebt: 0xffa657,
  };

  // ── Public-API ring state ──
  // Rings rebuilt only when toggle flips on, theme changes, or repo changes.
  let apiRingActive = false;
  let cachedApiRingTheme: 'dark' | 'light' | null = null;
  let cachedApiRingRepo: RepoData | null = null;
  let apiRingMeshes: Mesh<RingGeometry, MeshBasicMaterial>[] = [];

  // ── PR diff state ──
  // Cached on (prSeed, repo). Layered on top of normal heat halos; uses its
  // own halo planes + dotted ripple lines for affected files.
  let cachedPrSeed: number | null = null;
  let cachedPrRepo: RepoData | null = null;
  let cachedPrDiff: PRDiff | null = null;
  let prChangeHalos: {
    mesh: Mesh<PlaneGeometry, MeshBasicMaterial>;
    kind: 'added' | 'modified' | 'deleted';
  }[] = [];
  let prAffectedHalos: Mesh<RingGeometry, MeshBasicMaterial>[] = [];
  const PR_COLORS = {
    added: 0x3fb950,
    modified: 0xd29922,
    deleted: 0xf85149,
    affected: 0x6e7681,
  } as const;

  // ── SCC cycle hull state ──
  // Activated only when overlay.metric === 'cycles'. Hull lines + bezier
  // edges between cycle members; disposed in `disposeCycleVisuals`.
  let cachedCyclesRepo: RepoData | null = null;
  let cycleHulls: Line[] = [];
  let cycleEdges: Line[] = [];
  let cycleMembership: Uint8Array = new Uint8Array(0);
  const CYCLE_COLOR = 0xff7b72;
  const CYCLE_HULL_OPACITY = 0.55;
  const CYCLE_EDGE_OPACITY = 0.6;

  // ── Boundary marker state ──
  // Built once on init from `repo.files[*].boundaries`. Per-frame we only
  // flip `.visible` based on overlay toggles + protocol sets — never recreate.
  // Materials are shared per (kind, protocol) combination; geometries are
  // shared per kind (entry tip dot, ingress torus per protocol, line geos
  // are unique per glyph because BufferGeometry endpoints differ but we
  // share entry-stem/egress-stem geometry by reusing identical Vector3 pairs).
  type EntryGlyph = {
    stem: Line;
    tip: Mesh<SphereGeometry, MeshBasicMaterial>;
  };
  type IngressGlyph = {
    mesh: Mesh<TorusGeometry, MeshBasicMaterial>;
    protocol: IngressProtocol;
  };
  type EgressGlyph = {
    line: Line;
    protocol: EgressProtocol;
  };
  let entryGlyphs: EntryGlyph[] = [];
  let ingressGlyphs: IngressGlyph[] = [];
  let egressGlyphs: EgressGlyph[] = [];
  // Shared resources — disposed once each in dispose().
  let boundaryStemGeo: BufferGeometry | null = null;       // entry stem (up)
  let boundaryEgressGeo: BufferGeometry | null = null;     // egress stem (down)
  let boundaryTipGeo: SphereGeometry | null = null;        // entry tip
  const boundaryIngressGeos = new Map<IngressProtocol, TorusGeometry>();
  let boundaryStemMat: LineBasicMaterial | null = null;
  let boundaryTipMat: MeshBasicMaterial | null = null;
  let boundaryEgressMat: LineBasicMaterial | null = null;
  let boundaryIngressMat: MeshBasicMaterial | null = null;
  let cachedBoundaryTheme: 'dark' | 'light' | null = null;
  const INGRESS_TUBE: Record<IngressProtocol, number> = {
    http: 0.045,
    webhook: 0.06,
    queue: 0.05,
    grpc: 0.035,
  };

  let selectedId: number | null = null;
  let rafId = 0;
  let ctx: ViewModeContext | null = null;
  let lastTheme: 'dark' | 'light' | null = null;

  // Cached mountEl bounding rect — animate() projects ~600 boxes plus
  // folder/label DOM positions per frame, every one of which needs
  // rect.{left,top,width,height}. getBoundingClientRect() forces a
  // synchronous layout flush, so reading it 60×/sec was the dominant
  // perf cost. Invariant: refresh on init, onResize, and window scroll
  // (top/left are scroll-relative). Width/height only change on resize.
  const cachedRect = { left: 0, top: 0, width: 1, height: 1 };
  function refreshCachedRect() {
    if (!ctx) return;
    const r = ctx.mountEl.getBoundingClientRect();
    cachedRect.left = r.left;
    cachedRect.top = r.top;
    cachedRect.width = r.width;
    cachedRect.height = r.height;
  }
  function onScroll() { refreshCachedRect(); }

  const panOffset = new Vector3();
  const panTarget = new Vector3();
  const rotTarget = { ...FLAT };
  const rotCurrent = { ...FLAT };
  let zoomTarget = FLAT.dist;
  let zoomCurrent = FLAT.dist;

  let isDragging = false;
  let downButton = 0;
  let lastMouse = { x: 0, y: 0 };
  let totalMovement = 0;

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

  function updateLines() {
    lineObjects.forEach((l) => scene.remove(l));
    lineObjects = [];
    if (selectedId === null || !ctx) return;
    const main = fileMeshes[selectedId];
    if (!main) return;
    const pal = paletteFor(ctx.getTheme());
    // Reuse pooled vectors — updateLines runs every frame while a node is
    // selected. start/end/mid are consumed synchronously by QuadraticBezierCurve3
    // (which copies the vectors internally), so reusing _v3a/_v3b/_v3c is safe.
    const start = _v3a.copy(main.position);
    start.y = main.scale.y * UNIFORM_HEIGHT;
    const f = ctx.repo.files[selectedId];
    f.deps.forEach((id) => {
      const t = fileMeshes[id];
      if (!t) return;
      const end = _v3b.copy(t.position);
      end.y = t.scale.y * UNIFORM_HEIGHT;
      const mid = _v3c.addVectors(start, end).multiplyScalar(0.5);
      mid.y += Math.min(start.distanceTo(end) * 0.5, 50);
      const curve = new QuadraticBezierCurve3(start, mid, end);
      const line = new Line(
        new BufferGeometry().setFromPoints(curve.getPoints(30)),
        new LineBasicMaterial({ color: pal.accent, transparent: true, opacity: 0.6 }),
      );
      lineObjects.push(line);
      scene.add(line);
    });
  }

  function resetView() {
    selectedId = null;
    rotTarget.x = FLAT.x; rotTarget.y = FLAT.y;
    zoomTarget = FLAT.dist;
    panTarget.set(0, 0, 0);
    lineObjects.forEach((l) => scene.remove(l));
    lineObjects = [];
    ctx?.onSelect(null);
  }

  function eventToNDC(e: MouseEvent) {
    const r = cachedRect;
    mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  }
  function inViewport(e: MouseEvent | WheelEvent): boolean {
    if (!ctx) return false;
    // True only when the actual element under the cursor is the canvas
    // (or a descendant of mountEl). This blocks events that happen on top
    // of overlay UI (filter bar, search bar, mode switcher, etc.).
    const t = e.target as Node | null;
    if (t && ctx.mountEl.contains(t)) return true;
    return false;
  }

  function onMouseDown(e: MouseEvent) {
    if (!inViewport(e)) return;
    isDragging = true;
    downButton = e.button;
    lastMouse = { x: e.clientX, y: e.clientY };
    totalMovement = 0;
  }
  function onMouseMove(e: MouseEvent) {
    if (!ctx) return;
    if (!isDragging) {
      if (!inViewport(e)) { ctx.onHover(null); return; }
      eventToNDC(e);
      raycaster.setFromCamera(mouse, camera);
      const inter = raycaster.intersectObjects(fileMeshes);
      if (inter.length > 0) {
        const id = (inter[0].object.userData as { id: number }).id;
        const snap = ctx.getFilter();
        const isMatched = !isFilterActive(snap.state, ctx.repo) || snap.matched[id] === 1;
        if (isMatched) { ctx.onHover(id, e.clientX, e.clientY); return; }
      }
      ctx.onHover(null);
      return;
    }
    const dx = e.clientX - lastMouse.x;
    const dy = e.clientY - lastMouse.y;
    totalMovement += Math.sqrt(dx * dx + dy * dy);
    if (downButton === 0) {
      const s = Math.sin(rotCurrent.y), c = Math.cos(rotCurrent.y);
      const factor = zoomCurrent / 800;
      panTarget.x -= (dx * c + dy * s) * factor;
      panTarget.z += (dx * s - dy * c) * factor;
      const limit = (GRID_COUNT * CELL_SIZE) / 2;
      panTarget.x = Math.max(-limit, Math.min(limit, panTarget.x));
      panTarget.z = Math.max(-limit, Math.min(limit, panTarget.z));
    } else if (downButton === 2) {
      rotTarget.y -= dx * 0.006;
      rotTarget.x += dy * 0.006;
      rotTarget.x = Math.max(0.1, Math.min(Math.PI / 2, rotTarget.x));
    }
    lastMouse = { x: e.clientX, y: e.clientY };
  }
  function onMouseUp() { isDragging = false; }
  function onWheel(e: WheelEvent) {
    if (!inViewport(e)) return;
    e.preventDefault();
    zoomTarget += e.deltaY * 0.6;
    zoomTarget = Math.max(40, Math.min(1200, zoomTarget));
  }
  function onClick(e: MouseEvent) {
    if (!ctx) return;
    if (!inViewport(e)) return;
    if (totalMovement > 12) return;
    eventToNDC(e);
    raycaster.setFromCamera(mouse, camera);
    const inter = raycaster.intersectObjects(fileMeshes);
    if (inter.length > 0) {
      const id = (inter[0].object.userData as { id: number }).id;
      const snap = ctx.getFilter();
      const isMatched = !isFilterActive(snap.state, ctx.repo) || snap.matched[id] === 1;
      if (!isMatched) return;
      if (selectedId === id) {
        resetView();
      } else {
        selectedId = id;
        rotTarget.x = SIDE.x; rotTarget.y = SIDE.y;
        panTarget.set(inter[0].object.position.x, 0, inter[0].object.position.z);
        zoomTarget = SIDE.dist;
        ctx.onSelect(id);
      }
    } else if (selectedId !== null) {
      resetView();
    }
  }
  function onContextMenu(e: MouseEvent) { e.preventDefault(); }
  function onKeyDown(e: KeyboardEvent) { if (e.key === 'Escape') resetView(); }

  function applyThemeStatics(pal: Palette, theme: 'dark' | 'light') {
    scene.background = new Color(pal.bg);
    if (gridHelper) {
      const mat = gridHelper.material as LineBasicMaterial | LineBasicMaterial[];
      const targetOpacity = theme === 'light' ? 0.5 : 1;
      const set = (m: LineBasicMaterial) => {
        m.color.setHex(pal.grid);
        m.transparent = true;
        m.opacity = targetOpacity;
      };
      Array.isArray(mat) ? mat.forEach(set) : set(mat);
    }
    // CSS-class default in index.css is dark-mode optimized (#fff text +
    // black shadow). Override per-theme so labels stay legible on both bgs.
    const folderColor = theme === 'light' ? '#1f2328' : '#ffffff';
    const folderShadow = theme === 'light'
      ? '0 1px 4px rgba(255,255,255,0.9)'
      : '0 1px 4px rgba(0,0,0,0.9)';
    folderZones.forEach((z) => {
      (z.line.material as LineBasicMaterial).color.setHex(pal.folder);
      z.div.style.color = folderColor;
      z.div.style.textShadow = folderShadow;
    });
  }

  function disposeBlastVisuals() {
    if (blastSeedHalo) {
      scene.remove(blastSeedHalo);
      blastSeedHalo.geometry.dispose();
      blastSeedHalo.material.dispose();
      blastSeedHalo = null;
    }
    for (const h of blastHopHalos) {
      scene.remove(h);
      h.geometry.dispose();
      h.material.dispose();
    }
    blastHopHalos = [];
    for (const l of blastEdgeLines) {
      scene.remove(l);
      l.geometry.dispose();
      (l.material as Material).dispose();
    }
    blastEdgeLines = [];
  }

  function buildBlastVisuals(blast: BlastResult, seedId: number) {
    disposeBlastVisuals();
    const seedMesh = fileMeshes[seedId];
    if (!seedMesh) return;

    // Seed ring — bright amber, additive, sits just under the seed dot.
    const seedGeo = new PlaneGeometry(CELL_SIZE * 2.0, CELL_SIZE * 2.0);
    const seedMat = new MeshBasicMaterial({
      color: BLAST_SEED_COLOR,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    const seedHalo = new Mesh(seedGeo, seedMat);
    seedHalo.rotation.x = -Math.PI / 2;
    seedHalo.position.set(seedMesh.position.x, -0.015, seedMesh.position.z);
    // Decorative overlay only — never raycastable.
    seedHalo.raycast = () => null;
    scene.add(seedHalo);
    blastSeedHalo = seedHalo;

    // Per-hop halos on each transitive dependent. Hop 1 = full intensity,
    // hop maxDepth = ~25%.
    const maxHop = 4;
    for (const id of blast.transitive) {
      const hop = blast.hopOf.get(id);
      if (hop === undefined) continue;
      const target = fileMeshes[id];
      if (!target) continue;
      const t = 1 - (hop - 1) / Math.max(1, maxHop - 1); // hop 1 → 1, hop 4 → 0
      const intensity = 0.25 + 0.75 * t;
      const radius = CELL_SIZE * (1.6 - 0.25 * (hop - 1));
      const geo = new PlaneGeometry(radius, radius);
      const mat = new MeshBasicMaterial({
        color: BLAST_SEED_COLOR,
        transparent: true,
        opacity: 0.55 * intensity,
        depthWrite: false,
        blending: AdditiveBlending,
      });
      const halo = new Mesh(geo, mat);
      halo.rotation.x = -Math.PI / 2;
      halo.position.set(target.position.x, -0.018, target.position.z);
      halo.raycast = () => null;
      scene.add(halo);
      blastHopHalos.push(halo);
    }

    // Direct (hop 1) connecting lines — thin, semi-transparent.
    for (const id of blast.direct) {
      const target = fileMeshes[id];
      if (!target) continue;
      const a = new Vector3(seedMesh.position.x, 0.05, seedMesh.position.z);
      const b = new Vector3(target.position.x, 0.05, target.position.z);
      const lineGeo = new BufferGeometry().setFromPoints([a, b]);
      const lineMat = new LineBasicMaterial({
        color: BLAST_SEED_COLOR,
        transparent: true,
        opacity: 0.5,
      });
      const line = new Line(lineGeo, lineMat);
      line.raycast = () => null;
      scene.add(line);
      blastEdgeLines.push(line);
    }
  }

  // ── Path witness visuals ──
  function disposePathVisuals() {
    if (pathLineSegments) {
      scene.remove(pathLineSegments);
      pathLineSegments.geometry.dispose();
      (pathLineSegments.material as Material).dispose();
      pathLineSegments = null;
    }
    for (const h of pathWaypointHalos) {
      scene.remove(h);
      h.geometry.dispose();
      h.material.dispose();
    }
    pathWaypointHalos = [];
  }

  function buildPathVisuals(path: PathWitness) {
    disposePathVisuals();
    const ids = path.fileIds;
    if (ids.length < 1) return;

    // Bright cyan line segments connecting consecutive waypoints.
    if (ids.length >= 2) {
      const points: Vector3[] = [];
      for (let i = 0; i < ids.length - 1; i++) {
        const a = fileMeshes[ids[i]];
        const b = fileMeshes[ids[i + 1]];
        if (!a || !b) continue;
        points.push(new Vector3(a.position.x, 0.06, a.position.z));
        points.push(new Vector3(b.position.x, 0.06, b.position.z));
      }
      if (points.length >= 2) {
        const geo = new BufferGeometry().setFromPoints(points);
        const mat = new LineBasicMaterial({
          color: PATH_LINE_COLOR,
          transparent: true,
          opacity: 0.85,
        });
        const seg = new LineSegments(geo, mat);
        seg.raycast = () => null;
        scene.add(seg);
        pathLineSegments = seg;
      }
    }

    // Per-waypoint halo. From=green, to=amber, intermediate=cyan.
    const lastIdx = ids.length - 1;
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const target = fileMeshes[id];
      if (!target) continue;
      const color = i === 0
        ? PATH_FROM_COLOR
        : i === lastIdx
          ? PATH_TO_COLOR
          : PATH_LINE_COLOR;
      const radius = i === 0 || i === lastIdx ? CELL_SIZE * 1.6 : CELL_SIZE * 1.2;
      const geo = new PlaneGeometry(radius, radius);
      const mat = new MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        blending: AdditiveBlending,
      });
      const halo = new Mesh(geo, mat);
      halo.rotation.x = -Math.PI / 2;
      halo.position.set(target.position.x, -0.012, target.position.z);
      halo.raycast = () => null;
      scene.add(halo);
      pathWaypointHalos.push(halo);
    }
  }

  // ── Risk lens visuals ──
  function disposeRiskLensVisuals() {
    for (const h of riskLensHalos) {
      scene.remove(h);
      h.geometry.dispose();
      h.material.dispose();
    }
    riskLensHalos = [];
  }

  function buildRiskLensVisuals(hits: RiskLensHit[], lens: RiskLensKey) {
    disposeRiskLensVisuals();
    const color = RISK_LENS_COLORS[lens];
    for (const hit of hits) {
      const target = fileMeshes[hit.id];
      if (!target) continue;
      const radius = CELL_SIZE * (1.4 + hit.score * 1.2);
      const geo = new PlaneGeometry(radius, radius);
      const mat = new MeshBasicMaterial({
        color,
        transparent: true,
        // Score-driven intensity. Cap at 0.9 so the brightest hit doesn't
        // wash out the underlying dot's hue.
        opacity: 0.25 + 0.65 * hit.score,
        depthWrite: false,
        blending: AdditiveBlending,
      });
      const halo = new Mesh(geo, mat);
      halo.rotation.x = -Math.PI / 2;
      halo.position.set(target.position.x, -0.014, target.position.z);
      halo.raycast = () => null;
      scene.add(halo);
      riskLensHalos.push(halo);
    }
  }

  // ── Public-API ring visuals ──
  function disposeApiRingVisuals() {
    for (const r of apiRingMeshes) {
      scene.remove(r);
      r.geometry.dispose();
      r.material.dispose();
    }
    apiRingMeshes = [];
  }

  function buildApiRingVisuals(repo: RepoData, theme: 'dark' | 'light') {
    disposeApiRingVisuals();
    const innerR = CELL_SIZE * 0.55;
    const outerR = CELL_SIZE * 0.62;
    const color = theme === 'light' ? 0x000000 : 0xffffff;
    for (const f of repo.files) {
      const w = publicApiRing(f, repo);
      if (w <= 0.1) continue;
      const target = fileMeshes[f.id];
      if (!target) continue;
      const geo = new RingGeometry(innerR, outerR, 48);
      const mat = new MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.25 * w,
        depthWrite: false,
        side: DoubleSide,
      });
      const ring = new Mesh(geo, mat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(target.position.x, -0.01, target.position.z);
      ring.raycast = () => null;
      scene.add(ring);
      apiRingMeshes.push(ring);
    }
  }

  // ── PR diff visuals ──
  function disposePrDiffVisuals() {
    for (const c of prChangeHalos) {
      scene.remove(c.mesh);
      c.mesh.geometry.dispose();
      c.mesh.material.dispose();
    }
    prChangeHalos = [];
    for (const r of prAffectedHalos) {
      scene.remove(r);
      r.geometry.dispose();
      r.material.dispose();
    }
    prAffectedHalos = [];
  }

  function buildPrDiffVisuals(diff: PRDiff) {
    disposePrDiffVisuals();
    for (const change of diff.changes) {
      const target = fileMeshes[change.id];
      if (!target) continue;
      const geo = new PlaneGeometry(CELL_SIZE * 1.7, CELL_SIZE * 1.7);
      const mat = new MeshBasicMaterial({
        color: PR_COLORS[change.kind],
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        blending: AdditiveBlending,
      });
      const halo = new Mesh(geo, mat);
      halo.rotation.x = -Math.PI / 2;
      halo.position.set(target.position.x, -0.013, target.position.z);
      halo.raycast = () => null;
      scene.add(halo);
      prChangeHalos.push({ mesh: halo, kind: change.kind });
    }
    const innerR = CELL_SIZE * 0.5;
    const outerR = CELL_SIZE * 0.58;
    for (const id of diff.affected) {
      const target = fileMeshes[id];
      if (!target) continue;
      const geo = new RingGeometry(innerR, outerR, 24);
      const mat = new MeshBasicMaterial({
        color: PR_COLORS.affected,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        side: DoubleSide,
      });
      const ring = new Mesh(geo, mat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(target.position.x, -0.011, target.position.z);
      ring.raycast = () => null;
      scene.add(ring);
      prAffectedHalos.push(ring);
    }
  }

  // ── SCC cycle visuals ──
  function disposeCycleVisuals() {
    for (const l of cycleHulls) {
      scene.remove(l);
      l.geometry.dispose();
      (l.material as Material).dispose();
    }
    cycleHulls = [];
    for (const l of cycleEdges) {
      scene.remove(l);
      l.geometry.dispose();
      (l.material as Material).dispose();
    }
    cycleEdges = [];
    cycleMembership = new Uint8Array(0);
  }

  function buildCycleVisuals(repo: RepoData) {
    disposeCycleVisuals();
    const all = computeSCCs(repo.files);
    const cycles: SCC[] = cycleSCCs(repo.files, all);

    cycleMembership = new Uint8Array(repo.files.length);
    for (const c of cycles) {
      for (const id of c) cycleMembership[id] = 1;
    }

    // Small ring for singleton self-loop cycles so they're still visible.
    const makeRing = (cx: number, cz: number, r: number): Vector3[] => {
      const out: Vector3[] = [];
      const seg = 16;
      for (let i = 0; i < seg; i++) {
        const a = (i / seg) * Math.PI * 2;
        out.push(new Vector3(cx + Math.cos(a) * r, 0, cz + Math.sin(a) * r));
      }
      return out;
    };

    // Hull line per cycle: sort points around centroid, inflate, close.
    for (const c of cycles) {
      const points: Vector3[] = c.map((id) => {
        const f = repo.files[id];
        return new Vector3((f.ix + 0.5) * CELL_SIZE, 0, (f.iz + 0.5) * CELL_SIZE);
      });
      let cx = 0, cz = 0;
      for (const p of points) { cx += p.x; cz += p.z; }
      cx /= points.length; cz /= points.length;

      const sorted = points.length === 1
        ? makeRing(cx, cz, CELL_SIZE * 1.3)
        : [...points].sort((a, b) => Math.atan2(a.z - cz, a.x - cx) - Math.atan2(b.z - cz, b.x - cx));

      const inflated = sorted.map((p) => {
        const dx = p.x - cx, dz = p.z - cz;
        const d = Math.hypot(dx, dz) || 1;
        return new Vector3(p.x + (dx / d) * 1.2, 0, p.z + (dz / d) * 1.2);
      });
      inflated.push(inflated[0]); // close

      const geo = new BufferGeometry().setFromPoints(inflated);
      const line = new Line(
        geo,
        new LineBasicMaterial({
          color: CYCLE_COLOR,
          transparent: true,
          opacity: CYCLE_HULL_OPACITY,
        }),
      );
      line.position.y = 0.04;
      line.raycast = () => null;
      scene.add(line);
      cycleHulls.push(line);

      // Bezier edges connecting ordered cycle members. Singletons skip
      // (the hull ring already conveys the self-loop).
      if (c.length > 1) {
        const ordered = c;
        for (let i = 0; i < ordered.length; i++) {
          const a = repo.files[ordered[i]];
          const b = repo.files[ordered[(i + 1) % ordered.length]];
          const start = new Vector3((a.ix + 0.5) * CELL_SIZE, 0.05, (a.iz + 0.5) * CELL_SIZE);
          const end   = new Vector3((b.ix + 0.5) * CELL_SIZE, 0.05, (b.iz + 0.5) * CELL_SIZE);
          const mid   = new Vector3().addVectors(start, end).multiplyScalar(0.5);
          mid.y += Math.min(start.distanceTo(end) * 0.35, 14);
          const curve = new QuadraticBezierCurve3(start, mid, end);
          const edge = new Line(
            new BufferGeometry().setFromPoints(curve.getPoints(20)),
            new LineBasicMaterial({
              color: CYCLE_COLOR,
              transparent: true,
              opacity: CYCLE_EDGE_OPACITY,
            }),
          );
          edge.raycast = () => null;
          scene.add(edge);
          cycleEdges.push(edge);
        }
      }
    }
  }

  // ── Boundary marker visuals ──
  // Strict additive-only visuals. Built once per init, theme is applied via
  // material color updates so they stay readable on theme flip without
  // rebuilding any geometry.
  function disposeBoundaryVisuals() {
    for (const g of entryGlyphs) {
      scene.remove(g.stem);
      scene.remove(g.tip);
    }
    entryGlyphs = [];
    for (const g of ingressGlyphs) {
      scene.remove(g.mesh);
    }
    ingressGlyphs = [];
    for (const g of egressGlyphs) {
      scene.remove(g.line);
    }
    egressGlyphs = [];
    if (boundaryStemGeo) { boundaryStemGeo.dispose(); boundaryStemGeo = null; }
    if (boundaryEgressGeo) { boundaryEgressGeo.dispose(); boundaryEgressGeo = null; }
    if (boundaryTipGeo) { boundaryTipGeo.dispose(); boundaryTipGeo = null; }
    for (const g of boundaryIngressGeos.values()) g.dispose();
    boundaryIngressGeos.clear();
    if (boundaryStemMat) { boundaryStemMat.dispose(); boundaryStemMat = null; }
    if (boundaryTipMat) { boundaryTipMat.dispose(); boundaryTipMat = null; }
    if (boundaryEgressMat) { boundaryEgressMat.dispose(); boundaryEgressMat = null; }
    if (boundaryIngressMat) { boundaryIngressMat.dispose(); boundaryIngressMat = null; }
    cachedBoundaryTheme = null;
  }

  function applyBoundaryTheme(theme: 'dark' | 'light') {
    if (cachedBoundaryTheme === theme) return;
    // Foreground: white on dark bg, near-black on light bg. Same hue family
    // as labels so glyphs don't fight the heat overlay's chromatic channel.
    const fg = theme === 'light' ? 0x0d1117 : 0xffffff;
    if (boundaryStemMat) boundaryStemMat.color.setHex(fg);
    if (boundaryTipMat) boundaryTipMat.color.setHex(fg);
    if (boundaryEgressMat) boundaryEgressMat.color.setHex(fg);
    if (boundaryIngressMat) boundaryIngressMat.color.setHex(fg);
    cachedBoundaryTheme = theme;
  }

  function buildBoundaryVisuals(repo: RepoData, theme: 'dark' | 'light') {
    disposeBoundaryVisuals();
    const fg = theme === 'light' ? 0x0d1117 : 0xffffff;

    // Shared geometries.
    boundaryStemGeo = new BufferGeometry().setFromPoints([
      new Vector3(0, 0, 0),
      new Vector3(0, 2.5, 0),
    ]);
    boundaryEgressGeo = new BufferGeometry().setFromPoints([
      new Vector3(0, 0, 0),
      new Vector3(0, -1.5, 0),
    ]);
    boundaryTipGeo = new SphereGeometry(0.15, 8, 6);

    // Shared materials (one per visual class — kind/protocol differences are
    // expressed via tube radius, not color, per the visual spec).
    boundaryStemMat = new LineBasicMaterial({
      color: fg, transparent: true, opacity: 0.5,
    });
    boundaryTipMat = new MeshBasicMaterial({
      color: fg, transparent: true, opacity: 0.55, depthWrite: false,
    });
    boundaryEgressMat = new LineBasicMaterial({
      color: fg, transparent: true, opacity: 0.4,
    });
    boundaryIngressMat = new MeshBasicMaterial({
      color: fg, transparent: true, opacity: 0.45, depthWrite: false,
    });

    // Pre-build one torus geometry per ingress protocol (4 max).
    const protocols: IngressProtocol[] = ['http', 'webhook', 'queue', 'grpc'];
    for (const p of protocols) {
      boundaryIngressGeos.set(
        p,
        new TorusGeometry(0.9, INGRESS_TUBE[p], 8, 48),
      );
    }

    for (const f of repo.files) {
      if (!f.boundaries || f.boundaries.length === 0) continue;
      const x = (f.ix + 0.5) * CELL_SIZE;
      const z = (f.iz + 0.5) * CELL_SIZE;
      for (const b of f.boundaries) {
        if (b.kind === 'entry') {
          const stem = new Line(boundaryStemGeo, boundaryStemMat);
          stem.position.set(x, 0, z);
          stem.visible = false;
          stem.raycast = () => null;
          const tip = new Mesh(boundaryTipGeo, boundaryTipMat);
          tip.position.set(x, 2.5, z);
          tip.visible = false;
          tip.raycast = () => null;
          scene.add(stem);
          scene.add(tip);
          entryGlyphs.push({ stem, tip });
        } else if (b.kind === 'ingress') {
          const geo = boundaryIngressGeos.get(b.protocol);
          if (!geo) continue;
          const mesh = new Mesh(geo, boundaryIngressMat);
          mesh.rotation.x = -Math.PI / 2;  // lay flat on XZ
          mesh.position.set(x, 0.3, z);
          mesh.visible = false;
          mesh.raycast = () => null;
          scene.add(mesh);
          ingressGlyphs.push({ mesh, protocol: b.protocol });
        } else if (b.kind === 'egress') {
          const line = new Line(boundaryEgressGeo, boundaryEgressMat);
          line.position.set(x, 0, z);
          line.visible = false;
          line.raycast = () => null;
          scene.add(line);
          egressGlyphs.push({ line, protocol: b.protocol });
        }
      }
    }
    cachedBoundaryTheme = theme;
  }

  function updateBoundaryVisibility(ov: {
    showEntry: boolean;
    showIngress: boolean;
    showEgress: boolean;
    ingressProtocols: ReadonlySet<IngressProtocol>;
    egressProtocols: ReadonlySet<EgressProtocol>;
  }) {
    for (const g of entryGlyphs) {
      g.stem.visible = ov.showEntry;
      g.tip.visible = ov.showEntry;
    }
    for (const g of ingressGlyphs) {
      g.mesh.visible = ov.showIngress && ov.ingressProtocols.has(g.protocol);
    }
    for (const g of egressGlyphs) {
      g.line.visible = ov.showEgress && ov.egressProtocols.has(g.protocol);
    }
  }

  function animate() {
    rafId = requestAnimationFrame(animate);
    if (!ctx) return;

    const theme = ctx.getTheme();
    const pal = paletteFor(theme);
    if (theme !== lastTheme) {
      applyThemeStatics(pal, theme);
      applyBoundaryTheme(theme);
      lastTheme = theme;
    }

    rotCurrent.x += (rotTarget.x - rotCurrent.x) * 0.1;
    rotCurrent.y += (rotTarget.y - rotCurrent.y) * 0.1;
    zoomCurrent += (zoomTarget - zoomCurrent) * 0.1;
    panOffset.lerp(panTarget, 0.15);

    camera.position.x = panOffset.x + zoomCurrent * Math.sin(rotCurrent.y) * Math.cos(rotCurrent.x);
    camera.position.y = zoomCurrent * Math.sin(rotCurrent.x);
    camera.position.z = panOffset.z + zoomCurrent * Math.cos(rotCurrent.y) * Math.cos(rotCurrent.x);
    camera.lookAt(panOffset.x, 0, panOffset.z);

    const snap: FilterSnapshot = ctx.getFilter();
    const repo = ctx.repo;
    const filterActive = isFilterActive(snap.state, repo);
    const topN = snap.state.topNHighlight;
    const rect = cachedRect;

    // ── Heat overlay snapshot (recompute scores only when metric changes) ──
    const ov = ctx.getOverlay();
    const hm = findMetric(ov.metric);
    // Time-axis hotspot needs a recompute whenever the time window changes,
    // since the registered metric.score() always returns 0 — we route
    // through `timeWindowHeat()` instead, keyed on metric + window.
    const heatCacheKey = ov.metric === 'time-hotspot'
      ? `time-hotspot:${ov.timeWindow}`
      : ov.metric;
    if (cachedHeatKey !== heatCacheKey) {
      cachedHeatKey = heatCacheKey;
      if (cachedScores.length !== repo.files.length) cachedScores = new Float32Array(repo.files.length);
      if (ov.metric === 'none') {
        cachedScores.fill(0);
      } else {
        for (let i = 0; i < repo.files.length; i++) {
          const file = repo.files[i];
          cachedScores[i] = ov.metric === 'time-hotspot'
            ? timeWindowHeat(file, ov.timeWindow)
            : hm.score(file, repo);
        }
      }
    }
    const haloOn = ov.metric !== 'none';
    const haloHue = _color.set(hm.hue);

    // ── Blast radius preview (recompute only when seed or repo changes) ──
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

    // ── Path witness (recompute only when endpoints or repo change) ──
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

    // ── Risk lens (recompute only when lens or repo changes) ──
    const lens = ov.riskLens;
    if (lens === null) {
      if (cachedRiskLens !== null) {
        cachedRiskLens = null;
        cachedRiskRepo = null;
        cachedRiskHits = [];
        disposeRiskLensVisuals();
      }
    } else if (lens !== cachedRiskLens || cachedRiskRepo !== repo) {
      cachedRiskLens = lens;
      cachedRiskRepo = repo;
      cachedRiskHits = topRiskLens(repo, lens, 10);
      buildRiskLensVisuals(cachedRiskHits, lens);
    }

    // ── Public-API ring (rebuild on toggle, theme change, or repo change) ──
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

    // ── PR diff (recompute only when seed or repo changes) ──
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

    // ── SCC cycle hulls (active only when overlay metric is 'cycles') ──
    if (ov.metric === 'cycles') {
      if (cachedCyclesRepo !== repo) {
        disposeCycleVisuals();
        buildCycleVisuals(repo);
        cachedCyclesRepo = repo;
      }
    } else if (cachedCyclesRepo !== null) {
      disposeCycleVisuals();
      cachedCyclesRepo = null;
    }

    // ── Boundary marker visibility (no rebuild — just toggle .visible) ──
    updateBoundaryVisibility(ov);

    // Pulse deleted-change halos and affected-ripple rings on a sin wave
    // so they read as "in motion, not stable" alongside the static change tints.
    if (prChangeHalos.length > 0 || prAffectedHalos.length > 0) {
      const t = performance.now() * 0.003;
      const pulse = 0.5 + 0.5 * Math.sin(t);
      for (const c of prChangeHalos) {
        if (c.kind === 'deleted') {
          c.mesh.material.opacity = 0.3 + 0.55 * pulse;
        }
      }
      for (const r of prAffectedHalos) {
        r.material.opacity = 0.25 + 0.45 * pulse;
      }
    }

    folderZones.forEach((z) => {
      const v = _v3.set(z.xStart * CELL_SIZE, 0, z.zStart * CELL_SIZE).project(camera);
      z.div.style.left = `${(v.x * 0.5 + 0.5) * rect.width + rect.left + 5}px`;
      z.div.style.top = `${(v.y * -0.5 + 0.5) * rect.height + rect.top + 5}px`;
      z.div.style.display = v.z > 1 || Math.abs(v.x) > 1.1 ? 'none' : 'block';
      z.div.style.opacity = selectedId === null ? '1.0' : '0.2';
    });

    const labelOpacity = zoomCurrent < LABEL_THRESHOLD ? 1 - (zoomCurrent - 50) / (LABEL_THRESHOLD - 50) : 0;

    for (let id = 0; id < fileMeshes.length; id++) {
      const m = fileMeshes[id];
      if (!m) continue;
      const f = repo.files[id];
      const isSel = selectedId === id;
      const isDep = selectedId !== null && repo.files[selectedId].deps.includes(id);
      const isMatched = !filterActive || snap.matched[id] === 1;
      const rank = snap.rankByFileId[id];
      const isGlow = topN > 0 && rank >= 0 && rank < topN;

      let targetScaleY = 1;
      if (isSel || isDep) {
        const metricHeight = 8 + (f.metrics.complexity / 50) * (MAX_PILLAR_HEIGHT - 8);
        targetScaleY = metricHeight / UNIFORM_HEIGHT;
      } else if (isGlow) {
        const lift = 1.5 + (1 - rank / Math.max(topN, 1)) * 4.5;
        targetScaleY = lift / UNIFORM_HEIGHT;
      }
      let targetOpacity: number;
      if (selectedId !== null) targetOpacity = isSel || isDep ? 1 : 0.05;
      else if (filterActive) targetOpacity = isMatched ? 1 : 0.04;
      else targetOpacity = 1;

      // Identity-only hue: stable / modified / vulnerable, with a single
      // out-of-scope purple for generated + vendor files. Highlight (top-N,
      // selection) is moved off the hue channel — see scale/border below.
      const isOutOfScope = f.isGenerated || f.layer === 'vendor';
      const baseColor = isOutOfScope ? pal.outOfScope : pal.status[f.status];
      m.material.color.lerp(_color.set(baseColor), 0.15);
      m.scale.y += (targetScaleY - m.scale.y) * 0.15;
      m.position.y = (m.scale.y * UNIFORM_HEIGHT) / 2;
      m.material.opacity += (targetOpacity - m.material.opacity) * 0.15;

      // ── Heat halo per file ──
      // When a risk lens is active, the lens halos *replace* normal heat —
      // fade the per-file heat halo out so the two systems don't compete.
      const halo = haloMeshes[id];
      if (halo) {
        if (ov.riskLens !== null) {
          halo.material.opacity += (0 - halo.material.opacity) * 0.18;
          const cur = halo.scale.x;
          const next = cur + (0.001 - cur) * 0.18;
          halo.scale.set(next, next, next);
        } else {
          let s = 0;
          if (haloOn) {
            const raw = cachedScores[id];
            // Threshold clip — quiet the floor
            s = raw > ov.threshold ? raw : 0;
            // Filter dim: if user filtered down, non-matched files lose heat.
            if (filterActive && !isMatched) s *= 0.05;
            if (selectedId !== null && !(isSel || isDep)) s *= 0.15;
          }
          // Map score → alpha (square → contrast) and scale (linear)
          const targetAlpha = haloOn ? Math.pow(s, 1.6) * 0.85 * ov.intensity : 0;
          const targetScale = haloOn && s > 0
            ? 0.6 + s * (1.2 + ov.radius * 2.4)
            : 0.001;
          halo.material.color.lerp(haloHue, 0.25);
          halo.material.opacity += (targetAlpha - halo.material.opacity) * 0.18;
          const cur = halo.scale.x;
          const next = cur + (targetScale - cur) * 0.18;
          halo.scale.set(next, next, next);
        }
      }

      const div = fileLabels[id];
      const showLabel = (labelOpacity > 0.01 && (isMatched || !filterActive)) || isSel || isDep || isGlow;
      if (showLabel) {
        const v = _v3.setFromMatrixPosition(m.matrixWorld);
        v.y = m.scale.y * UNIFORM_HEIGHT + 0.5;
        v.project(camera);
        div.style.left = `${(v.x * 0.5 + 0.5) * rect.width + rect.left}px`;
        div.style.top = `${(v.y * -0.5 + 0.5) * rect.height + rect.top}px`;
        div.style.transform = 'translate(-50%, -100%)';
        div.style.opacity = String(isSel || isDep || isGlow ? 1 : labelOpacity * (isMatched ? 1 : 0.2));
        div.style.display = v.z > 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1 ? 'none' : 'block';
        // Highlight is conveyed by *weight + size + selected-state color*,
        // not by a separate hue. Vulnerable still keeps the danger hue
        // because that's identity, not highlight.
        div.style.color = isSel || isGlow
          ? pal.labelSelected
          : f.metrics.security
            ? pal.labelDanger
            : pal.labelDefault;
        div.style.fontSize = isGlow || isSel ? '10px' : '8px';
        div.style.fontWeight = isGlow || isSel ? '800' : '500';
      } else {
        div.style.display = 'none';
      }
    }

    if (selectedId !== null) updateLines();
    renderer.render(scene, camera);
  }

  return {
    id: 'dot-field',
    label: 'Dot Field',
    worldToScreen(fileId) {
      // Project the mesh's world position onto NDC, then convert to the
      // mountEl's local pixel coordinates (the overlay is positioned
      // absolute over the same container, so these match).
      if (!ctx || !camera || !renderer) return null;
      const mesh = fileMeshes[fileId];
      if (!mesh) return null;
      // Use cached rect (refreshed in onResize / on scroll) and pooled
      // _v3a — worldToScreen can be called many times per frame by overlay
      // consumers, so per-call layout reads + Vector3 alloc were measurable.
      const rect = cachedRect;
      const v = _v3a.setFromMatrixPosition(mesh.matrixWorld);
      v.project(camera);
      // NDC space is [-1,1]. Out-of-frustum gets clamped by the caller.
      const x = (v.x * 0.5 + 0.5) * rect.width;
      const y = (1 - (v.y * 0.5 + 0.5)) * rect.height;
      // Negative z indicates behind camera — return null so overlay hides.
      if (v.z > 1 || v.z < -1) return null;
      return { x, y };
    },
    init(c) {
      ctx = c;
      const initialTheme = c.getTheme();
      const pal = paletteFor(initialTheme);
      lastTheme = initialTheme;

      refreshCachedRect();
      const rect = cachedRect;
      scene = new Scene();
      scene.background = new Color(pal.bg);
      camera = new PerspectiveCamera(35, rect.width / rect.height, 1, 6000);

      renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      renderer.setSize(rect.width, rect.height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      // WebGL canvases ship with a default white clear colour and are
      // briefly visible *before* the first render() call lands a real
      // frame. Match the scene background here so the first paint after
      // mount is dark (or light) instead of flashing white.
      // pal.bg is a hex *number* (e.g. 0x0d1117); setClearColor takes
      // numbers but CSS background needs a string, so format it here.
      renderer.setClearColor(pal.bg, 1);
      renderer.domElement.style.background = `#${pal.bg.toString(16).padStart(6, '0')}`;
      c.mountEl.appendChild(renderer.domElement);

      raycaster = new Raycaster();

      // Oversize the grid so it fills the canvas no matter how the user pans
      // or how wide the viewport is. Cell size stays the same so spacing is
      // identical to the data area.
      const GRID_OVERSCAN = 4;
      gridHelper = new GridHelper(
        GRID_COUNT * CELL_SIZE * GRID_OVERSCAN,
        GRID_COUNT * GRID_OVERSCAN,
        pal.grid,
        pal.grid,
      );
      gridHelper.position.y = -0.05;
      const gm = gridHelper.material as Material;
      gm.transparent = true;
      gm.opacity = c.getTheme() === 'light' ? 0.5 : 1;
      scene.add(gridHelper);

      // folders
      for (const folder of c.repo.folders) {
        if (folder.depth === 0) continue;
        const x0 = folder.xStart * CELL_SIZE;
        const x1 = (folder.xStart + folder.width) * CELL_SIZE;
        const z0 = folder.zStart * CELL_SIZE;
        const z1 = (folder.zStart + folder.height) * CELL_SIZE;
        const pts = [
          new Vector3(x0, 0, z0), new Vector3(x1, 0, z0),
          new Vector3(x1, 0, z1), new Vector3(x0, 0, z1),
          new Vector3(x0, 0, z0),
        ];
        const line = new Line(
          new BufferGeometry().setFromPoints(pts),
          new LineBasicMaterial({ color: pal.folder, transparent: true, opacity: 0.5 }),
        );
        line.position.y = -0.04 + folder.depth * 0.01;
        scene.add(line);

        const div = document.createElement('div');
        div.className = 'folder-label';
        div.innerText = folder.name;
        c.labelsEl.appendChild(div);
        folderZones.push({ div, xStart: folder.xStart, zStart: folder.zStart, line });
      }

      // files + halo planes (heat overlay). Halo is a flat additive plane
      // sitting just below each box; size+alpha are driven by score in animate().
      fileMeshes = new Array<Mesh<BoxGeometry, MeshBasicMaterial>>(c.repo.files.length);
      fileLabels = new Array<HTMLDivElement>(c.repo.files.length);
      haloMeshes = new Array<Mesh<PlaneGeometry, MeshBasicMaterial>>(c.repo.files.length);
      const haloGeo = new PlaneGeometry(CELL_SIZE * 1.4, CELL_SIZE * 1.4);
      for (const f of c.repo.files) {
        const isOutOfScope = f.isGenerated || f.layer === 'vendor';
        const initialColor = isOutOfScope ? pal.outOfScope : pal.status[f.status];
        const boxGeo = new BoxGeometry(CELL_SIZE * 0.88, UNIFORM_HEIGHT, CELL_SIZE * 0.88);
        applyBoxFaceShading(boxGeo);
        const mesh = new Mesh(
          boxGeo,
          new MeshBasicMaterial({ color: initialColor, transparent: true, vertexColors: true }),
        );
        mesh.position.set((f.ix + 0.5) * CELL_SIZE, UNIFORM_HEIGHT / 2, (f.iz + 0.5) * CELL_SIZE);
        mesh.userData = { id: f.id };
        const label = document.createElement('div');
        label.className = 'file-floating-label';
        label.innerText = f.name;
        c.fileLabelsEl.appendChild(label);

        // halo
        const halo = new Mesh(
          haloGeo,
          new MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            blending: AdditiveBlending,
          }),
        );
        halo.rotation.x = -Math.PI / 2;
        halo.position.set((f.ix + 0.5) * CELL_SIZE, -0.02, (f.iz + 0.5) * CELL_SIZE);
        halo.scale.setScalar(0.001);

        fileMeshes[f.id] = mesh;
        fileLabels[f.id] = label;
        haloMeshes[f.id] = halo;
        scene.add(halo);   // halo first so it sits behind the dot
        scene.add(mesh);
      }
      cachedHeatKey = null;
      cachedScores = new Float32Array(c.repo.files.length);

      // Boundary markers — pre-built once, hidden until overlay toggles flip on.
      buildBoundaryVisuals(c.repo, initialTheme);

      // Apply per-theme label styles to folder DOM nodes once before first frame.
      applyThemeStatics(pal, initialTheme);

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mousedown', onMouseDown);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('wheel', onWheel, { passive: false });
      window.addEventListener('contextmenu', onContextMenu);
      window.addEventListener('click', onClick);
      window.addEventListener('keydown', onKeyDown);
      // Page scroll changes mountEl's top/left (rect is viewport-relative);
      // passive listener so we don't block scroll perf.
      window.addEventListener('scroll', onScroll, { passive: true });

      animate();
    },
    onResize(w, h) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      refreshCachedRect();
    },
    dispose() {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('click', onClick);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onScroll);
      fileMeshes.forEach((m) => { m.geometry.dispose(); m.material.dispose(); });
      // halos share geometry — dispose once + each material individually
      if (haloMeshes.length) haloMeshes[0].geometry.dispose();
      haloMeshes.forEach((h) => { h.material.dispose(); });
      fileLabels.forEach((l) => { l.remove(); });
      folderZones.forEach((z) => {
        z.div.remove();
        z.line.geometry.dispose();
        (z.line.material as Material).dispose();
      });
      lineObjects.forEach((l) => { l.geometry.dispose(); (l.material as Material).dispose(); });
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
      cachedRiskHits = [];
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
      disposeBoundaryVisuals();
      if (gridHelper) {
        gridHelper.geometry.dispose();
        const m = gridHelper.material as Material | Material[];
        Array.isArray(m) ? m.forEach((x) => { x.dispose(); }) : m.dispose();
      }
      renderer.dispose();
      if (renderer.domElement.parentNode === ctx?.mountEl) {
        ctx.mountEl.removeChild(renderer.domElement);
      }
      fileMeshes = []; fileLabels = []; folderZones = []; gridHelper = null; lastTheme = null;
      ctx = null;
    },
  };
}
