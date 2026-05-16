// Star polygon geometry constants for UniverseMode.

import {
  CanvasTexture,
  LinearFilter,
  SRGBColorSpace,
  Vector3,
} from 'three';

export const HEIGHT_GAP = 90;

export const _v3 = new Vector3();

// Unit tetrahedron (4 verts, 6 edges) — small line-segment template that
// renders the same regardless of viewing angle, so every "star" reads as a
// polygon outline rather than a flat shape that disappears edge-on.
export const TETRA_V: readonly (readonly [number, number, number])[] = [
  [ 1,  1,  1],
  [-1, -1,  1],
  [-1,  1, -1],
  [ 1, -1, -1],
];
export const TETRA_EDGES: readonly (readonly [number, number])[] = [
  [0,1], [0,2], [0,3], [1,2], [1,3], [2,3],
];
// Per-star line size (world units). The point-sprite size attribute is
// in screen-space pixels and isn't directly comparable; this is tuned by eye
// to match perceived star magnitude in the dark mode.
export const STAR_LINE_BASE = 2.2;

// `inkRgb` is the disc color: '255,255,255' for dark mode (luminous star),
// '31,35,40' for light mode (negative-plate ink — Primer fg-default).
export function createStarTexture(inkRgb: string, haloAlpha: number): CanvasTexture {
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

  const tex = new CanvasTexture(canvas);
  // No mipmaps: tiny stars get blurry/dim under trilinear filtering.
  tex.generateMipmaps = false;
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.colorSpace = SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
