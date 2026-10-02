import { useCallback, useEffect, useRef, useState } from 'react';

export interface SpeechSynthesisState {
  supported: boolean;
  speaking: boolean;
  paused: boolean;
}

export interface SpeechSynthesisHandle {
  state: SpeechSynthesisState;
  speak: (text: string) => void;
  pause: () => void;
  resume: () => void;
  cancel: () => void;
}

function resolveVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  return window.speechSynthesis.getVoices();
}

function pickVoice(text: string, voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  if (voices.length === 0) return undefined;
  const preferred = /[\u0600-\u06FF\u0750-\u077F]/.test(text) ? 'ar' : 'fr';
  const langPrefix = preferred === 'ar' ? 'ar' : 'fr';

  const match = voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix));
  if (match) return match;

  const anyFrench = voices.find((v) => v.lang.toLowerCase().startsWith('fr'));
  if (anyFrench) return anyFrench;

  return undefined;
}

/**
 * Encapsulates browser SpeechSynthesis. Guarantees at most one utterance is
 * active at a time and exposes pause/resume/cancel controls.
 */
export function useSpeechSynthesis(): SpeechSynthesisHandle {
  const supported =
    typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

  const [state, setState] = useState<SpeechSynthesisState>({
    supported,
    speaking: false,
    paused: false,
  });

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>(resolveVoices());

  useEffect(() => {
    if (!supported) return;
    const load = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    load();
    window.speechSynthesis.addEventListener?.('voiceschanged', load);
    return () => {
      window.speechSynthesis.removeEventListener?.('voiceschanged', load);
      window.speechSynthesis.cancel();
      utteranceRef.current = null;
    };
  }, [supported]);

  const cancel = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setState((s) => ({ ...s, speaking: false, paused: false }));
  }, [supported]);

  const speak = useCallback(
    (text: string) => {
      if (!supported) return;
      // Halt any current utterance before starting a new one.
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = pickVoice(text, voicesRef.current)?.lang ?? 'fr-FR';
      const voice = pickVoice(text, voicesRef.current);
      if (voice) utterance.voice = voice;
      utterance.rate = 1;
      utterance.pitch = 1;

      utterance.onstart = () => setState((s) => ({ ...s, speaking: true, paused: false }));
      utterance.onend = () => {
        utteranceRef.current = null;
        setState((s) => ({ ...s, speaking: false, paused: false }));
      };
      utterance.onerror = () => {
        utteranceRef.current = null;
        setState((s) => ({ ...s, speaking: false, paused: false }));
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [supported]
  );

  const pause = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.pause();
    setState((s) => ({ ...s, paused: true }));
  }, [supported]);

  const resume = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.resume();
    setState((s) => ({ ...s, paused: false }));
  }, [supported]);

  return { state, speak, pause, resume, cancel };
}
