import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, ClipboardList, RotateCcw, Send } from 'lucide-react';
import {
  quizAttemptApi,
  type StudentQuestion,
  type StudentQuizContent,
} from '@/api/quizAttempt';
import { getApiErrorMessage } from '@/lib/apiError';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';

interface LessonQuizGateProps {
  courseId: string;
  quizId: string;
  onGatePassed?: () => void;
}

/**
 * Mandatory lesson -> quiz gate. Rendered below the lesson content when the current lesson links
 * a PUBLISHED quiz. The next lesson stays locked until this quiz is passed. Students select
 * answers (the answer key is never exposed) and submit; a passing score unlocks the next lesson.
 */
export function LessonQuizGate({ courseId, quizId, onGatePassed }: LessonQuizGateProps) {
  const queryClient = useQueryClient();
  const [selections, setSelections] = useState<Record<string, string[]>>({});

  const contentQuery = useQuery({
    queryKey: ['quiz', 'content', quizId],
    queryFn: async (): Promise<StudentQuizContent> => {
      const res = await quizAttemptApi.getStudentQuizContent(quizId);
      return res.data;
    },
    enabled: Boolean(quizId),
  });

  const bestQuery = useQuery({
    queryKey: ['quiz', 'best', quizId],
    queryFn: async () => {
      const res = await quizAttemptApi.getBestForQuiz(quizId);
      return res.data;
    },
    enabled: Boolean(quizId),
  });

  const passed = bestQuery.data?.passed === true;
  const content = contentQuery.data;

  // Notify the page as soon as a passing attempt exists so it can re-enable the next lesson.
  useEffect(() => {
    if (passed) {
      onGatePassed?.();
    }
  }, [passed, onGatePassed]);

  const attemptsUsed = bestQuery.data?.attemptsUsed ?? 0;
  const maxAttempts = bestQuery.data?.maxAttempts ?? content?.maxAttempts ?? null;
  const attemptsRemaining = maxAttempts == null ? Infinity : Math.max(0, maxAttempts - attemptsUsed);

  const hasSelected = useMemo(
    () => Boolean(content?.questions.every((q) => (selections[q.id]?.length ?? 0) > 0)),
    [content, selections]
  );

  const submitMutation = useMutation({
    mutationFn: async () => {
      const answers: Record<string, string[]> = {};
      for (const q of content?.questions ?? []) {
        answers[q.id] = selections[q.id] ?? [];
      }
      const started = await quizAttemptApi.start({ quizId, answers });
      const submitted = await quizAttemptApi.submit(started.data.id, { answers });
      return submitted.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz', 'best', quizId] });
      queryClient.invalidateQueries({ queryKey: ['quiz', 'content', quizId] });
      queryClient.invalidateQueries({ queryKey: ['progress', 'course', courseId] });
      if (courseId) {
        queryClient.invalidateQueries({ queryKey: ['lessons', 'course', courseId] });
      }
    },
  });

  const toggleOption = useCallback(
    (questionId: string, optionId: string) => {
      setSelections((prev) => {
        const current = prev[questionId] ?? [];
        const next = current.includes(optionId)
          ? current.filter((o) => o !== optionId)
          : [optionId];
        return { ...prev, [questionId]: next };
      });
    },
    []
  );

  if (contentQuery.isLoading && !content) {
    return (
      <Card className="p-6">
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-24 w-full" />
      </Card>
    );
  }

  if (contentQuery.isError && !content) {
    return (
      <Card className="p-6">
        <p className="text-sm text-text-muted">
          {getApiErrorMessage(contentQuery.error, 'Impossible de charger le QCM.')}
        </p>
      </Card>
    );
  }

  if (!content || content.questions.length === 0) {
    return null;
  }

  if (passed) {
    return (
      <Card className="p-6 border-success/30 bg-success/5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-success" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-semibold text-text-primary">QCM validé</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Vous avez réussi « {content.quizTitle} ». La leçon suivante est débloquée.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const lastResult = submitMutation.data;
  const lastFailed = lastResult && !lastResult.passed;

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-text-primary">{content.quizTitle}</h2>
        </div>
        <Badge variant="primary" size="sm">
          Objectif : {content.passingScore ?? 70}%
        </Badge>
      </div>

      {lastFailed && (
        <div className="mb-4 flex items-start gap-2 rounded-sm border border-error/30 bg-error/5 p-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-error" aria-hidden="true" />
          <p className="text-sm text-text-secondary">
            Score obtenu : <span className="font-semibold text-error">{lastResult.score ?? 0}%</span>.
            {attemptsRemaining > 0
              ? ` Il vous reste ${attemptsRemaining} tentative(s).`
              : ' Plus aucune tentative disponible.'}
          </p>
        </div>
      )}

      <div className="space-y-5">
        {content.questions.map((question) => (
          <LessonQuestion
            key={question.id}
            question={question}
            selected={selections[question.id] ?? []}
            onToggle={toggleOption}
          />
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
        <p className="text-xs text-text-muted">
          {maxAttempts != null
            ? `${attemptsUsed}/${maxAttempts} tentative(s) utilisée(s)`
            : `${attemptsUsed} tentative(s) utilisée(s)`}
        </p>
        <div className="flex items-center gap-3">
          {lastFailed && attemptsRemaining > 0 && (
            <Button variant="outline" onClick={() => setSelections({})}>
              <RotateCcw className="h-4 w-4" />
              Recommencer
            </Button>
          )}
          <Button
            variant="primary"
            disabled={!hasSelected || submitMutation.isPending || attemptsRemaining === 0}
            loading={submitMutation.isPending}
            onClick={() => submitMutation.mutate()}
          >
            <Send className="h-4 w-4" />
            Valider mes réponses
          </Button>
        </div>
      </div>
    </Card>
  );
}

function LessonQuestion({
  question,
  selected,
  onToggle,
}: {
  question: StudentQuestion;
  selected: string[];
  onToggle: (questionId: string, optionId: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-text-primary">{question.statement}</p>
      <div className="space-y-1.5">
        {question.options.map((option) => {
          const isSelected = selected.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onToggle(question.id, option.id)}
              className={[
                'flex w-full items-center gap-2 rounded-sm border px-3 py-2.5 text-left text-sm transition-colors',
                isSelected
                  ? 'border-primary bg-primary-tint text-text-primary'
                  : 'border-border bg-surface hover:bg-surface-secondary hover:border-border-strong',
              ].join(' ')}
            >
              <span
                className={[
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                  isSelected ? 'border-primary bg-primary' : 'border-border-strong',
                ].join(' ')}
              >
                {isSelected && (
                  <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" aria-hidden="true" />
                )}
              </span>
              <span className="text-text-secondary">{option.optionText}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
