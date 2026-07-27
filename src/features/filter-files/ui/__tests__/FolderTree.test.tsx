import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { buildRepo } from '@entities/repo';
import { useFilterStore } from '@entities/filter-state';
import '@shared/i18n/config';
import FolderTree from '../FolderTree';

// Regression: a folder.fileIds entry that has no matching record in repo.files
// (data drift) previously produced an `undefined` element that crashed FileRow
// (it reads `file.id`). FolderTree must drop the hole and render.

describe('FolderTree — dangling fileId hardening', () => {
  it('renders without crashing when a folder references a missing fileId', () => {
    const repo = buildRepo(7);
    // Find a folder that actually has files so its row expands and maps them.
    const folderWithFiles = repo.folders.find((f) => f.fileIds.length > 0);
    expect(folderWithFiles).toBeDefined();
    // Inject a dangling id far beyond the file array bounds.
    folderWithFiles!.fileIds = [...folderWithFiles!.fileIds, repo.files.length + 999];

    useFilterStore.getState().initRepo(repo);

    // Would throw inside FileRow (`file.id`) before the `.filter(undefined)` fix.
    expect(() => render(<FolderTree />)).not.toThrow();
  });
});
