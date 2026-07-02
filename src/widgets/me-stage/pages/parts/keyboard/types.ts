export type Shortcut = {
  id: string;
  label: string;
  group: string;
  defaultKey: string;
  current: string;
  description: string;
};

export const DEFAULTS: Shortcut[] = [
  // Global
  { id: 'palette',    group: 'Global', label: 'Open command palette',     defaultKey: '⌘K',     current: '⌘K',     description: 'Search and run any command' },
  { id: 'help',       group: 'Global', label: 'Open help & shortcuts',    defaultKey: '⌘/',     current: '⌘/',     description: 'This page, basically' },
  { id: 'theme',      group: 'Global', label: 'Toggle dark/light theme',  defaultKey: '⌘⇧T',    current: '⌘⇧T',    description: 'Cycle theme manually' },
  { id: 'settings',   group: 'Global', label: 'Open settings',            defaultKey: '⌘,',     current: '⌘,',     description: 'This page, basically' },
  { id: 'inbox',      group: 'Global', label: 'Open inbox',               defaultKey: 'gI',     current: 'gI',     description: 'Two-key sequence' },

  // Navigation
  { id: 'tab.intel',  group: 'Navigation', label: 'Go to Intelligence', defaultKey: '⌘1', current: '⌘1', description: '' },
  { id: 'tab.invest', group: 'Navigation', label: 'Go to Investigate',  defaultKey: '⌘2', current: '⌘2', description: '' },
  { id: 'tab.code',   group: 'Navigation', label: 'Go to Coding',       defaultKey: '⌘3', current: '⌘3', description: '' },
  { id: 'tab.agent',  group: 'Navigation', label: 'Go to Agents',       defaultKey: '⌘4', current: '⌘4', description: '' },
  { id: 'tab.review', group: 'Navigation', label: 'Go to Reviews',      defaultKey: '⌘5', current: '⌘5', description: '' },
  { id: 'tab.adm',    group: 'Navigation', label: 'Go to Admission',    defaultKey: '⌘6', current: '⌘6', description: '' },
  { id: 'tab.fix',    group: 'Navigation', label: 'Go to Fixes',        defaultKey: '⌘7', current: '⌘7', description: '' },

  // Editing
  { id: 'save',       group: 'Editing', label: 'Save current draft',    defaultKey: '⌘S',  current: '⌘S',  description: '' },
  { id: 'submit',     group: 'Editing', label: 'Submit message / form', defaultKey: '⌘↵',  current: '⌘↵',  description: 'In any chat composer' },
  { id: 'cancel',     group: 'Editing', label: 'Cancel current action', defaultKey: 'Esc', current: 'Esc', description: '' },
  { id: 'find',       group: 'Editing', label: 'Find in current view',  defaultKey: '⌘F',  current: '⌘F',  description: '' },

  // Reviews
  { id: 'rev.next',   group: 'Reviews', label: 'Next review item',     defaultKey: 'J',  current: 'J',  description: 'vim-like' },
  { id: 'rev.prev',   group: 'Reviews', label: 'Previous review item', defaultKey: 'K',  current: 'K',  description: 'vim-like' },
  { id: 'rev.approve',group: 'Reviews', label: 'Approve current PR',    defaultKey: '⌘⇧↵', current: '⌘⇧↵', description: 'Holds modifier on purpose' },
  { id: 'rev.req',    group: 'Reviews', label: 'Request changes',       defaultKey: '⌘⇧R', current: '⌘⇧R', description: '' },

  // Investigate
  { id: 'inv.ask',    group: 'Investigate', label: 'Ask a new question',  defaultKey: '⌘⇧A', current: '⌘⇧A', description: '' },
  { id: 'inv.handoff',group: 'Investigate', label: 'Hand off investigation',defaultKey: '⌘⇧H', current: '⌘⇧H', description: '' },

  // Agents & fixes
  { id: 'ag.run',     group: 'Agents & Fixes', label: 'Run default agent',    defaultKey: '⌘⏎', current: '⌘⏎', description: '' },
  { id: 'ag.stop',    group: 'Agents & Fixes', label: 'Stop running agent',   defaultKey: '⌘.', current: '⌘.', description: '' },

  // AI
  { id: 'ai.suggest', group: 'AI', label: 'Trigger inline suggestion', defaultKey: '⌘.', current: 'Alt+\\', description: 'Ghost text in editor' },
  { id: 'ai.accept',  group: 'AI', label: 'Accept suggestion',         defaultKey: 'Tab', current: 'Tab', description: '' },
  { id: 'ai.dismiss', group: 'AI', label: 'Dismiss suggestion',        defaultKey: 'Esc', current: 'Esc', description: '' },
];
