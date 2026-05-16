import { useEffect, useRef, useState } from 'react';
import { Mic } from 'lucide-react';

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
  const w = window as unknown as {
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
  isDark, t, onTranscript, onInterim,
}: {
  isDark: boolean;
  t: (k: string) => string;
  onTranscript: (text: string) => void;
  onInterim?: (text: string) => void;
}) {
  void isDark;
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

  const idle = 'text-[var(--fg-muted)] hover:text-[var(--fg-strong)] hover:[background:var(--bg-hover)]';
  const active = 'text-[var(--intent-danger-fg)] bg-[var(--intent-danger-bg)]';
  const off = 'text-[var(--fg-subtle)] cursor-not-allowed';

  return (
    <button
      type="button"
      title={!supported ? t('voice.unsupported') : listening ? t('voice.stop') : t('voice.start')}
      aria-label={!supported ? t('voice.unsupported') : listening ? t('voice.stop') : t('voice.start')}
      aria-pressed={listening}
      aria-disabled={!supported}
      onClick={() => { if (!supported) return; if (listening) stop(); else start(); }}
      tabIndex={supported ? 0 : -1}
      className={`p-1.5 rounded-md transition-colors ${supported ? (listening ? active : idle) : off}`}
    >
      <Mic className={`w-3.5 h-3.5 ${listening ? 'coding-breath' : ''}`} />
    </button>
  );
}
