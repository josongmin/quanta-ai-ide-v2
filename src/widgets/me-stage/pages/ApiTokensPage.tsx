import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('me');
  const [tokens, setTokens] = useState<Token[]>(INITIAL_TOKENS);
  const [creating, setCreating] = useState(false);
  const [revealed, setRevealed] = useState<Token | null>(null);
  const [removing, setRemoving] = useState<Token | null>(null);

  return (
    <MeShell
      title={t('apiTokens.title')}
      subtitle={t('apiTokens.subtitle')}
      topRight={
        <Button variant="primary" size="md" leading={<Plus className="w-3.5 h-3.5" />} onClick={() => { setCreating(true); }}>
          {t('apiTokens.newToken')}
        </Button>
      }
    >
      <Section
        title={t('apiTokens.active.title')}
        hint={t('apiTokens.active.hint', { count: tokens.length })}
      >
        <TokenList
          tokens={tokens}
          onRemove={(tok) => { setRemoving(tok); }}
        />
      </Section>

      <Section
        title={t('apiTokens.using.title')}
        hint={t('apiTokens.using.hint')}
      >
        <CodeSamples />
      </Section>

      {creating && (
        <CreateModal
          onClose={() => { setCreating(false); }}
          onCreate={(tok) => {
            setTokens((all) => [tok, ...all]);
            setCreating(false);
            setRevealed(tok);
          }}
        />
      )}
      {revealed && <RevealModal token={revealed} onClose={() => { setRevealed(null); }} />}
      {removing && (
        <RevokeModal
          token={removing}
          onClose={() => { setRemoving(null); }}
          onConfirm={() => {
            setTokens((all) => all.filter((tok) => tok.id !== removing.id));
            setRemoving(null);
          }}
        />
      )}
    </MeShell>
  );
}
