import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AudioLines, ChevronLeft, MessageSquareText, Mic, Pause, Play, Square, Volume2, VolumeX } from 'lucide-react';
import { tutorApi } from '@/api/tutor';
import type { LessonResponse } from '@/api/lessonService';
import { getApiErrorMessage } from '@/lib/apiError';
import { Button } from '@/components/ui/Button';
import { useSpeechRecognition } from './voice/useSpeechRecognition';
import { useSpeechSynthesis } from './voice/useSpeechSynthesis';

type VoiceMode = 'idle' | 'listening' | 'processing' | 'speaking' | 'paused' | 'error';

const STATUS_LABELS: Record<VoiceMode, string> = {
  idle: "Cliquez sur le micro pour poser votre question à voix haute.",
  listening: 'Je vous écoute...',
  processing: 'Réflexion...',
  speaking: 'Réponse en cours...',
  paused: 'Lecture en pause.',
  error: '',
};

const MIC_NOT_SUPPORTED_MESSAGE =
  "Votre navigateur ne prend pas en charge la reconnaissance vocale. Utilisez Chrome ou Edge, ou passez au mode texte.";

interface VoiceTutorProps {
  courseId: string;
  lesson: LessonResponse;
  onBackToText: () => void;
}

/**
 * Voice Mode for the AI tutor. Flow: Micro → SpeechRecognition (texte) →
 * existing AI Tutor endpoint → SpeechSynthesis.
 *
 * Mandatory state machine: idle → listening → processing → speaking → idle,
 * with `paused` and `error` handled explicitly. At most one SpeechRecognition
 * session and one SpeechSynthesisUtterance are active at a time. A new user
 * question immediately stops both ongoing audio streams before re-listening.
 */
export function VoiceTutor({ courseId, lesson, onBackToText }: VoiceTutorProps) {
  const [mode, setMode] = useState<VoiceMode>('idle');
  const [error, setError] = useState<string | null>(null);

  const rec = useSpeechRecognition();
  const tts = useSpeechSynthesis();

  const modeRef = useRef<VoiceMode>('idle');
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // Stop all audio when leaving the component.
  useEffect(() => {
    return () => {
      rec.stop();
      tts.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendToTutor = useCallback(
    async (text: string) => {
      try {
        const res = await tutorApi.chat({ courseId, lessonId: lesson.id, message: text });
        return res.data.message;
      } catch (e: unknown) {
        const axiosErr = e as { response?: { status?: number } };
        const status = axiosErr.response?.status;
        if (status === 401 || status === 403) {
          throw new Error("Vous n'êtes pas autorisé à accéder au tuteur IA.");
        }
        throw new Error(getApiErrorMessage(e, 'Le tuteur IA est temporairement indisponible. Veuillez réessayer.'));
      }
    },
    [courseId, lesson.id]
  );

  const handleUserSpeech = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      // Stop any ongoing synthesis + recognition before processing a new question.
      tts.cancel();
      rec.stop();
      setError(null);
      setMode('processing');

      try {
        const reply = await sendToTutor(trimmed);
        setMode('speaking');
        tts.speak(reply);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Une erreur est survenue.';
        setError(message);
        setMode('error');
      }
    },
    [rec, tts, sendToTutor]
  );

  // Keep the latest handler in a ref so the submit effect below never depends
  // on render-varying identities (which would cause an update loop).
  const handleUserSpeechRef = useRef(handleUserSpeech);
  useEffect(() => {
    handleUserSpeechRef.current = handleUserSpeech;
  });

  // When recognition finishes (speech detected then silence), submit the
  // transcript. Dependencies are the primitive transcript/listening values
  // only, so this effect does not re-run on every render.
  useEffect(() => {
    if (!rec.state.listening && rec.state.transcript.trim()) {
      if (modeRef.current === 'listening') {
        void handleUserSpeechRef.current(rec.state.transcript);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec.state.listening, rec.state.transcript]);

  const startListening = useCallback(() => {
    if (!rec.state.supported && !tts.state.supported) {
      setError(MIC_NOT_SUPPORTED_MESSAGE);
      setMode('error');
      return;
    }
    // New question: stop current audio streams first.
    tts.cancel();
    setError(null);
    setMode('listening');
    rec.start();
  }, [rec, tts]);

  const stopListening = useCallback(() => {
    rec.stop();
    if (rec.state.transcript.trim()) {
      void handleUserSpeech(rec.state.transcript);
    } else {
      setMode('idle');
    }
  }, [rec, handleUserSpeech]);

  const pauseSpeaking = useCallback(() => {
    tts.pause();
    setMode('paused');
  }, [tts]);

  const resumeSpeaking = useCallback(() => {
    tts.resume();
    setMode('speaking');
  }, [tts]);

  const stopSpeaking = useCallback(() => {
    tts.cancel();
    setMode('idle');
    setError(null);
  }, [tts]);

  const goIdle = useCallback(() => {
    rec.stop();
    tts.cancel();
    setError(null);
    setMode('idle');
  }, [rec, tts]);

  const showListeningPulse = mode === 'listening';
  const showActivityBars = mode === 'processing' || mode === 'speaking';

  const statusText =
    mode === 'error' ? error ?? STATUS_LABELS.error : STATUS_LABELS[mode];

  return (
    <div
      role="region"
      aria-label="Mode vocal du tuteur IA"
      className="flex h-full flex-col"
    >
      {/* Header */}
      <div className="flex h-16 items-center gap-3 border-b border-border bg-surface-secondary/60 px-4">
        <button
          onClick={onBackToText}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-text-muted transition-colors hover:bg-surface hover:text-text-primary"
          aria-label="Retour au mode texte"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Mode texte
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text-primary">Tuteur IA vocal</p>
          <p className="truncate text-xs text-text-muted">{lesson.title}</p>
        </div>
        <MessageSquareText
          className="h-5 w-5 text-text-muted"
          aria-hidden="true"
        />
      </div>

      {/* Status / visualizer */}
      <div className="relative flex flex-1 flex-col items-center justify-center gap-6 px-6 py-6">
        {/* Micro button */}
        <button
          onClick={() => {
            if (mode === 'listening') {
              stopListening();
            } else if (mode === 'speaking') {
              stopSpeaking();
            } else if (mode === 'paused') {
              resumeSpeaking();
            } else if (mode === 'error' || mode === 'processing') {
              goIdle();
            } else {
              startListening();
            }
          }}
          className={`relative inline-flex h-24 w-24 items-center justify-center rounded-full transition-all duration-fast focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
            mode === 'listening'
              ? 'bg-error text-error-foreground'
              : mode === 'processing'
                ? 'bg-surface-secondary text-text-muted'
                : mode === 'speaking' || mode === 'paused'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-primary text-primary-foreground hover:bg-primary-hover'
          }`}
          aria-label={
            mode === 'listening'
              ? 'Arrêter l’écoute'
              : mode === 'speaking'
                ? 'Arrêter la lecture'
                : mode === 'paused'
                  ? 'Reprendre la lecture'
                  : mode === 'error' || mode === 'processing'
                    ? 'Réinitialiser'
                    : 'Commencer l’écoute vocale'
          }
          aria-pressed={mode === 'listening'}
          disabled={mode === 'processing'}
        >
          {showActivityBars ? (
            <AudioLines className="h-10 w-10" aria-hidden="true" />
          ) : showListeningPulse ? (
            <span className="flex h-10 w-10 items-center justify-center">
              <span className="relative flex h-6 w-6">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/40" />
                <span className="relative inline-flex h-6 w-6 rounded-full bg-white" />
              </span>
            </span>
          ) : (
            <Mic className="h-10 w-10" aria-hidden="true" />
          )}
        </button>

        {/* Animated bars (processing / speaking) */}
        {showActivityBars && (
          <div className="flex items-end gap-1.5" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.span
                key={i}
                className="w-1.5 rounded-full bg-primary"
                animate={{ height: ['0.6rem', '1.6rem', '0.6rem'] }}
                transition={{
                  duration: 0.9,
                  repeat: Infinity,
                  delay: i * 0.12,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>
        )}

        {/* Status text (readable by screen readers) */}
        <motion.p
          key={mode + (statusText ?? '')}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="min-h-[1.5rem] text-center text-sm font-medium text-text-secondary"
          role="status"
          aria-live="polite"
        >
          {statusText}
        </motion.p>

        {/* Error detail (only in error mode) */}
        {mode === 'error' && error && (
          <p className="max-w-xs text-center text-xs text-error" role="alert">
            {error}
          </p>
        )}
      </div>

      {/* Transcript readback for confirmation */}
      {rec.state.transcript.trim() && mode === 'listening' && (
        <div className="mx-4 mb-2 max-h-16 overflow-y-auto rounded-md bg-surface-secondary/70 px-3 py-2 text-xs italic text-text-secondary">
          {rec.state.transcript}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-center gap-2 border-t border-border p-3">
        {mode === 'idle' && (
          <Button onClick={startListening} variant="primary" size="md">
            <Mic className="h-4 w-4" aria-hidden="true" />
            Start
          </Button>
        )}
        {mode === 'listening' && (
          <Button onClick={stopListening} variant="danger" size="md">
            <Square className="h-4 w-4" aria-hidden="true" />
            Stop listening
          </Button>
        )}
        {(mode === 'speaking' || mode === 'paused') && (
          <>
            <Button onClick={mode === 'paused' ? resumeSpeaking : pauseSpeaking} variant="secondary" size="md">
              {mode === 'paused' ? (
                <Play className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Pause className="h-4 w-4" aria-hidden="true" />
              )}
              {mode === 'paused' ? 'Resume' : 'Pause'}
            </Button>
            <Button onClick={stopSpeaking} variant="danger" size="md">
              <VolumeX className="h-4 w-4" aria-hidden="true" />
              Stop audio
            </Button>
          </>
        )}
        {(mode === 'processing' || mode === 'error') && (
          <Button onClick={goIdle} variant="outline" size="md">
            Réinitialiser
          </Button>
        )}
        {mode !== 'idle' && mode !== 'listening' && (
          <Button onClick={() => { rec.stop(); tts.cancel(); setMode('idle'); }} variant="ghost" size="sm">
            <Volume2 className="h-4 w-4" aria-hidden="true" />
            Annuler
          </Button>
        )}
      </div>
    </div>
  );
}
