import { useRef, useState } from 'react';
import { Apple, Terminal, Copy, Check, ArrowUpRight } from 'lucide-react';
import { useHoverStyle } from '@shared/lib';
import { GithubIcon } from '@shared/ui/brand-icons';
import { DeveloperShell } from '../parts/DeveloperShell';

type OS = 'mac' | 'linux' | 'windows';

const INSTALL: Record<OS, { label: string; cmd: string; sub: string }> = {
  mac:     { label: 'macOS',   cmd: 'brew install acme/tap/se',                        sub: 'Homebrew · Apple Silicon + Intel' },
  linux:   { label: 'Linux',   cmd: 'curl -fsSL https://get.acme.dev/cli | sh',        sub: 'amd64 · arm64 · Alpine' },
  windows: { label: 'Windows', cmd: 'scoop install acme/se',                            sub: 'Scoop · also: choco install se' },
};

const COMMANDS = [
  { cmd: 'se auth login',                  blurb: 'OAuth device-code flow. Pairs your CLI with your account.' },
  { cmd: 'se ws ls',                       blurb: 'List workspaces in the current org.' },
  { cmd: 'se ws use <name>',               blurb: 'Pick a default workspace for subsequent commands.' },
  { cmd: 'se admission test <file>',       blurb: 'Dry-run admission rules against a file or diff.' },
  { cmd: 'se agent run <slug> --watch',    blurb: 'Start an agent and tail its activity log.' },
  { cmd: 'se webhook tail',                blurb: 'Stream webhook deliveries to your terminal.' },
  { cmd: 'se logs --since 1h',             blurb: 'Pull recent logs across services.' },
];

export default function CliPage() {
  const [os, setOs] = useState<OS>('mac');
  return (
    <DeveloperShell
      title="CLI"
      subtitle="One binary, every platform. CI-friendly: structured JSON output with --json, exit codes that mean something."
      topRight={
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full text-[10px] font-semibold"
            style={{
              background: 'var(--intent-success-bg)',
              color: 'var(--intent-success-fg)',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--intent-success-fg)' }} />
            v3.14.0 stable
          </span>
          <a
            href="https://github.com/acme/se-cli"
            className="inline-flex items-center gap-1.5 h-7 px-3 rounded-md text-[11px] font-semibold transition-colors"
            style={{
              background: 'var(--bg-surface-muted)',
              border: '1px solid var(--border-default)',
              color: 'var(--fg-strong)',
            }}
          >
            <GithubIcon className="w-3.5 h-3.5" />
            Source
            <ArrowUpRight className="w-3 h-3 opacity-60" />
          </a>
        </div>
      }
    >
      {/* OS tabs */}
      <div
        className="rounded-xl overflow-hidden mb-8"
        style={{
          background: 'var(--bg-canvas)',
          border: '1px solid var(--border-default)',
        }}
      >
        <div className="flex" style={{ borderBottom: '1px solid var(--border-muted)' }}>
          {(['mac', 'linux', 'windows'] as OS[]).map((id) => {
            const active = id === os;
            const Icon = id === 'mac' ? Apple : Terminal;
            return (
              <button
                key={id}
                type="button"
                onClick={() => { setOs(id); }}
                className="flex-1 inline-flex items-center justify-center gap-2 h-12 text-[12px] font-semibold transition-colors relative"
                style={{
                  color: active ? 'var(--fg-strong)' : 'var(--fg-muted)',
                  background: active ? 'var(--bg-surface-muted)' : 'transparent',
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
              >
                <Icon className="w-3.5 h-3.5" />
                {INSTALL[id].label}
                {active && (
                  <span
                    aria-hidden
                    className="absolute left-0 right-0 -bottom-px h-px"
                    style={{ background: 'var(--fg-accent)' }}
                  />
                )}
              </button>
            );
          })}
        </div>
        <div className="p-6">
          <span className="text-[11px]" style={{ color: 'var(--fg-subtle)' }}>{INSTALL[os].sub}</span>
          <InstallCommand cmd={INSTALL[os].cmd} />
          <div className="mt-4 text-[11px]" style={{ color: 'var(--fg-muted)' }}>
            Then authenticate: <code
              className="font-mono px-1.5 py-0.5 rounded ml-1"
              style={{ background: 'var(--bg-surface-muted)', color: 'var(--fg-strong)' }}
            >se auth login</code>
          </div>
        </div>
      </div>

      {/* Common commands */}
      <h2 className="text-[12px] font-semibold tracking-tight mb-3" style={{ color: 'var(--fg-strong)' }}>
        Common commands
      </h2>
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: 'var(--bg-canvas)',
          border: '1px solid var(--border-default)',
        }}
      >
        {COMMANDS.map((c, i) => (
          <CommandRow key={c.cmd} cmd={c.cmd} blurb={c.blurb} isLast={i === COMMANDS.length - 1} />
        ))}
      </div>
    </DeveloperShell>
  );
}

function CommandRow({ cmd, blurb, isLast }: { cmd: string; blurb: string; isLast: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useHoverStyle(ref, { background: 'var(--bg-hover)' }, { background: 'transparent' });
  return (
    <div
      ref={ref}
      className="flex items-center gap-4 p-4 transition-colors"
      style={{
        borderBottom: isLast ? 'none' : '1px solid var(--border-muted)',
      }}
    >
      <code
        className="text-[12px] font-mono shrink-0 px-2 py-1 rounded"
        style={{
          background: 'var(--bg-surface-muted)',
          color: 'var(--fg-strong)',
          minWidth: 280,
        }}
      >
        <span style={{ color: 'var(--fg-subtle)' }}>$ </span>
        {cmd}
      </code>
      <span className="text-[12px] flex-1" style={{ color: 'var(--fg-muted)' }}>{blurb}</span>
    </div>
  );
}

function InstallCommand({ cmd }: { cmd: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div
      className="flex items-center mt-3 rounded-lg overflow-hidden"
      style={{
        background: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-default)',
      }}
    >
      <code
        className="flex-1 p-4 text-[13.5px] font-mono"
        style={{ color: 'var(--fg-strong)' }}
      >
        <span style={{ color: 'var(--fg-subtle)' }}>$ </span>
        {cmd}
      </code>
      <button
        type="button"
        onClick={() => {
          if (typeof navigator !== 'undefined' && navigator.clipboard) {
            void navigator.clipboard.writeText(cmd);
            setCopied(true);
            window.setTimeout(() => { setCopied(false); }, 1200);
          }
        }}
        className="inline-flex items-center gap-1 h-9 px-3 mr-2 rounded-md text-[11px] font-semibold transition-colors"
        style={{ color: 'var(--fg-muted)' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
