// Shared types + tone helpers for the Changelog page parts.

import { Sparkles, Wrench, Bug } from 'lucide-react';

export type Category = 'New' | 'Improved' | 'Fixed';

export const CATEGORY_ICONS = {
  New: Sparkles,
  Improved: Wrench,
  Fixed: Bug,
} as const;

export type Entry = {
  id: string;
  date: string;          // ISO YYYY-MM-DD
  version: string;
  category: Category;
  title: string;
  bullets: string[];
  highlight?: boolean;   // bigger headline rendering
};

export function toneFor(c: Category): { fg: string; bg: string } {
  if (c === 'New')      return { fg: 'var(--intent-success-fg)', bg: 'var(--intent-success-bg)' };
  if (c === 'Improved') return { fg: 'var(--intent-info-fg)',    bg: 'var(--intent-info-bg)'    };
  return                       { fg: 'var(--intent-warn-fg)',    bg: 'var(--intent-warn-bg)'    };
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(m, 10) - 1]} ${parseInt(d, 10)}, ${y}`;
}
