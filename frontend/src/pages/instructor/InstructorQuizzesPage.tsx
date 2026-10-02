import { zodResolver } from '@hookform/resolvers/zod';
import { ClipboardList, CheckCircle2, FileEdit, Plus, Pencil, Trash2, ListChecks } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { type CourseResponse } from '@/api/admin';
import { lessonService, type LessonResponse } from '@/api/lessonService';
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
  type InstructorQuizzesData,
  type QuizQuestion,
  type QuizStatus,
} from '@/api/quizzes';
import { DataTable, type DataTableColumn } from '@/components/admin/DataTable';
import { DeleteModal } from '@/components/admin/DeleteModal';
import { EmptyState } from '@/components/admin/EmptyState';
import { FormInput } from '@/components/admin/FormInput';
import { FormSelect } from '@/components/admin/FormSelect';
import { Loading } from '@/components/admin/Loading';
import { Modal } from '@/components/admin/Modal';
import { Notice } from '@/components/admin/Notice';
import { PageHeader } from '@/components/admin/PageHeader';
import { Checkbox } from '@/components/ui/Checkbox';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/instructor/StatCard';
import { instructorApi } from '@/api/instructor';
import { getApiErrorMessage } from '@/lib/apiError';
import { formatDate } from '@/lib/formatDate';

const quizSchema = z.object({
  title: z.string().trim().min(1, 'Le titre est obligatoire').max(255, 'Le titre ne doit pas dépasser 255 caractères'),
  lessonId: z.string(),
  passingScore: z.number().int('La note de réussite doit être un entier').min(0, 'Entre 0 et 100').max(100, 'Entre 0 et 100'),
  maxAttempts: z.number().int('Le nombre de tentatives doit être un entier').min(1, 'Au moins une tentative'),
});

type QuizFormValues = z.infer<typeof quizSchema>;

const emptyQuizForm: QuizFormValues = {
  title: '',
  lessonId: '',
  passingScore: 70,
  maxAttempts: 3,
};

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

interface QuizFormModalProps {
  courseId: string;
  quiz: InstructorQuiz | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: (values: QuizFormValues) => void;
}

function QuizFormModal({ courseId, quiz, isSaving, onClose, onSave }: QuizFormModalProps) {
  const [lessons, setLessons] = useState<LessonResponse[]>([]);
  const [isLessonsLoading, setIsLessonsLoading] = useState(false);
  const [lessonsLoadFailed, setLessonsLoadFailed] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<QuizFormValues>({
    resolver: zodResolver(quizSchema),
    defaultValues: emptyQuizForm,
  });

  useEffect(() => {
    reset(
      quiz
        ? {
            title: quiz.title,
            lessonId: quiz.lessonId ?? '',
            passingScore: quiz.passingScore,
            maxAttempts: quiz.maxAttempts,
          }
        : { ...emptyQuizForm, lessonId: '' },
    );
  }, [quiz, reset]);

  useEffect(() => {
    let active = true;
    if (!courseId) {
      setLessons([]);
      setIsLessonsLoading(false);
      setLessonsLoadFailed(false);
      return;
    }
    // The lesson list is capped by the backend (size must be between 1 and 100). Keep the
    // request within bounds so the dropdown can actually populate for the selected course.
    setIsLessonsLoading(true);
    setLessonsLoadFailed(false);
    void lessonService
      .getPage({ courseId, size: 100, sortBy: 'title' })
      .then((response) => {
        if (active) setLessons(response.data.content);
      })
      .catch(() => {
        if (active) {
          setLessons([]);
          setLessonsLoadFailed(true);
        }
      })
      .finally(() => {
        if (active) setIsLessonsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [courseId]);

  const lessonOptions = useMemo(
    () => lessons.map((lesson) => ({ value: lesson.id, label: lesson.title })),
    [lessons],
  );

  const lessonHelper = !courseId
    ? 'Sélectionnez d\'abord un cours.'
    : isLessonsLoading
    ? 'Chargement des leçons...'
    : lessonsLoadFailed
    ? 'Impossible de charger les leçons.'
    : lessons.length === 0
    ? 'Aucune leçon disponible pour ce cours.'
    : 'Sélectionnez une leçon pour lier le quiz (facultatif).';

  return (
    <Modal title={quiz ? 'Modifier le quiz' : 'Ajouter un quiz'} onClose={onClose}>
      <form className="space-y-4" noValidate onSubmit={handleSubmit(onSave)}>
        <FormInput
          id="quiz-title"
          label="Titre"
          error={errors.title?.message}
          {...register('title')}
        />
        <FormSelect
          id="quiz-lesson"
          label="Leçon (facultative)"
          placeholder={isLessonsLoading ? 'Chargement des leçons...' : 'Aucune leçon'}
          options={lessonOptions}
          error={errors.lessonId?.message}
          disabled={isLessonsLoading}
          {...register('lessonId')}
        />
        <p className="mt-1 text-xs text-text-muted">{lessonHelper}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput
            id="quiz-passing-score"
            label="Note de réussite (%)"
            type="number"
            min="0"
            max="100"
            error={errors.passingScore?.message}
            {...register('passingScore', { valueAsNumber: true })}
          />
          <FormInput
            id="quiz-max-attempts"
            label="Tentatives maximales"
            type="number"
            min="1"
            error={errors.maxAttempts?.message}
            {...register('maxAttempts', { valueAsNumber: true })}
          />
        </div>
        <p className="rounded-lg bg-primary-tint px-3 py-2 text-xs text-primary">
          La publication des quiz est gérée par un administrateur.
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
          <label htmlFor="question-statement" className="mb-1.5 block text-sm font-medium text-text-primary">
            Énoncé
          </label>
          <textarea
            id="question-statement"
            rows={3}
            className={`w-full rounded-sm border px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-focus-ring-subtle ${errors.statement ? 'border-error focus:border-error' : 'border-border focus:border-primary'}`}
            {...register('statement')}
          />
          {errors.statement && <p className="mt-1 text-xs text-error">{errors.statement.message}</p>}
        </div>
        <div>
          <label htmlFor="question-explanation" className="mb-1.5 block text-sm font-medium text-text-primary">
            Explication (facultatif)
          </label>
          <textarea
            id="question-explanation"
            rows={2}
            className="w-full rounded-sm border border-border px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-focus-ring-subtle focus:border-primary"
            {...register('explanation')}
          />
        </div>
        <FormInput
          id="question-order"
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

interface QuestionsModalProps {
  quiz: InstructorQuiz;
  onClose: () => void;
  onChanged: () => void;
}

function QuestionsModal({ quiz, onClose, onChanged }: QuestionsModalProps) {
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
      title={`Questions du quiz : ${quiz.title}`}
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
          description="Ajoutez la première question avec ses réponses possibles."
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

export default function InstructorQuizzesPage() {
  const [data, setData] = useState<InstructorQuizzesData | null>(null);
  const [courses, setCourses] = useState<CourseResponse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCoursesLoading, setIsCoursesLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<InstructorQuiz | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<InstructorQuiz | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [questionsQuiz, setQuestionsQuiz] = useState<InstructorQuiz | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      setData(await fetchInstructorQuizzes());
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de charger vos quiz.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadCourses = useCallback(async () => {
    setIsCoursesLoading(true);
    try {
      const courseOptions = await instructorApi.getMyCourses();
      setCourses(courseOptions);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Impossible de charger vos cours.'));
    } finally {
      setIsCoursesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
    void loadCourses();
  }, [loadData, loadCourses]);

  const courseOptions = useMemo(
    () => courses.map((course) => ({ value: course.id, label: course.title })),
    [courses],
  );

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) ?? null,
    [courses, selectedCourseId],
  );

  const isModifiableCourse = selectedCourse
    ? selectedCourse.status === 'pending' || selectedCourse.status === 'rejected'
    : false;

  const quizzes = useMemo(() => {
    const all = data?.quizzes ?? [];
    if (!selectedCourseId) return all;
    return all.filter((quiz) => quiz.courseId === selectedCourseId);
  }, [data, selectedCourseId]);

  const hasQuizzes = quizzes.length > 0;

  const canManageQuiz = useCallback(
    (quiz: InstructorQuiz) => isModifiableCourse && quiz.status !== 'published',
    [isModifiableCourse],
  );

  function openCreateForm() {
    setEditingQuiz(null);
    setIsFormOpen(true);
  }

  function openEditForm(quiz: InstructorQuiz) {
    setEditingQuiz(quiz);
    setIsFormOpen(true);
  }

  async function saveQuiz(values: QuizFormValues) {
    if (!selectedCourseId) return;
    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      if (editingQuiz) {
        await updateQuiz(editingQuiz.id, {
          title: values.title,
          lessonId: values.lessonId || null,
          passingScore: values.passingScore,
          maxAttempts: values.maxAttempts,
        });
        setSuccessMessage('Quiz modifié avec succès.');
      } else {
        await createQuiz({
          courseId: selectedCourseId,
          lessonId: values.lessonId || undefined,
          title: values.title,
          passingScore: values.passingScore,
          maxAttempts: values.maxAttempts,
        });
        setSuccessMessage('Quiz créé avec succès.');
      }
      setIsFormOpen(false);
      setEditingQuiz(null);
      await loadData();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Impossible d\'enregistrer le quiz.'));
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
      setSuccessMessage('Quiz supprimé avec succès.');
      await loadData();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Impossible de supprimer le quiz.'));
    } finally {
      setIsDeleting(false);
    }
  }

  const columns: DataTableColumn<InstructorQuiz>[] = [
    {
      key: 'title',
      header: 'Quiz',
      render: (quiz) => <span className="font-medium text-text-primary">{quiz.title}</span>,
    },
    {
      key: 'lesson',
      header: 'Leçon',
      render: (quiz) => <span className="text-text-secondary">{quiz.lessonTitle || '—'}</span>,
    },
    {
      key: 'status',
      header: 'Statut',
      render: (quiz) => (
        <Badge variant={quizBadgeVariant(quiz.status)} size="sm">
          {quizStatusLabel(quiz.status)}
        </Badge>
      ),
    },
    {
      key: 'questionCount',
      header: 'Questions',
      render: (quiz) => <span className="text-text-secondary">{quiz.questionCount}</span>,
    },
    {
      key: 'passingScore',
      header: 'Réussite',
      render: (quiz) => <span className="text-text-secondary">{quiz.passingScore}%</span>,
    },
    {
      key: 'createdAt',
      header: 'Créé le',
      render: (quiz) => <span className="text-text-secondary">{formatDate(quiz.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-36',
      render: (quiz) => (
        <div className="flex items-center gap-1">
          {canManageQuiz(quiz) && (
            <>
              <button
                type="button"
                onClick={() => setQuestionsQuiz(quiz)}
                className="rounded-sm p-1.5 text-accent hover:bg-accent-tint"
                aria-label={`Questions de ${quiz.title}`}
              >
                <ListChecks className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => openEditForm(quiz)}
                className="rounded-sm p-1.5 text-primary hover:bg-primary-tint"
                aria-label={`Modifier ${quiz.title}`}
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(quiz)}
                className="rounded-sm p-1.5 text-error hover:bg-error-tint"
                aria-label={`Supprimer ${quiz.title}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  if (isLoading || isCoursesLoading) {
    return <Loading label="Chargement de vos quiz..." />;
  }

  if (errorMessage && !data) {
    return (
      <div>
        <PageHeader title="Quiz" description="Évaluez vos étudiants et suivez leur compréhension." />
        <Notice type="error" message={errorMessage} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Quiz"
        description="Gérez les quiz attachés à vos leçons."
        action={
          <button
            type="button"
            onClick={openCreateForm}
            disabled={!selectedCourseId || !isModifiableCourse}
            className="inline-flex items-center justify-center gap-2 rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />Ajouter un quiz
          </button>
        }
      />
      <Notice type="success" message={successMessage} />
      <Notice type="error" message={errorMessage} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Quiz au total" value={data?.totalQuizzes ?? 0} icon={ClipboardList} color="blue" hint="Sur tous les cours" />
        <StatCard label="Publiés" value={data?.publishedQuizzes ?? 0} icon={CheckCircle2} color="green" hint="Visibles par les étudiants" />
        <StatCard label="Brouillons" value={data?.draftQuizzes ?? 0} icon={FileEdit} color="amber" hint="En cours de rédaction" />
      </div>

      <div className="mb-4 mt-6">
        <FormSelect
          id="quiz-course-filter"
          label="Cours"
          placeholder="Tous les cours"
          options={courseOptions}
          value={selectedCourseId}
          onChange={(event) => setSelectedCourseId(event.target.value)}
        />
        <p className="mt-2 text-xs text-text-muted">
          Vous ne pouvez modifier les quiz que des cours en cours de préparation ou rejetés. La publication est gérée par un administrateur.
        </p>
      </div>

      {!hasQuizzes ? (
        <EmptyState
          title="Aucun quiz pour le moment"
          description={selectedCourseId ? 'Aucun quiz pour ce cours. Créez-en un pour évaluer vos étudiants.' : 'Sélectionnez un cours, puis créez un quiz.'}
        />
      ) : (
        <DataTable columns={columns} data={quizzes} getRowKey={(quiz) => quiz.id} />
      )}

      {isFormOpen && (
        <QuizFormModal
          courseId={selectedCourseId}
          quiz={editingQuiz}
          isSaving={isSaving}
          onClose={() => { setIsFormOpen(false); setEditingQuiz(null); }}
          onSave={(values) => void saveQuiz(values)}
        />
      )}

      {questionsQuiz && (
        <QuestionsModal
          quiz={questionsQuiz}
          onClose={() => setQuestionsQuiz(null)}
          onChanged={() => void loadData()}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          itemName={`le quiz « ${deleteTarget.title} »`}
          isDeleting={isDeleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => void confirmDelete()}
        />
      )}
    </div>
  );
}
