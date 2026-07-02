// Shared "is focus in a typing surface?" guard for global keyboard handlers, so
// shortcuts don't fire while the user is typing in an input/textarea/select or
// a contentEditable region. Consolidates ~8 per-slice copies of this predicate.

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}
