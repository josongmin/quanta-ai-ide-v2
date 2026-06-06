import {
  BookOpen, PlayCircle, KeyRound, Webhook, Terminal, Package,
} from 'lucide-react';

export type Card = {
  to: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  blurb: string;
  meta?: string;
};

export const PRIMARY: Card[] = [
  { to: '/developers/api',        icon: BookOpen,   title: 'API reference', blurb: 'REST & GraphQL surface, every endpoint with copy-as-curl.', meta: 'v2025-10 · stable' },
  { to: '/developers/playground', icon: PlayCircle, title: 'Playground',     blurb: 'Run authenticated requests against your live workspace.',     meta: 'Live · 18ms p50' },
  { to: '/developers/cli',        icon: Terminal,   title: 'CLI',            blurb: 'One binary. Pipelines, scripts, CI. Mac · Linux · Windows.',  meta: 'v3.14.0' },
];

export const SECONDARY: Card[] = [
  { to: '/developers/oauth-apps', icon: KeyRound, title: 'OAuth apps',     blurb: 'Register clients, manage scopes, rotate secrets.' },
  { to: '/developers/webhooks',   icon: Webhook,  title: 'Webhooks',       blurb: 'Subscribe to events. Inspect, retry, replay individual deliveries.' },
  { to: '/developers/sdks',       icon: Package,  title: 'SDKs',           blurb: 'TypeScript · Go · Python · Ruby. Typed clients, auto-pagination.' },
];

export const QUICKSTART = [
  { lang: 'curl',       code: `curl https://api.acme.dev/v1/workspaces \\\n  -H "Authorization: Bearer $ACME_TOKEN"` },
  { lang: 'TypeScript', code: `import { Acme } from "@acme/sdk";\nconst acme = new Acme(process.env.ACME_TOKEN);\nawait acme.workspaces.list();` },
  { lang: 'Go',         code: `client := acme.NewClient(os.Getenv("ACME_TOKEN"))\nws, _ := client.Workspaces.List(ctx, nil)` },
  { lang: 'Python',     code: `from acme import Acme\nacme = Acme(os.environ["ACME_TOKEN"])\nacme.workspaces.list()` },
];
