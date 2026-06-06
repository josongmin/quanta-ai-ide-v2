export type Category =
  | 'all' | 'chat' | 'ticketing' | 'observability' | 'identity'
  | 'devtools' | 'analytics' | 'ai';

export type Integration = {
  slug: string;
  name: string;
  vendor: string;
  category: Exclude<Category, 'all'>;
  blurb: string;
  installs: number;
  rating: number;
  verified: boolean;
  featured?: boolean;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  tone: { from: string; to: string };
};
