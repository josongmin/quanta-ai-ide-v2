import { useCallback, useState } from 'react';

// Voice input glue. The VoiceBtn owns the SpeechRecognition lifecycle;
// this hook owns the composer-side state: the live interim transcript
// (rendered as ghost text overlaid on the textarea) and the handler that
// appends a finalised transcript to the draft.
export function useVoiceInput(draft: string, onChange: (v: string) => void) {
  // Live voice transcript that hasn't yet been committed to the draft.
  // Rendered as ghost text overlaid on the textarea; cleared when speech
  // ends or the recogniser commits a final result.
  const [voiceInterim, setVoiceInterim] = useState('');

  const onTranscript = useCallback((text: string) => {
    // Append to whatever is in the draft, separated by a
    // space so users can dictate alongside typed prefixes.
    const sep = draft.length > 0 && !/\s$/.test(draft) ? ' ' : '';
    onChange(draft + sep + text);
  }, [draft, onChange]);

  return { voiceInterim, setVoiceInterim, onTranscript };
}
