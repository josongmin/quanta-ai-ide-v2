import type { RepoData } from '@entities/repo';
import { type StackItem } from '../../model/StackContext';

// Display string for an inspect tab (label / path). Shared by the vertical
// crest tabs and the history dropdown rows.
export function itemLabel(
  item: StackItem,
  repo: RepoData,
  t: (key: string) => string,
): { name: string; sub: string } {
  if (item.kind === 'workspace') return { name: t('header.workspace'), sub: t('header.workspaceName') };
  if (item.kind === 'folder') {
    const f = repo.foldersByPath.get(item.path);
    return {
      name: f?.name ?? t('deps.rootLabel'),
      sub: f ? (f.parts.length === 0 ? '/' : '/' + f.parts.join('/')) : item.path,
    };
  }
  const file = repo.files[item.id];
  return { name: file?.name ?? `#${item.id}`, sub: file?.folderPath ?? '' };
}
