import { useState } from 'react';

export const SLASH_COMMANDS: { cmd: string; desc: string }[] = [
  { cmd: '/plan', desc: 'Outline a plan before coding' },
  { cmd: '/diff', desc: 'Preview a branch or PR diff inline' },
  { cmd: '/test', desc: 'Add tests for changed surfaces' },
  { cmd: '/fix', desc: 'Diagnose and fix the latest failure' },
  { cmd: '/explain', desc: 'Explain a region of code' },
  { cmd: '/review', desc: 'Review the working branch' },
  { cmd: '/clean', desc: 'Refactor for clarity, no behavior change' },
];

// Slash menu state. Pops above the textarea when the draft starts with
// `/`. `slashIndex` is reset whenever the draft changes shape, using the
// "derive from prop" pattern (state-reset-during-render) to avoid the
// cascading re-render warning the effect-based version triggered.
export function useSlashCommands(draft: string) {
  const showSlash = draft.startsWith('/');
  const slashFiltered = showSlash
    ? SLASH_COMMANDS.filter((c) => c.cmd.startsWith(draft.split(/\s+/, 1)[0]))
    : [];
  const [slashIndex, setSlashIndex] = useState(0);
  // Reset slash highlight when the filtered list changes shape. Using the
  // "derive from prop" pattern (state-reset-during-render) avoids the
  // cascading re-render warning that the effect-based version triggered.
  const [prevDraft, setPrevDraft] = useState(draft);
  if (draft !== prevDraft) {
    setPrevDraft(draft);
    setSlashIndex(0);
  }

  return { showSlash, slashFiltered, slashIndex, setSlashIndex };
}
