// Shared geometry / camera constants for DotFieldMode.

import type { BoxGeometry} from 'three';
import { BufferAttribute, Color, Vector3 } from 'three';

export const UNIFORM_HEIGHT = 0.05;
export const MAX_PILLAR_HEIGHT = 35.0;
export const LABEL_THRESHOLD = 150;

// Per-face shading on the file box. The material's `color` is multiplied
// by per-vertex colors, so a top face of (1,1,1) preserves the base hue
// while side faces use darker multipliers to fake light/shadow when the
// box is raised on click. While flat, only the top face is visible so the
// shading is invisible — the dot reads as a flat tile, as before.
//
// BoxGeometry face order (groups): +X, -X, +Y (top), -Y (bot), +Z, -Z.
// Each face has 4 vertices.
const BOX_FACE_TINTS: [number, number, number][] = [
  [0.78, 0.78, 0.78], // +X right — mid-bright
  [0.55, 0.55, 0.55], // -X left  — shadow
  [1.00, 1.00, 1.00], // +Y top   — full hue (flat dot uses this)
  [0.40, 0.40, 0.40], // -Y bot   — darkest (rarely seen)
  [0.88, 0.88, 0.88], // +Z front — brightest side
  [0.62, 0.62, 0.62], // -Z back  — mid-dark
];
export function applyBoxFaceShading(geo: BoxGeometry) {
  const count = geo.attributes['position'].count; // 24 for a Box (6 faces × 4 verts)
  const colors = new Float32Array(count * 3);
  for (let face = 0; face < 6; face++) {
    const [r, g, b] = BOX_FACE_TINTS[face];
    for (let v = 0; v < 4; v++) {
      const i = (face * 4 + v) * 3;
      colors[i] = r;
      colors[i + 1] = g;
      colors[i + 2] = b;
    }
  }
  geo.setAttribute('color', new BufferAttribute(colors, 3));
}

export const FLAT = { x: Math.PI / 2, y: 0, dist: 350 };
export const SIDE = { x: 0.9, y: 0.4, dist: 180 };

// Reusable temporaries — every animate() frame projects ~600 file boxes plus
// folder zones. Allocating fresh Vector3 / Color each call piles
// pressure on the JS GC; we reuse these and call `.set(...)` instead.
// _v3 is the primary projection scratch; _v3a/_v3b are extra slots for
// helpers (updateLines, worldToScreen) that need 2-3 distinct vectors live
// at once per frame. Invariant: never hold a reference across a yield —
// each call site reads/writes synchronously then drops it.
export const _v3 = new Vector3();
export const _v3a = new Vector3();
export const _v3b = new Vector3();
export const _v3c = new Vector3();
export const _color = new Color();
