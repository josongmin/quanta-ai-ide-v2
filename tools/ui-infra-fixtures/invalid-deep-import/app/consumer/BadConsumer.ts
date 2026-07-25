// Fixture (invalid): consumer reaches past the public barrel into a kernel
// internal path. Trips deepImport (should import '@shared/workbench/core' instead).
import { ScopeNode } from '@shared/workbench/core/internal/ScopeNode';

export const consumer = { node: ScopeNode };
