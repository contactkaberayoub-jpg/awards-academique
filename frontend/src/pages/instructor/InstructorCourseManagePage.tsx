import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Eye,
  File,
  FileEdit,
  FileText,
  Layers,
  ListChecks,
  Pencil,
  Plus,
  Trash2,
  Users,
  Video,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';
import { z } from 'zod';
import { adminApi, type CourseResponse, type SectionResponse } from '@/api/admin';
import { instructorApi } from '@/api/instructor';
import { lessonService, type LessonResponse, type LessonStatus, type LessonType } from '@/api/lessonService';
import {
  createQuestion,
  createQuiz,
  deleteQuestion,
  deleteQuiz,
  fetchInstructorQuizzes,
  fetchQuizQuestions,
  updateQuestion,
  updateQuiz,
  type InstructorQuiz,
  type QuizQuestion,
  type QuizStatus,
} from '@/api/quizzes';
import { DeleteModal } from '@/components/admin/DeleteModal';
import { Notice } from '@/components/admin/Notice';
import { FormInput } from '@/components/admin/FormInput';
import { Loading } from '@/components/admin/Loading';
import { Modal } from '@/components/admin/Modal';
import { EmptyState } from '@/components/admin/EmptyState';
import { InstructorStudentsSection } from '@/components/instructor/InstructorStudentsSection';
import { Checkbox } from '@/components/ui/Checkbox';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { getApiErrorMessage } from '@/lib/apiError';
import { formatDate } from '@/lib/formatDate';

const finalExamSchema = z.object({
  title: z.string().trim().min(1, 'Le titre est obligatoire').max(255, 'Le titre ne doit pas dépasser 255 caractères'),
  passingScore: z.number().int('La note de réussite doit être un entier').min(0, 'Entre 0 et 100').max(100, 'Entre 0 et 100'),
  maxAttempts: z.number().int('Le nombre de tentatives doit être un entier').min(1, 'Au moins une tentative'),
});

type FinalExamFormValues = z.infer<typeof finalExamSchema>;

const emptyFinalExamForm: FinalExamFormValues = {
  title: 'Examen final',
  passingScore: 70,
  maxAttempts: 3,
};

function lessonTypeLabel(type: LessonType) {
  const labels: Record<LessonType, string> = {
    video: 'Vidéo',
    text: 'Texte',
    pdf: 'PDF',
    quiz: 'Quiz',
    assignment: 'Devoir',
  };
  return labels[type];
}

const lessonTypeVariant: Record<LessonType, 'primary' | 'info' | 'warning' | 'accent' | 'default'> = {
  video: 'primary',
  text: 'info',
  pdf: 'warning',
  quiz: 'accent',
  assignment: 'default',
};

const lessonTypeIcon: Record<LessonType, LucideIcon> = {
  video: Video,
  text: FileText,
  pdf: File,
  quiz: ClipboardCheck,
  assignment: FileEdit,
};

function lessonStatusLabel(status: LessonStatus) {
  const labels: Record<LessonStatus, string> = {
    draft: 'Brouillon',
    published: 'Publié',
    archived: 'Archivé',
  };
  return labels[status];
}

function lessonStatusVariant(status: LessonStatus): 'warning' | 'success' | 'default' {
  if (status === 'published') return 'success';
  if (status === 'draft') return 'warning';
  return 'default';
}

function quizBadgeVariant(status: QuizStatus) {
  switch (status) {
    case 'published':
      return 'success';
    case 'archived':
      return 'default';
    default:
      return 'warning';
  }
}

function quizStatusLabel(status: QuizStatus) {
  switch (status) {
    case 'published':
      return 'Publié';
    case 'archived':
      return 'Archivé';
    default:
      return 'Brouillon';
  }
}

const optionSchema = z.object({
  optionText: z.string().trim().min(1, 'Le texte est obligatoire'),
  isCorrect: z.boolean(),
});

const questionSchema = z.object({
  statement: z.string().trim().min(1, 'La question est obligatoire'),
  explanation: z.string(),
  displayOrder: z.number().int('L\'ordre doit être un entier').min(0, 'L\'ordre ne peut pas être négatif'),
  options: z.array(optionSchema)
    .min(2, 'Au moins deux réponses sont requises')
    .refine((options) => options.some((option) => option.isCorrect), {
      message: 'Au moins une réponse doit être marquée comme correcte',
    }),
});

type QuestionFormValues = z.infer<typeof questionSchema>;

interface FinalExamFormModalProps {
  quiz: InstructorQuiz | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: (values: FinalExamFormValues) => void;
}

function FinalExamFormModal({ quiz, isSaving, onClose, onSave }: FinalExamFormModalProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FinalExamFormValues>({
    resolver: zodResolver(finalExamSchema),
    defaultValues: emptyFinalExamForm,
  });

  useEffect(() => {
    reset(
      quiz
        ? {
            title: quiz.title,
            passingScore: quiz.passingScore,
            maxAttempts: quiz.maxAttempts,
          }
        : { ...emptyFinalExamForm },
    );
  }, [quiz, reset]);

  return (
    <Modal title={quiz ? 'Modifier l\'examen final' : 'Créer l\'examen final'} onClose={onClose}>
      <form className="space-y-4" noValidate onSubmit={handleSubmit(onSave)}>
        <p className="rounded-lg bg-primary-tint px-3 py-2 text-xs text-primary">
          L'examen final est débloqué une fois que l'étudiant a terminé toutes les leçons du cours.
          Il compte pour 30 % de la progression (70 % pour les leçons).
        </p>
        <FormInput
          id="final-exam-title"
          label="Titre"
          error={errors.title?.message}
          {...register('title')}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput
            id="final-exam-passing-score"
            label="Note de réussite (%)"
            type="number"
            min="0"
            max="100"
            error={errors.passingScore?.message}
            {...register('passingScore', { valueAsNumber: true })}
          />
          <FormInput
            id="final-exam-max-attempts"
            label="Tentatives maximales"
            type="number"
            min="1"
            error={errors.maxAttempts?.message}
            {...register('maxAttempts', { valueAsNumber: true })}
          />
        </div>
        <p className="rounded-lg bg-primary-tint px-3 py-2 text-xs text-primary">
          La publication de l'examen est gérée par un administrateur.
        </p>
        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-sm border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-60"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Enregistrement...' : quiz ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

interface QuestionFormModalProps {
  question: QuizQuestion | null;
  nextDisplayOrder: number;
  isSaving: boolean;
  onClose: () => void;
  onSave: (values: QuestionFormValues) => void;
}

function QuestionFormModal({ question, nextDisplayOrder, isSaving, onClose, onSave }: QuestionFormModalProps) {
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<QuestionFormValues>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      statement: '',
      explanation: '',
      displayOrder: nextDisplayOrder,
      options: [
        { optionText: '', isCorrect: true },
        { optionText: '', isCorrect: false },
      ],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'options' });

  useEffect(() => {
    if (question) {
      reset({
        statement: question.statement,
        explanation: question.explanation ?? '',
        displayOrder: question.displayOrder,
        options: question.options.map((option) => ({
          optionText: option.optionText,
          isCorrect: option.isCorrect,
        })),
      });
    } else {
      reset({
        statement: '',
        explanation: '',
        displayOrder: nextDisplayOrder,
        options: [
          { optionText: '', isCorrect: true },
          { optionText: '', isCorrect: false },
        ],
      });
    }
  }, [question, nextDisplayOrder, reset]);

  return (
    <Modal
      title={question ? 'Modifier la question' : 'Ajouter une question'}
      onClose={onClose}
      size="lg"
    >
      <form className="space-y-4" noValidate onSubmit={handleSubmit(onSave)}>
        <div>
          <label htmlFor="final-question-statement" className="mb-1.5 block text-sm font-medium text-text-primary">
            Énoncé
          </label>
          <textarea
            id="final-question-statement"
            rows={3}
            className={`w-full rounded-sm border px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-focus-ring-subtle ${errors.statement ? 'border-error focus:border-error' : 'border-border focus:border-primary'}`}
            {...register('statement')}
          />
          {errors.statement && <p className="mt-1 text-xs text-error">{errors.statement.message}</p>}
        </div>
        <div>
          <label htmlFor="final-question-explanation" className="mb-1.5 block text-sm font-medium text-text-primary">
            Explication (facultatif)
          </label>
          <textarea
            id="final-question-explanation"
            rows={2}
            className="w-full rounded-sm border border-border px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-focus-ring-subtle focus:border-primary"
            {...register('explanation')}
          />
        </div>
        <FormInput
          id="final-question-order"
          label="Ordre"
          type="number"
          min="0"
          error={errors.displayOrder?.message}
          {...register('displayOrder', { valueAsNumber: true })}
        />

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-text-primary">Réponses</label>
            <button
              type="button"
              onClick={() => append({ optionText: '', isCorrect: false })}
              className="text-xs font-medium text-primary hover:text-primary-hover"
            >
              + Ajouter une réponse
            </button>
          </div>
          <div className="space-y-2">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface-secondary/40 p-3">
                <Checkbox
                  label="Correcte"
                  {...register(`options.${index}.isCorrect`)}
                />
                <input
                  placeholder="Texte de la réponse"
                  className="h-9 w-full rounded-sm border border-border bg-surface px-3 text-sm text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-focus-ring-subtle"
                  {...register(`options.${index}.optionText`)}
                />
                <button
                  type="button"
                  onClick={() => remove(index)}
                  disabled={fields.length <= 2}
                  className="rounded-sm p-1.5 text-error hover:bg-error-tint disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Supprimer la réponse"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          {typeof errors.options?.message === 'string' && (
            <p className="mt-1 text-xs text-error">{errors.options.message}</p>
          )}
          {typeof errors.options?.root?.message === 'string' && (
            <p className="mt-1 text-xs text-error">{errors.options.root.message}</p>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-sm border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-60"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Enregistrement...' : question ? 'Enregistrer' : 'Ajouter'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

interface FinalExamQuestionsModalProps {
  quiz: InstructorQuiz;
  onClose: () => void;
  onChanged: () => void;
}

function FinalExamQuestionsModal({ quiz, onClose, onChanged }: FinalExamQuestionsModalProps) {
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<QuizQuestion | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadQuestions = useCallback(async () => {
    setIsLoading(true);
    try {
      setQuestions(await fetchQuizQuestions(quiz.id));
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Impossible de charger les questions.'));
    } finally {
      setIsLoading(false);
    }
  }, [quiz.id]);

  useEffect(() => {
    void loadQuestions();
  }, [loadQuestions]);

  const nextDisplayOrder = useMemo(
    () => (questions?.length ? Math.max(...questions.map((q) => q.displayOrder)) + 1 : 0),
    [questions],
  );

  function openCreate() {
    setEditingQuestion(null);
    setIsFormOpen(true);
  }

  async function saveQuestion(values: QuestionFormValues) {
    setIsSaving(true);
    setErrorMessage(null);
    const payload = {
      statement: values.statement,
      explanation: values.explanation || null,
      displayOrder: values.displayOrder,
      options: values.options.map((option, index) => ({
        optionText: option.optionText,
        isCorrect: option.isCorrect,
        displayOrder: index,
      })),
    };
    try {
      if (editingQuestion) {
        await updateQuestion(editingQuestion.id, payload);
      } else {
        await createQuestion(quiz.id, payload);
      }
      setIsFormOpen(false);
      setEditingQuestion(null);
      await loadQuestions();
      onChanged();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Impossible d\'enregistrer la question.'));
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      await deleteQuestion(deleteTarget.id);
      setDeleteTarget(null);
      await loadQuestions();
      onChanged();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Impossible de supprimer la question.'));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Modal
      title={`Questions de l'examen final : ${quiz.title}`}
      description={`${questions?.length ?? 0} question${(questions?.length ?? 0) > 1 ? 's' : ''}`}
      onClose={onClose}
      size="lg"
      footer={
        <div className="flex w-full items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary"
          >
            Fermer
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" />Ajouter une question
          </button>
        </div>
      }
    >
      <Notice type="error" message={errorMessage} />
      {isLoading ? (
        <Loading label="Chargement des questions..." />
      ) : !questions || questions.length === 0 ? (
        <EmptyState
          title="Aucune question"
          description="Ajoutez la première question de l'examen final avec ses réponses possibles."
        />
      ) : (
        <div className="space-y-3">
          {questions.map((question) => (
            <div key={question.id} className="rounded-lg border border-border bg-surface-secondary/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-text-primary">
                  <span className="mr-2 text-text-muted">Q{question.displayOrder + 1}.</span>
                  {question.statement}
                </p>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => { setEditingQuestion(question); setIsFormOpen(true); }}
                    className="rounded-sm p-1.5 text-primary hover:bg-primary-tint"
                    aria-label="Modifier la question"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(question)}
                    className="rounded-sm p-1.5 text-error hover:bg-error-tint"
                    aria-label="Supprimer la question"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {question.explanation && (
                <p className="mt-1 text-xs text-text-secondary">Explication : {question.explanation}</p>
              )}
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {question.options.map((option) => (
                  <div
                    key={option.id ?? option.optionText}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                      option.isCorrect
                        ? 'border-success/40 bg-success-tint text-success'
                        : 'border-border bg-surface text-text-secondary'
                    }`}
                  >
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        option.isCorrect ? 'bg-success' : 'bg-text-muted'
                      }`}
                    />
                    {option.optionText}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {isFormOpen && (
        <QuestionFormModal
          question={editingQuestion}
          nextDisplayOrder={nextDisplayOrder}
          isSaving={isSaving}
          onClose={() => { setIsFormOpen(false); setEditingQuestion(null); }}
          onSave={(values) => void saveQuestion(values)}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          itemName={`la question « ${deleteTarget.statement} »`}
          isDeleting={isDeleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => void confirmDelete()}
        />
      )}
    </Modal>
  );
}

function formatPrice(course: CourseResponse) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: course.currency,
  }).format(course.price);
}

function courseStatusLabel(status: CourseResponse['status']) {
  const labels: Record<CourseResponse['status'], string> = {
    draft: 'Brouillon',
    pending: 'En attente',
    rejected: 'Rejeté',
    published: 'Publié',
    archived: 'Archivé',
  };
  return labels[status];
}

export default function InstructorCourseManagePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const [course, setCourse] = useState<CourseResponse | null>(null);
  const [sections, setSections] = useState<SectionResponse[]>([]);
  const [lessons, setLessons] = useState<LessonResponse[]>([]);
  const [finalQuiz, setFinalQuiz] = useState<InstructorQuiz | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<InstructorQuiz | null>(null);
  const [questionsQuiz, setQuestionsQuiz] = useState<InstructorQuiz | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!courseId) return;
    setIsLoading(true);
    try {
      const [myCourses, sectionsResponse, lessonsResponse, quizzesData] = await Promise.all([
        instructorApi.getMyCourses(),
        adminApi.getSectionsByCourse(courseId),
        lessonService.getPage({ courseId, size: 100, sortBy: 'displayOrder' }),
        fetchInstructorQuizzes(courseId),
      ]);
      const found = myCourses.find((item) => item.id === courseId) ?? null;
      setCourse(found);
      setSections(sectionsResponse.data.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)));
      setLessons(lessonsResponse.data.content);
      setFinalQuiz(quizzesData.quizzes.find((quiz) => quiz.lessonId === null) ?? null);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Impossible de charger les données du cours.'));
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const sortedLessons = useMemo(
    () => [...lessons].sort((a, b) => a.displayOrder - b.displayOrder),
    [lessons],
  );

  const lessonsBySection = useMemo(() => {
    const map = new Map<string, LessonResponse[]>();
    for (const lesson of sortedLessons) {
      const list = map.get(lesson.sectionId) ?? [];
      list.push(lesson);
      map.set(lesson.sectionId, list);
    }
    return map;
  }, [sortedLessons]);

  const canManageFinalQuiz = Boolean(finalQuiz && finalQuiz.status !== 'published');

  async function saveFinalExam(values: FinalExamFormValues) {
    if (!courseId) return;
    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      if (finalQuiz) {
        await updateQuiz(finalQuiz.id, {
          title: values.title,
          passingScore: values.passingScore,
          maxAttempts: values.maxAttempts,
        });
        setSuccessMessage('Examen final modifié avec succès.');
      } else {
        await createQuiz({
          courseId,
          lessonId: null,
          title: values.title,
          passingScore: values.passingScore,
          maxAttempts: values.maxAttempts,
        });
        setSuccessMessage('Examen final créé avec succès.');
      }
      setIsFormOpen(false);
      await loadData();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Impossible d\'enregistrer l\'examen final.'));
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      await deleteQuiz(deleteTarget.id);
      setDeleteTarget(null);
      setSuccessMessage('Examen final supprimé avec succès.');
      await loadData();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Impossible de supprimer l\'examen final.'));
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return <Loading label="Chargement du cours..." />;
  }

  if (!course) {
    return (
      <div className="space-y-6">
        <Link
          to="/instructor/courses"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-secondary hover:bg-surface-secondary"
        >
          <ArrowLeft className="h-4 w-4" /> Retour à mes cours
        </Link>
        <Card className="rounded-2xl border-border p-8 text-center">
          <p className="text-lg font-medium text-text-primary">Cours introuvable</p>
          <p className="mt-1 text-sm text-text-muted">Ce cours n'existe pas ou vous n'y avez pas accès.</p>
        </Card>
      </div>
    );
  }

  const statusBadgeVariant = course.status === 'published' ? 'success' : course.status === 'pending' ? 'primary' : course.status === 'rejected' ? 'error' : 'default';

  return (
    <div className="space-y-6">
      <Link
        to="/instructor/courses"
        className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-secondary hover:bg-surface-secondary"
      >
        <ArrowLeft className="h-4 w-4" /> Retour à mes cours
      </Link>

      <Card className="overflow-hidden rounded-2xl border-border p-0">
        <div className="flex flex-col gap-0 md:flex-row">
          <div className="relative h-48 shrink-0 overflow-hidden bg-surface-secondary md:h-auto md:w-72 lg:w-80">
            {course.thumbnailUrl ? (
              <img
                src={course.thumbnailUrl}
                alt={course.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <BookOpen className="h-12 w-12 text-text-muted/40" />
              </div>
            )}
          </div>
          <div className="flex flex-1 flex-col gap-4 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                  {course.categoryName ?? 'Cours'}
                </p>
                <h1 className="mt-1 text-2xl font-bold leading-tight text-text-primary">{course.title}</h1>
                {course.subtitle && (
                  <p className="mt-1 line-clamp-2 text-sm text-text-secondary">{course.subtitle}</p>
                )}
              </div>
              <Badge variant={statusBadgeVariant}>{courseStatusLabel(course.status)}</Badge>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-surface-secondary px-3 py-1.5 text-xs font-medium text-text-secondary">
                <Wallet className="h-3.5 w-3.5" />
                {course.isFree ? 'Gratuit' : formatPrice(course)}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-surface-secondary px-3 py-1.5 text-xs font-medium text-text-secondary">
                <Users className="h-3.5 w-3.5" />
                {course.enrollmentsCount ?? 0} étudiant{(course.enrollmentsCount ?? 0) > 1 ? 's' : ''}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-surface-secondary px-3 py-1.5 text-xs font-medium text-text-secondary">
                <Clock className="h-3.5 w-3.5" />
                {course.durationMinutes} min
              </span>
              {course.averageRating != null && course.averageRating > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-surface-secondary px-3 py-1.5 text-xs font-medium text-text-secondary">
                  ⭐ {course.averageRating.toFixed(1)} ({course.reviewsCount})
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-surface-secondary px-3 py-1.5 text-xs font-medium text-text-secondary">
                <Layers className="h-3.5 w-3.5" />
                {sections.length} section{sections.length > 1 ? 's' : ''}, {lessons.length} leçon{lessons.length > 1 ? 's' : ''}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                to={`/instructor/sections?course=${course.id}`}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary"
              >
                <Layers className="h-4 w-4" /> Sections
              </Link>
              <Link
                to={`/instructor/lessons?course=${course.id}`}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary"
              >
                <FileText className="h-4 w-4" /> Leçons
              </Link>
              <Link
                to={`/courses/${course.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary"
              >
                <Eye className="h-4 w-4" /> Voir la page publique
              </Link>
            </div>
          </div>
        </div>
      </Card>

      <Notice type="success" message={successMessage} />
      <Notice type="error" message={errorMessage} />

      <div className="mt-2">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-bold text-text-primary">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-tint text-primary">
              <Layers className="h-4.5 w-4.5" />
            </span>
            Programme du cours
            <span className="text-sm font-normal text-text-muted">
              {sections.length} section{sections.length > 1 ? 's' : ''} · {lessons.length} leçon{lessons.length > 1 ? 's' : ''}
            </span>
          </h2>
          <Link
            to={`/instructor/sections?course=${course.id}`}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary"
          >
            <Plus className="h-4 w-4" /> Gérer les sections
          </Link>
        </div>
        {sections.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="Aucune section"
            description="Ajoutez des sections pour structurer votre cours, puis remplissez-les de leçons."
            action={
              <Link
                to={`/instructor/sections?course=${course.id}`}
                className="inline-flex items-center gap-2 rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
              >
                <Plus className="h-4 w-4" />Créer une section
              </Link>
            }
          />
        ) : (
          <div className="space-y-4">
            {sections.map((section, sectionIndex) => {
              const sectionLessons = lessonsBySection.get(section.id) ?? [];
              return (
                <div key={section.id} className="overflow-hidden rounded-2xl border border-border bg-surface">
                  <div className="flex items-center justify-between border-b border-border bg-surface-secondary/60 px-5 py-3.5">
                    <p className="text-sm font-semibold text-text-primary">
                      <span className="mr-2 text-text-muted">Section {sectionIndex + 1}.</span>
                      {section.title}
                    </p>
                    <span className="text-xs text-text-muted">{sectionLessons.length} leçon{sectionLessons.length > 1 ? 's' : ''}</span>
                  </div>
                  {sectionLessons.length === 0 ? (
                    <p className="px-5 py-4 text-sm text-text-muted">Aucune leçon dans cette section.</p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {sectionLessons.map((lesson) => {
                        const LessonIcon = lessonTypeIcon[lesson.lessonType];
                        return (
                          <li key={lesson.id} className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-surface-secondary/50">
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-tertiary">
                                <LessonIcon className="h-4 w-4 text-text-secondary" />
                              </span>
                              <span className="truncate text-sm text-text-secondary">{lesson.title}</span>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <Badge variant={lessonTypeVariant[lesson.lessonType]} size="sm">
                                {lessonTypeLabel(lesson.lessonType)}
                              </Badge>
                              <Badge variant={lessonStatusVariant(lesson.status)} size="sm">
                                {lessonStatusLabel(lesson.status)}
                              </Badge>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-8">
        <InstructorStudentsSection courseId={course.id} />
      </div>

      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-text-primary">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-tint text-primary">
              <ClipboardList className="h-4.5 w-4.5" />
            </span>
            Examen final
          </h2>
          {finalQuiz && finalQuiz.status !== 'published' && (
            <button
              type="button"
              onClick={() => setIsFormOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary"
            >
              <Pencil className="h-4 w-4" />Modifier
            </button>
          )}
        </div>
        {finalQuiz ? (
          <div className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-text-primary">{finalQuiz.title}</p>
                  <Badge variant={quizBadgeVariant(finalQuiz.status)} size="sm">
                    {quizStatusLabel(finalQuiz.status)}
                  </Badge>
                  <Badge variant="accent" size="sm">
                    Examen final
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-text-secondary">
                  {finalQuiz.questionCount} question{finalQuiz.questionCount > 1 ? 's' : ''}
                  {' · '}Réussite : {finalQuiz.passingScore}%
                  {' · '}Tentatives : {finalQuiz.maxAttempts}
                  {' · '}Créé le {formatDate(finalQuiz.createdAt)}
                </p>
                <p className="mt-2 rounded-xl bg-primary-tint px-3 py-2 text-xs text-primary">
                  Débloqué par l'étudiant une fois toutes les leçons terminées. Vaut 30 % de la progression du cours.
                </p>
              </div>
              {canManageFinalQuiz && (
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setQuestionsQuiz(finalQuiz)}
                    className="rounded-sm p-1.5 text-accent hover:bg-accent-tint"
                    aria-label="Questions de l'examen final"
                    title="Gérer les questions"
                  >
                    <ListChecks className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsFormOpen(true); }}
                    className="rounded-sm p-1.5 text-primary hover:bg-primary-tint"
                    aria-label="Modifier l'examen final"
                    title="Modifier"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(finalQuiz)}
                    className="rounded-sm p-1.5 text-error hover:bg-error-tint"
                    aria-label="Supprimer l'examen final"
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <EmptyState
            icon={FileEdit}
            title="Aucun examen final"
            description="Créez un examen final pour valider la compréhension globale du cours. Un seul examen final est autorisé par cours."
            action={
              <button
                type="button"
                onClick={() => setIsFormOpen(true)}
                className="inline-flex items-center gap-2 rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
              >
                <Plus className="h-4 w-4" />Créer l'examen final
              </button>
            }
          />
        )}
      </div>

      {isFormOpen && (
        <FinalExamFormModal
          quiz={finalQuiz}
          isSaving={isSaving}
          onClose={() => setIsFormOpen(false)}
          onSave={(values) => void saveFinalExam(values)}
        />
      )}

      {questionsQuiz && (
        <FinalExamQuestionsModal
          quiz={questionsQuiz}
          onClose={() => setQuestionsQuiz(null)}
          onChanged={() => void loadData()}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          itemName={`l'examen final « ${deleteTarget.title} »`}
          isDeleting={isDeleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => void confirmDelete()}
        />
      )}
    </div>
  );
}