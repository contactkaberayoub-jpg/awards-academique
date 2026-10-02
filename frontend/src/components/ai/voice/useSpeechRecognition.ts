import { useCallback, useEffect, useRef, useState } from 'react';

/** Minimal typing for the (non-standard) Web Speech Recognition API. */
type SpeechRecognitionEventLike = Event & {
  results?: ArrayLike<ArrayLike<{ transcript: string }>>;
  resultIndex?: number;
};

export interface SpeechRecognitionState {
  supported: boolean;
  listening: boolean;
  transcript: string;
  /** Exact, user-facing error copy (already localized to French). */
  error: string | null;
}

interface SpeechRecognitionHandle {
  state: SpeechRecognitionState;
  start: () => void;
  stop: () => void;
}

const NOT_SUPPORTED_MESSAGE =
  "Votre navigateur ne prend pas en charge la reconnaissance vocale. Utilisez Chrome ou Edge, ou passez au mode texte.";
const PERMISSION_DENIED_MESSAGE =
  "Autorisation du microphone refusée. Veuillez autoriser l'accès au microphone dans votre navigateur.";

function resolveRecognitionCtor(): (new () => RecognitionInstance) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => RecognitionInstance;
    webkitSpeechRecognition?: new () => RecognitionInstance;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

interface RecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
}

/**
 * Encapsulates a single browser SpeechRecognition session (fr-FR).
 * Only one session may be active at a time — the hook aborts any existing
 * active session before starting a new one.
 */
export function useSpeechRecognition(): SpeechRecognitionHandle {
  const Ctor = resolveRecognitionCtor();
  const supported = Ctor !== null;

  const [state, setState] = useState<SpeechRecognitionState>({
    supported,
    listening: false,
    transcript: '',
    error: null,
  });

  const recognitionRef = useRef<RecognitionInstance | null>(null);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  const start = useCallback(() => {
    if (!Ctor) {
      setState((s) => ({ ...s, error: NOT_SUPPORTED_MESSAGE }));
      return;
    }

    // Abort any prior/active session before starting a new one.
    recognitionRef.current?.abort();

    const recognition = new Ctor() as RecognitionInstance;
    recognition.lang = 'fr-FR';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let transcript = '';
      const results = event.results;
      if (results) {
        for (let i = 0; i < results.length; i++) {
          const alt = results[i]?.[0];
          if (alt) transcript += alt.transcript;
        }
      }
      setState((s) => ({ ...s, transcript }));
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setState((s) => ({ ...s, listening: false, error: PERMISSION_DENIED_MESSAGE }));
      } else if (event.error === 'no-speech') {
        setState((s) => ({ ...s, listening: false }));
      } else {
        setState((s) => ({ ...s, listening: false, error: NOT_SUPPORTED_MESSAGE }));
      }
    };

    recognition.onend = () => {
      setState((s) => ({ ...s, listening: false }));
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setState((s) => ({ ...s, listening: true, transcript: '', error: null }));
    } catch {
      setState((s) => ({ ...s, listening: false, error: NOT_SUPPORTED_MESSAGE }));
    }
  }, [Ctor]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setState((s) => ({ ...s, listening: false }));
  }, []);

  return { state, start, stop };
}
