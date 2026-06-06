import { useState } from 'react';
import { Plus } from 'lucide-react';
import { MeShell } from '../parts/MeShell';
import { Section, Button } from '@shared/ui/forms';
import { INITIAL_TOKENS, type Token } from './parts/api-tokens/types';
import { TokenList } from './parts/api-tokens/TokenList';
import { CreateModal } from './parts/api-tokens/CreateModal';
import { RevealModal } from './parts/api-tokens/RevealModal';
import { CodeSamples } from './parts/api-tokens/CodeSamples';
import { RevokeModal } from './parts/api-tokens/RevokeModal';

export default function ApiTokensPage() {
  const [tokens, setTokens] = useState<Token[]>(INITIAL_TOKENS);
  const [creating, setCreating] = useState(false);
  const [revealed, setRevealed] = useState<Token | null>(null);
  const [removing, setRemoving] = useState<Token | null>(null);

  return (
    <MeShell
      title="API tokens"
      subtitle="Personal access tokens (PATs) authenticate scripts, CLIs, and integrations as you. Treat them like passwords."
      topRight={
        <Button variant="primary" size="md" leading={<Plus className="w-3.5 h-3.5" />} onClick={() => { setCreating(true); }}>
          New token
        </Button>
      }
    >
      <Section
        title="Active tokens"
        hint={`${tokens.length} of 25 tokens used. Tokens you haven't used in 90 days are flagged.`}
      >
        <TokenList
          tokens={tokens}
          onRemove={(t) => { setRemoving(t); }}
        />
      </Section>

      <Section
        title="Using your tokens"
        hint="Pass the token as a Bearer header. We log every request — see Audit log for details."
      >
        <CodeSamples />
      </Section>

      {creating && (
        <CreateModal
          onClose={() => { setCreating(false); }}
          onCreate={(t) => {
            setTokens((all) => [t, ...all]);
            setCreating(false);
            setRevealed(t);
          }}
        />
      )}
      {revealed && <RevealModal token={revealed} onClose={() => { setRevealed(null); }} />}
      {removing && (
        <RevokeModal
          token={removing}
          onClose={() => { setRemoving(null); }}
          onConfirm={() => {
            setTokens((all) => all.filter((t) => t.id !== removing.id));
            setRemoving(null);
          }}
        />
      )}
    </MeShell>
  );
}
