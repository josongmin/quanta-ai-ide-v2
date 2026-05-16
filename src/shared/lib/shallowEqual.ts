// Shallow structural equality for the "is this form pristine?" check.
//
// Replaces hot-path `JSON.stringify(a) !== JSON.stringify(b)` comparisons in
// settings pages and useDirtyState — stringifying twice per keystroke ran the
// full form tree through JSON on every render, including arrays of objects
// and Sets reified via Array.from(...).sort(). For the dirty bit we only need
// to know whether each top-level key still references the same value; cheap
// composites (arrays/sets/maps) get a recursive shallow pass.

export function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (a === null || b === null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!Object.is(a[i], b[i])) return false;
    }
    return true;
  }

  if (a instanceof Set || b instanceof Set) {
    if (!(a instanceof Set) || !(b instanceof Set)) return false;
    if (a.size !== b.size) return false;
    for (const v of a) if (!b.has(v)) return false;
    return true;
  }

  if (a instanceof Map || b instanceof Map) {
    if (!(a instanceof Map) || !(b instanceof Map)) return false;
    if (a.size !== b.size) return false;
    for (const [k, v] of a) {
      if (!b.has(k) || !Object.is(b.get(k), v)) return false;
    }
    return true;
  }

  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (!Object.is(
      (a as Record<string, unknown>)[k],
      (b as Record<string, unknown>)[k],
    )) return false;
  }
  return true;
}
