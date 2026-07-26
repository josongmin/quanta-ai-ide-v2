export function reconcileMountedTabs(
  current: readonly string[],
  activeId: string,
  aliveIds: ReadonlySet<string>,
  limit: number,
): string[] {
  if (limit < 1) throw new RangeError('Mounted tab limit must be at least 1');
  const next = current.filter((id, index) => aliveIds.has(id) && current.indexOf(id) === index && id !== activeId);
  if (aliveIds.has(activeId)) next.push(activeId);
  while (next.length > limit) next.shift();
  return next;
}
