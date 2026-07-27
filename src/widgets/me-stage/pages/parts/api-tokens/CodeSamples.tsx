import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Terminal, ExternalLink } from 'lucide-react';

export function CodeSamples() {
  const { t } = useTranslation('me');
  const [tab, setTab] = useState<'curl' | 'js' | 'python'>('curl');

  const sample =
    tab === 'curl' ? `curl https://api.se-field.app/v1/me \\
  -H "Authorization: Bearer sef_xxx_yourtoken"`
    : tab === 'js' ? `import { SeField } from "@se-field/sdk";

const client = new SeField({ token: process.env.SEFIELD_TOKEN });
const me = await client.me();`
    : `from sefield import Client

client = Client(token=os.environ["SEFIELD_TOKEN"])
me = client.me()`;

  return (
    <div
      className="rounded-md overflow-hidden"
      style={{ border: '1px solid var(--border-default)' }}
    >
      <div
        className="flex items-center gap-1 px-2.5 py-1.5"
        style={{ background: 'var(--bg-surface-muted)', borderBottom: '1px solid var(--border-muted)' }}
      >
        <Terminal className="w-3 h-3" style={{ color: 'var(--fg-muted)' }} />
        {(['curl', 'js', 'python'] as const).map((id) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => { setTab(id); }}
              className="h-6 px-2 rounded text-xs font-medium font-mono"
              style={{
                background: active ? 'var(--bg-canvas)' : 'transparent',
                color: active ? 'var(--fg-strong)' : 'var(--fg-muted)',
                boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              {id === 'js' ? 'TypeScript' : id === 'curl' ? 'cURL' : 'Python'}
            </button>
          );
        })}
        <span className="flex-1" />
        <button type="button" className="text-xs inline-flex items-center gap-1 bg-transparent border-0 p-0 cursor-pointer" style={{ color: 'var(--fg-link)', font: 'inherit' }}>
          {t('apiTokens.code.docs')} <ExternalLink className="w-2.5 h-2.5" />
        </button>
      </div>
      <pre
        className="p-3 text-sm font-mono overflow-x-auto"
        style={{ background: 'var(--bg-canvas)', color: 'var(--fg-default)' }}
      >
        <code>{sample}</code>
      </pre>
    </div>
  );
}
