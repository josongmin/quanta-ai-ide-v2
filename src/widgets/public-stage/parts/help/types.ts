// Shared types for the Help center page parts.

export type CategoryId =
  | 'getting-started' | 'admission' | 'agents'
  | 'workspaces' | 'billing' | 'troubleshooting';

export type Article = {
  id: string;
  title: string;
  category: CategoryId;
  readMin: number;
  views: number;
};

export type Category = {
  id: CategoryId;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  count: number;
  // 2-color gradient for the icon tile
  from: string;
  to: string;
};
