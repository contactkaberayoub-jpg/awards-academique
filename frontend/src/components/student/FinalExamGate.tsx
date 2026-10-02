import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  Award,
  BookOpen,
  ClipboardList,
  RotateCcw,
  Send,
  Trophy,
  XCircle,
} from 'lucide-react';
import {
  quizAttemptApi,
  type StudentQuestion,
  type StudentQuizContent,
} from '@/api/quizAttempt';
import { progressApi, type CourseProgressResponse } from '@/api/progress';
import { getApiErrorMessage } from '@/lib/apiError';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';

const ACCENT = '#0F766E';

interface FinalExamGateProps {
  courseId: string;
  quizId: string;
  /** Return to the lesson view (used by "Revoir le cours" and secondary actions). */
  onBackToCourse?: () => void;
  /** Notify the page that the exam outcome changed so it can refresh progress. */
  onCompleted?: () => void;
}

/**
 * Course-level final exam (quiz with lesson_id IS NULL).
 *
 * Same start/submit mechanics as the lesson quiz gate, but with a dedicated outcome UX:
 * - PASS    -> immediate congratulations screen with a "Voir mon certificat" button
 *   that navigates to the existing "Mes certificats" page (/student/certificates).
 * - FAIL    -> fail panel with the actual server-side passing grade, retry (per
 *   maxAttempts) and course review actions.
 *
 * The quiz result is the only source of truth for this screen: `passed === true` from the
 * submitted attempt shows the congratulations immediately, with no further backend checks.
 */
export function FinalExamGate({ courseId, quizId, onBackToCourse, onCompleted }: FinalExamGateProps) {
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

  const content = contentQuery.data;

  // Shared cache with LearningPage: no extra fetch while fresh.
  const progressQuery = useQuery({
    queryKey: ['progress', 'course', courseId],
    queryFn: async (): Promise<CourseProgressResponse> => {
      const res = await progressApi.getCourseProgress(courseId);
      return res.data;
    },
    enabled: Boolean(courseId),
  });
  void progressQuery;

  const attemptsUsed = bestQuery.data?.attemptsUsed ?? 0;
  const maxAttempts = bestQuery.data?.maxAttempts ?? content?.maxAttempts ?? null;
  const attemptsRemaining = maxAttempts == null ? Infinity : Math.max(0, maxAttempts - attemptsUsed);
  // Server-side passing grade configured by the instructor — never hardcoded.
  const requiredScore = content?.passingScore ?? bestQuery.data?.passingScore ?? null;

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
      queryClient.invalidateQueries({ queryKey: ['progress', 'lessons', 'batch', courseId] });
      queryClient.invalidateQueries({ queryKey: ['lessons', 'course', courseId] });
      queryClient.invalidateQueries({ queryKey: ['certificates', 'mine'] });
      queryClient.invalidateQueries({ queryKey: ['enrollments', 'mine'] });
      onCompleted?.();
    },
  });

  // Immediate pass detection: the submit response lands first, the best-result refetch
  // confirms it for revisit cases (success on either is enough to show congratulations).
  const passed =
    submitMutation.data?.passed === true || bestQuery.data?.passed === true;

  // Notify the page when the exam is passed so it refreshes progress/sidebar state.
  useEffect(() => {
    if (passed) {
      onCompleted?.();
    }
  }, [passed, onCompleted]);

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
          {getApiErrorMessage(contentQuery.error, "Impossible de charger l'examen final.")}
        </p>
      </Card>
    );
  }

  if (!content || content.questions.length === 0) {
    return null;
  }

  // ---- SUCCESS PATH: passed --------------
  if (passed) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        <Card className="overflow-hidden p-8 text-center sm:p-10">
          <span
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: `${ACCENT}1F`, color: ACCENT }}
          >
            <Trophy className="h-8 w-8" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
            🎉 Félicitations !
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-secondary">
            Vous avez réussi l’examen final du cours.
            <br />
            Votre certificat est maintenant disponible.
          </p>

          <div className="mt-7 flex flex-col items-center justify-center gap-3">
            <Link
              to="/student/certificates"
              className="inline-flex h-11 items-center gap-2 rounded-sm px-6 text-sm font-semibold text-white shadow-sm transition-all duration-fast hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
              style={{ backgroundColor: ACCENT }}
            >
              <Award className="h-4 w-4" aria-hidden="true" />
              Voir mon certificat
            </Link>
          </div>
        </Card>
      </motion.div>
    );
  }

  // ---- FAIL PATH: last submission graded below the server-side passing grade -----
  const lastResult = submitMutation.data;
  const lastFailed = lastResult != null && !lastResult.passed;

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-text-primary">{content.quizTitle}</h2>
        </div>
        {requiredScore != null && (
          <Badge variant="primary" size="sm">
            Objectif : {requiredScore}%
          </Badge>
        )}
      </div>

      {lastFailed && (
        <div className="mb-4 rounded-sm border border-error/30 bg-error/5 p-4">
          <div className="flex items-start gap-2">
            <XCircle className="h-5 w-5 shrink-0 text-error" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-text-primary">Examen final non réussi</p>
              <p className="mt-1 text-sm text-text-secondary">
                Votre score : <span className="font-semibold text-error">{lastResult.score ?? 0}%</span>
                {requiredScore != null && (
                  <> · Score requis : <span className="font-semibold">{requiredScore}%</span></>
                )}
                . Vous devez réussir l'examen final pour obtenir votre certificat.
              </p>
              <p className="mt-1 text-xs text-text-muted">
                {attemptsRemaining > 0 && attemptsRemaining !== Infinity
                  ? `Il vous reste ${attemptsRemaining} tentative(s).`
                  : attemptsRemaining === 0
                    ? 'Plus aucune tentative disponible.'
                    : 'Vous pouvez réessayer dès que vous êtes prêt.'}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {attemptsRemaining > 0 && (
              <Button variant="outline" size="sm" onClick={() => setSelections({})}>
                <RotateCcw className="h-4 w-4" />
                Réessayer l'examen
              </Button>
            )}
            {onBackToCourse && (
              <Button variant="secondary" size="sm" onClick={onBackToCourse}>
                <BookOpen className="h-4 w-4" />
                Revoir le cours
              </Button>
            )}
          </div>
        </div>
      )}

      {submitMutation.isError && !lastFailed && (
        <div className="mb-4 flex items-start gap-2 rounded-sm border border-error/30 bg-error/5 p-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-error" aria-hidden="true" />
          <p className="text-sm text-text-secondary">
            {getApiErrorMessage(submitMutation.error, "La soumission a échoué. Veuillez réessayer.")}
          </p>
        </div>
      )}

      <div className="space-y-5">
        {content.questions.map((question: StudentQuestion) => (
          <FinalExamQuestion
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

function FinalExamQuestion({
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
