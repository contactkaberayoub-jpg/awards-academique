import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, Loader2, Mic, RefreshCw, Send, Sparkles, X } from 'lucide-react';
import { tutorApi, type TutorMessageRole } from '@/api/tutor';
import type { LessonResponse } from '@/api/lessonService';
import { getApiErrorMessage } from '@/lib/apiError';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { VoiceTutor } from '@/components/ai/VoiceTutor';

interface ChatMessage {
  role: TutorMessageRole;
  content: string;
}

interface AITutorPanelProps {
  courseId: string;
  lesson: LessonResponse;
  onClose: () => void;
}

const QUICK_PROMPTS = [
  'Explique-moi cette leçon',
  'Simplifie cette leçon pour moi',
  'Donne-moi un exemple concret',
  'Fais-moi un quiz sur cette leçon',
  'Fais-moi un résumé de cette leçon',
];

export function AITutorPanel({ courseId, lesson, onClose }: AITutorPanelProps) {
  const [voiceMode, setVoiceMode] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVoiceMode(false);
    setMessages([]);
    setError(null);
    setSending(false);
  }, [lesson.id]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, sending]);

  const handleSend = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || sending) return;

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    const optimistic: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(optimistic);
    setInput('');
    setSending(true);
    setError(null);

    try {
      const res = await tutorApi.chat({ courseId, lessonId: lesson.id, message: text, history });
      setMessages([...optimistic, { role: 'assistant', content: res.data.message }]);
    } catch (e: unknown) {
      setMessages(optimistic);
      const axiosErr = e as { response?: { status?: number } };
      const status = axiosErr.response?.status;
      if (status === 401 || status === 403) {
        setError("Vous n'êtes pas autorisé à accéder au tuteur IA.");
      } else if (status === 502) {
        setError(
          getApiErrorMessage(e, "Le tuteur IA est temporairement indisponible. Vérifiez que la clé API est configurée sur le serveur, puis réessayez.")
        );
      } else {
        setError(
          getApiErrorMessage(e, "Le tuteur IA est temporairement indisponible. Veuillez réessayer.")
        );
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.98 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="fixed bottom-6 right-6 z-50 flex h-[34rem] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
        role="dialog"
        aria-label="Tuteur IA"
      >
        {/* Header */}
        <div className="flex h-16 items-center gap-3 border-b border-border bg-surface-secondary/60 px-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Bot className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-text-primary">Tuteur IA</p>
            <p className="truncate text-xs text-text-muted">{lesson.title}</p>
          </div>
          {!voiceMode && (
            <button
              onClick={() => {
                setVoiceMode(true);
                setError(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-surface"
              aria-label="Passer en mode vocal"
            >
              <Mic className="h-4 w-4" aria-hidden="true" />
              Vocal
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-surface hover:text-text-primary"
            aria-label="Fermer le tuteur IA"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {voiceMode && (
          <VoiceTutor
            courseId={courseId}
            lesson={lesson}
            onBackToText={() => setVoiceMode(false)}
          />
        )}

        {!voiceMode && (
          <>
            {/* Messages */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-2 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-tint text-primary">
                <Sparkles className="h-6 w-6" aria-hidden="true" />
              </div>
              <p className="text-sm text-text-secondary">
                Posez une question sur cette leçon. Le tuteur peut expliquer, simplifier, donner
                des exemples ou tester vos connaissances.
              </p>
            </div>
          )}

          {messages.map((msg, index) => (
            <div
              key={`${msg.role}-${index}`}
              className={`flex gap-2 ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Bot className="h-4 w-4" aria-hidden="true" />
                </div>
              )}
              <div
                className={`max-w-[80%] whitespace-pre-wrap rounded-lg px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-surface-secondary text-text-primary'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Le tuteur réfléchit...
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-4 mb-2 flex items-center gap-2 rounded-md border border-error/20 bg-error/10 px-3 py-2 text-xs text-error">
            <span className="flex-1">{error}</span>
            <button
              onClick={() => handleSend()}
              className="inline-flex items-center gap-1 font-medium hover:underline"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Réessayer
            </button>
          </div>
        )}

        {/* Quick prompts */}
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-1.5 border-t border-border px-4 py-2">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleSend(prompt)}
                disabled={sending}
                className="rounded-full border border-border px-2.5 py-1 text-xs text-text-secondary transition-colors hover:border-primary hover:text-primary disabled:opacity-60"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="border-t border-border p-3">
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Écrivez votre question..."
              rows={2}
              maxLength={2000}
              disabled={sending}
              className="resize-none"
            />
            <Button
              onClick={() => handleSend()}
              disabled={!input.trim() || sending}
              size="md"
              aria-label="Envoyer"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}