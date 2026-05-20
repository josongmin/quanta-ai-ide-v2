import { useState } from 'react';
import { Package, ExternalLink, Copy, Check, Star, Download } from 'lucide-react';
import { DeveloperShell } from '../parts/DeveloperShell';

type SDK = {
  id: string;
  lang: string;
  pkg: string;
  install: string;
  version: string;
  stars: string;
  downloads: string;
  example: string;
  tone: { from: string; to: string };
};

const SDKS: SDK[] = [
  {
    id: 'ts',
    lang: 'TypeScript',
    pkg: '@acme/sdk',
    install: 'pnpm add @acme/sdk',
    version: '2.4.1',
    stars: '1.2k',
    downloads: '420k/mo',
    tone: { from: 'var(--intent-info-fg)', to: 'var(--fg-accent)' },
    example: `import { Acme } from "@acme/sdk";\n\nconst acme = new Acme(process.env.ACME_TOKEN);\nconst workspaces = await acme.workspaces.list();\nfor await (const ws of workspaces) {\n  console.log(ws.id);\n}`,
  },
  {
    id: 'go',
    lang: 'Go',
    pkg: 'github.com/acme/se-go',
    install: 'go get github.com/acme/se-go',
    version: '1.18.0',
    stars: '480',
    downloads: '32k/mo',
    tone: { from: 'var(--intent-info-fg)', to: 'var(--intent-info-fg)' },
    example: `package main\n\nimport "github.com/acme/se-go"\n\nfunc main() {\n  c := acme.NewClient(os.Getenv("ACME_TOKEN"))\n  ws, _ := c.Workspaces.List(ctx, nil)\n}`,
  },
  {
    id: 'py',
    lang: 'Python',
    pkg: 'acme-sdk',
    install: 'pip install acme-sdk',
    version: '3.0.7',
    stars: '720',
    downloads: '120k/mo',
    tone: { from: 'var(--intent-warn-fg)', to: 'var(--intent-info-fg)' },
    example: `from acme import Acme\n\nacme = Acme(os.environ["ACME_TOKEN"])\nfor ws in acme.workspaces.list():\n    print(ws.id)`,
  },
  {
    id: 'ruby',
    lang: 'Ruby',
    pkg: 'acme-sdk',
    install: 'gem install acme-sdk',
    version: '1.6.2',
    stars: '180',
    downloads: '8k/mo',
    tone: { from: 'var(--intent-danger-fg)', to: 'var(--fg-accent)' },
    example: `require "acme"\n\nacme = Acme.new(ENV["ACME_TOKEN"])\nacme.workspaces.each { |ws| puts ws.id }`,
  },
];

export default function SdksPage() {
  return (
    <DeveloperShell
      title="SDKs"
      subtitle="Typed, idiomatic clients. Auto-pagination, retries, jittered backoff, and request signing baked in."
    >
      <div className="grid grid-cols-2 gap-4">
        {SDKS.map((s) => (
          <SdkCard key={s.id} sdk={s} />
        ))}
      </div>

      <div
        className="mt-10 rounded-xl p-5 flex items-start gap-4"
        style={{
          background: 'var(--bg-canvas)',
          border: '1px solid var(--border-default)',
        }}
      >
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: 'color-mix(in srgb, var(--fg-accent) 14%, transparent)',
            color: 'var(--fg-accent)',
          }}
        >
          <Package className="w-4 h-4" />
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="text-[12px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
            Don&apos;t see your language?
          </h3>
          <p className="text-[12px] leading-snug" style={{ color: 'var(--fg-muted)' }}>
            The REST API is generated from an OpenAPI spec — vote on the next SDK, or generate your own client.
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <a
            href="https://api.acme.dev/openapi.json"
            className="inline-flex items-center gap-1 h-7 px-3 rounded-md text-[11px] font-semibold transition-colors"
            style={{
              background: 'var(--bg-surface-muted)',
              border: '1px solid var(--border-default)',
              color: 'var(--fg-default)',
            }}
          >
            OpenAPI spec
            <ExternalLink className="w-3 h-3" />
          </a>
          <button
            type="button"
            className="inline-flex items-center gap-1 h-7 px-3 rounded-md text-[11px] font-semibold transition-colors"
            style={{ background: 'var(--fg-strong)', color: 'var(--bg-canvas)' }}
          >
            Request an SDK
          </button>
        </div>
      </div>
    </DeveloperShell>
  );
}

function SdkCard({ sdk }: { sdk: SDK }) {
  const [copied, setCopied] = useState(false);
  return (
    <div
      className="rounded-xl overflow-hidden flex flex-col"
      style={{
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-default)',
      }}
    >
      <div className="p-5 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-[12px] font-bold"
            style={{
              backgroundImage: `linear-gradient(135deg, ${sdk.tone.from}, ${sdk.tone.to})`,
              color: '#fff',
            }}
          >
            {sdk.lang.slice(0, 2)}
          </div>
          <div className="flex flex-col">
            <h3 className="text-[14px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
              {sdk.lang}
            </h3>
            <code className="text-[11px] font-mono" style={{ color: 'var(--fg-subtle)' }}>{sdk.pkg}</code>
          </div>
        </div>
        <span
          className="inline-flex items-center gap-1 px-2 h-5 rounded text-[10px] font-bold tabular-nums"
          style={{
            color: 'var(--intent-success-fg)',
            background: 'var(--intent-success-bg)',
          }}
        >
          v{sdk.version}
        </span>
      </div>

      <div className="px-5 pb-3 flex items-center gap-4 text-[11px]" style={{ color: 'var(--fg-muted)' }}>
        <span className="inline-flex items-center gap-1">
          <Star className="w-3 h-3" />
          <span className="tabular-nums">{sdk.stars}</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <Download className="w-3 h-3" />
          <span className="tabular-nums">{sdk.downloads}</span>
        </span>
      </div>

      <div
        className="mx-5 mb-3 flex items-center rounded-md overflow-hidden"
        style={{
          background: 'var(--bg-surface-muted)',
          border: '1px solid var(--border-default)',
        }}
      >
        <code className="flex-1 px-3 py-2 text-[11px] font-mono" style={{ color: 'var(--fg-strong)' }}>
          {sdk.install}
        </code>
        <button
          type="button"
          onClick={() => {
            if (typeof navigator !== 'undefined' && navigator.clipboard) {
              void navigator.clipboard.writeText(sdk.install);
              setCopied(true);
              window.setTimeout(() => { setCopied(false); }, 1200);
            }
          }}
          className="inline-flex items-center justify-center w-8 h-8 transition-colors"
          style={{ color: 'var(--fg-muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        </button>
      </div>

      <pre
        className="px-5 pb-5 m-0 text-[11px] font-mono overflow-x-auto"
        style={{ color: 'var(--fg-strong)' }}
      >
        {sdk.example}
      </pre>
    </div>
  );
}
