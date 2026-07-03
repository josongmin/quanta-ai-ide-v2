import { useEffect, useRef, useState } from 'react';
import { Mic } from 'lucide-react';
import { useCodingStage } from '../../model/CodingStageContext';

// Extracted verbatim from Composer.tsx — byte-for-byte. A separate
// filename (not the pre-existing orphan composer/VoiceBtn.tsx, which uses
// a different visual treatment) so Composer's rendered output is
// unchanged.

// Web Speech API typings — the spec is shipped under `webkitSpeechRecognition`
// in Chromium-based browsers and `SpeechRecognition` in Safari/Firefox.
// We type just the surface we touch; full lib.dom typings vary by version.
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: unknown) => void) | null;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  // `window` doesn't declare these non-standard / vendor-prefixed globals;
  // both are optional so a direct cast (no `unknown` bridge) is sound.
  const w = window as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// Voice input button. Uses the Web Speech API when available; otherwise
// renders disabled with an "unsupported" tooltip. While listening the
// mic icon pulses with the breath animation; final transcripts are
// pushed up via `onTranscript` so the parent can append to the draft.
export function VoiceBtn({
  onTranscript, onInterim,
}: {
  onTranscript: (text: string) => void;
  // Called with in-flight (non-final) transcript so the composer can
  // ghost-render it. The empty string signals "clear ghost" — fired on
  // recognition end so the ghost doesn't linger after the mic stops.
  onInterim?: (text: string) => void;
}) {
  const { t } = useCodingStage();
  const [supported] = useState(() => getSpeechRecognitionCtor() != null);
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const cbRef = useRef(onTranscript);
  const interimRef = useRef(onInterim);
  useEffect(() => { cbRef.current = onTranscript; }, [onTranscript]);
  useEffect(() => { interimRef.current = onInterim; }, [onInterim]);

  useEffect(() => () => {
    try { recRef.current?.abort(); } catch { /* fine */ }
  }, []);

  function start() {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    // Continuous + interim — SOTA pattern (Whisper UI, Granola). Final
    // results commit to draft; interim renders as ghost text so the user
    // can correct mid-sentence without waiting for the pause.
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = (typeof document !== 'undefined' ? document.documentElement.lang : '') || 'en-US';
    rec.onresult = (e) => {
      let finalText = '';
      let interimText = '';
      for (const r of Array.from(e.results)) {
        if (r.isFinal) finalText += r[0].transcript;
        else interimText += r[0].transcript;
      }
      if (finalText.trim()) cbRef.current(finalText.trim());
      // Always push interim — even an empty string clears any ghost
      // left over after the user paused.
      interimRef.current?.(interimText);
    };
    rec.onend = () => {
      setListening(false);
      recRef.current = null;
      interimRef.current?.('');
    };
    rec.onerror = () => {
      setListening(false);
      recRef.current = null;
      interimRef.current?.('');
    };
    try {
      rec.start();
      recRef.current = rec;
      setListening(true);
    } catch {
      setListening(false);
    }
  }

  function stop() {
    try { recRef.current?.stop(); } catch { /* fine */ }
    setListening(false);
  }

  const idle = 'text-[color:var(--fg-subtle)] hover:text-[color:var(--fg-strong)] hover:bg-[color:var(--bg-hover)]';
  const off = 'text-[color:var(--fg-subtle)] opacity-50 cursor-not-allowed';
  const activeStyle: React.CSSProperties = {
    color: 'var(--intent-danger-fg)',
    background: 'color-mix(in srgb, var(--intent-danger-vivid) 15%, transparent)',
  };

  return (
    <button
      type="button"
      title={!supported ? t('voice.unsupported') : listening ? t('voice.stop') : t('voice.start')}
      aria-label={!supported ? t('voice.unsupported') : listening ? t('voice.stop') : t('voice.start')}
      aria-pressed={listening}
      aria-disabled={!supported}
      onClick={() => { if (!supported) return; if (listening) stop(); else start(); }}
      tabIndex={supported ? 0 : -1}
      style={supported && listening ? activeStyle : undefined}
      className={`p-1.5 rounded-md transition-colors ${supported ? (listening ? '' : idle) : off}`}
    >
      <Mic className={`w-3.5 h-3.5 ${listening ? 'coding-breath' : ''}`} />
    </button>
  );
}
