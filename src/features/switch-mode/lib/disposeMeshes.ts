import type { BufferGeometry, Material, Object3D } from 'three';

/**
 * Minimal shape shared by every overlay object both mode renderers create
 * (Mesh / Line / LineSegments / Points). They all carry a disposable geometry
 * and one-or-many disposable materials.
 */
type DisposableObject = Object3D & {
  geometry: BufferGeometry;
  material: Material | Material[];
};

/**
 * Detach `obj` from its `parent` (if any) and free its GPU resources.
 *
 * Order is significant and matches the hand-written dispose blocks both modes
 * used before this extraction: remove from the scene graph first, then dispose
 * geometry, then dispose material(s). `parent` may be null (UniverseMode's
 * overlayGroup is created lazily); the original code guarded the `.remove` call
 * the same way.
 *
 * Material arrays are handled defensively so the helper stays correct even if a
 * future overlay uses multi-material meshes; current callers only ever pass
 * single-material objects.
 */
export function disposeMesh(parent: Object3D | null, obj: DisposableObject): void {
  parent?.remove(obj);
  obj.geometry.dispose();
  const mat = obj.material;
  if (Array.isArray(mat)) {
    for (const m of mat) m.dispose();
  } else {
    mat.dispose();
  }
}

/** Dispose every object in `meshes` against the same `parent`. */
export function disposeMeshes(parent: Object3D | null, meshes: DisposableObject[]): void {
  for (const obj of meshes) disposeMesh(parent, obj);
}
