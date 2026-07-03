// Suggestion preset → live store mutation. Each preset triggers a small
// scripted demo so the empty-chat state isn't just decorative copy.
//
// We deliberately keep this in chat-agent (consumer) instead of a separate
// "demo" slice — the wiring is small, only the chat panel uses it, and
// it lets the panel stay in charge of when to fire it.

import { useCallback } from 'react';
import { useFilterRepo, useFilterActions } from '@entities/filter-state';
import { useOverlay } from '@features/apply-overlay';
import { useStack } from '@features/inspect-target';

export type SuggestionKey = 'lowSafety' | 'unknownFlag' | 'refactor' | 'blastRadius';

export type SuggestionEffect = {
  // Optional human-readable hint about what just happened. The chat panel
  // shows this as an agent reply so the user gets feedback even though no
  // real LLM is wired up.
  reply?: string;
};

export function useRunSuggestion(): (key: SuggestionKey) => SuggestionEffect {
  const repo = useFilterRepo();
  const { setRange, toggleFolder, clearFolders } = useFilterActions();
  const { setRiskLens, setBlastSeed } = useOverlay();
  const stack = useStack();

  return useCallback((key: SuggestionKey): SuggestionEffect => {
    switch (key) {
      case 'lowSafety': {
        // Range filter: editSafety ≤ 40. Combined with the security risk
        // lens so the dot field highlights the worst offenders.
        setRange('editSafety', [0, 40]);
        setRiskLens('security');
        const matched = repo.files.filter((f) => f.metrics.editSafety <= 40).length;
        return {
          reply: `Filtered ${matched.toString()} file${matched === 1 ? '' : 's'} with edit-safety ≤ 40 and turned on the security risk lens. The dot field now highlights the worst offenders.`,
        };
      }

      case 'unknownFlag': {
        // Pick a representative unknown-confidence file (prefer one in core/)
        // and open the inspect stack on it. The user sees the evidence trail
        // for "why this file is flagged unknown".
        const core = repo.files.find(
          (f) => f.metrics.confidence === 'unknown' && f.folderPath.startsWith('src.core'),
        );
        const fallback = repo.files.find((f) => f.metrics.confidence === 'unknown');
        const target = core ?? fallback;
        if (!target) {
          return { reply: 'No unknown-confidence files in this repo right now.' };
        }
        stack.open({ kind: 'file', id: target.id });
        return {
          reply: `Opened ${target.name} (confidence = unknown). Switch to the Evidence tab in the focus panel to see the analyzer’s reasons.`,
        };
      }

      case 'refactor': {
        // Scope the workspace to src/hooks (or any folder ending in /hooks),
        // then open the folder inspect panel — its Risk tab shows the
        // refactor candidates.
        const hooks = repo.folders.find(
          (f) => f.path === 'src.hooks' || f.path.endsWith('.hooks'),
        );
        if (!hooks) {
          return { reply: 'No hooks folder found in this workspace.' };
        }
        clearFolders();
        toggleFolder(hooks.path, true);
        stack.open({ kind: 'folder', path: hooks.path });
        return {
          reply: `Scoped to ${hooks.path.split('.').join('/')} and opened the folder inspect panel. The Risk tab lists the top files to refactor first.`,
        };
      }

      case 'blastRadius': {
        // If the user already has a file selected via the focus stack, use
        // it. Otherwise pick the highest-blast file in the repo as a stand-in.
        const activeItem = stack.items.find((it) => it.kind === 'file');
        let seedId: number | null = null;
        if (activeItem?.kind === 'file') {
          seedId = activeItem.id;
        } else {
          const top = [...repo.files]
            .filter((f) => f.metrics.blastRadius > 0)
            .sort((a, b) => b.metrics.blastRadius - a.metrics.blastRadius)[0];
          if (top) seedId = top.id;
        }
        if (seedId === null) {
          return { reply: 'No file with a non-zero blast radius is currently in scope.' };
        }
        setBlastSeed(seedId);
        // Also surface the file in the focus stack so the panel reflects
        // what the overlay is showing.
        stack.open({ kind: 'file', id: seedId });
        const seedFile = repo.files[seedId];
        const hops = seedFile?.metrics.blastRadius ?? 0;
        return {
          reply: `Highlighting transitive dependents of ${seedFile?.name ?? `#${seedId.toString()}`} (~${hops.toString()} files affected). Press Esc to clear the overlay.`,
        };
      }
    }
  }, [repo, setRange, toggleFolder, clearFolders, setRiskLens, setBlastSeed, stack]);
}
